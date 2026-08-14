"""
Convert a Keras (.keras or SavedModel) model to TensorFlow Lite (.tflite).
Supports optional post-training quantization (float16 or full integer).

Usage examples:
  python convert_to_tflite.py --keras-path tomato_disease_model.keras --output-path tomato_disease_model.tflite

  # Float16 quantization (smaller, still fast on CPU)
  python convert_to_tflite.py --keras-path tomato_disease_model.keras --output-path tomato_disease_model.tflite --quantize float16

  # Full integer quantization (requires representative dataset directory)
  python convert_to_tflite.py --keras-path tomato_disease_model.keras --output-path tomato_disease_model.tflite --quantize int8 --rep-dir ./representative_images

Note: Run this script on a machine that has TensorFlow installed. The resulting .tflite is much smaller and is suitable for low-memory deployments.
"""

import argparse
import os
import numpy as np
from PIL import Image


def representative_gen(rep_dir, img_size, batch_size=1):
    """Yield representative samples for quantization.
    Assumes images in rep_dir; yields batches shaped (1, H, W, C) with float32 values in [0,1].
    """
    files = [os.path.join(rep_dir, f) for f in os.listdir(rep_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    if not files:
        raise ValueError("No representative images found in rep_dir")
    for f in files:
        img = Image.open(f).convert('RGB')
        img = img.resize(img_size)
        arr = np.array(img).astype(np.float32) / 255.0
        arr = np.expand_dims(arr, axis=0)
        yield [arr]


def convert(keras_path, output_path, quantize, rep_dir=None, img_size=(224,224)):
    import tensorflow as tf

    # Load Keras model
    print(f"Loading Keras model from {keras_path}...")
    model = tf.keras.models.load_model(keras_path)

    converter = tf.lite.TFLiteConverter.from_keras_model(model)

    if quantize is None or quantize == 'none':
        print("Converting to TFLite (no quantization)...")
        tflite_model = converter.convert()

    elif quantize == 'float16':
        print("Converting to TFLite with float16 quantization...")
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_types = [tf.float16]
        tflite_model = converter.convert()

    elif quantize == 'int8':
        if rep_dir is None:
            raise ValueError('Representative dataset directory (--rep-dir) is required for int8 quantization')
        print("Converting to TFLite with full integer (int8) quantization...")
        converter.optimizations = [tf.lite.Optimize.DEFAULT]

        def gen():
            for sample in representative_gen(rep_dir, img_size):
                yield sample

        converter.representative_dataset = gen
        # Enforce integer only
        converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
        converter.inference_input_type = tf.uint8 if False else tf.int8
        converter.inference_output_type = tf.int8
        tflite_model = converter.convert()

    else:
        raise ValueError('Unsupported quantization option')

    with open(output_path, 'wb') as f:
        f.write(tflite_model)

    print(f"Wrote TFLite model to {output_path} ({os.path.getsize(output_path)} bytes)")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Convert Keras model to TFLite')
    parser.add_argument('--keras-path', required=True, help='Path to Keras model (directory or .keras file)')
    parser.add_argument('--output-path', required=True, help='Output .tflite path')
    parser.add_argument('--quantize', choices=['none', 'float16', 'int8'], default='none')
    parser.add_argument('--rep-dir', help='Representative images directory (required for int8)')
    parser.add_argument('--img-size', type=int, nargs=2, default=(224,224), help='Image size expected by model (H W)')

    args = parser.parse_args()
    convert(args.keras_path, args.output_path, args.quantize if args.quantize!='none' else None, rep_dir=args.rep_dir, img_size=tuple(args.img_size))
