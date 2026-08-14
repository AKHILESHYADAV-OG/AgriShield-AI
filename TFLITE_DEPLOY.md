Instructions to convert model to TFLite and deploy with low-memory web dynos

1) Convert model locally to .tflite
   - On a machine with TensorFlow installed, run:
     python convert_to_tflite.py --keras-path tomato_disease_model.keras --output-path tomato_disease_model.tflite --quantize float16
   - For maximum size reduction and compatibility, try int8 quantization with a small representative dataset:
     python convert_to_tflite.py --keras-path tomato_disease_model.keras --output-path tomato_disease_model.tflite --quantize int8 --rep-dir ./representative_images

2) Add the resulting tomato_disease_model.tflite to backend/ (commit it to repo or include during deployment)

3) Use the lightweight requirements file for web deploys
   - Use backend/requirements-tflite.txt instead of requirements.txt during build to avoid installing full TensorFlow.
   - On Render, set the build command to: pip install -r backend/requirements-tflite.txt

4) Verify locally before deploying
   - Create a virtualenv and install tflite-runtime locally:
     pip install -r backend/requirements-tflite.txt
   - Start the server:
     uvicorn main:app --host 0.0.0.0 --port 8000
   - Test GET / and POST /analyze-image

5) If tflite-runtime installation fails on your target environment, fall back to deploying a worker with full TensorFlow and keep the web dyno using requirements-tflite.txt.

Notes:
- Converting and quantizing may change model accuracy slightly — validate outputs after conversion.
- tflite-runtime wheels vary by platform; if install issues occur, consider using a small container image that includes the runtime, or host inference on a dedicated worker with full TensorFlow.
