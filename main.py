from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

# TensorFlow is imported lazily at startup to avoid heavy memory usage on small web dynos
import numpy as np
from PIL import Image
import io
from pathlib import Path
import requests

from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime


app = FastAPI(title="AgriShield AI")


# =========================================================
# DATABASE
# =========================================================

DATABASE_URL = "sqlite:///./agrishield.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


class CropAnalysis(Base):
    __tablename__ = "crop_analysis"

    id = Column(Integer, primary_key=True, index=True)
    crop = Column(String)
    location = Column(String)
    crop_health = Column(Integer)
    disease_risk = Column(Integer)
    pest_risk = Column(Integer)
    weather_risk = Column(Integer)
    overall_risk = Column(Integer)
    alert = Column(String)
    ai_explanation = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)





# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# AI MODEL
# =========================================================

MODEL_PATH = Path(__file__).parent / "tomato_disease_model.keras"

model = None

CLASS_NAMES = [
    "Bacterial Spot",
    "Early Blight",
    "Healthy",
    "Late Blight",
    "Leaf Mold",
    "Septoria Leaf Spot",
    "Spider Mites / Two-Spotted Spider Mite",
    "Target Spot",
    "Tomato Mosaic Virus",
    "Tomato Yellow Leaf Curl Virus"
]

IMG_SIZE = (224, 224)


# =========================================================
# MODEL LOADING AT STARTUP
# =========================================================

@app.on_event("startup")
async def load_model_on_startup():
    """Try to load a TFLite model first (very low memory). If not present, attempt to load a Keras model
    via TensorFlow. Fail gracefully so the web process can start on low-memory instances.
    """
    global model, tf, interpreter, model_type, tflite_input_details, tflite_output_details

    model = None
    interpreter = None
    model_type = None
    tflite_input_details = None
    tflite_output_details = None

    # Prefer a TFLite model if available (tomato_disease_model.tflite)
    tflite_path = MODEL_PATH.with_suffix('.tflite')

    try:
        if tflite_path.exists():
            try:
                # Prefer the lightweight tflite_runtime if installed
                try:
                    from tflite_runtime.interpreter import Interpreter
                except Exception:
                    # Fallback to TensorFlow's Interpreter if tensorflow is available
                    import importlib
                    tf = importlib.import_module('tensorflow')
                    from tensorflow.lite import Interpreter

                interpreter = Interpreter(model_path=str(tflite_path))
                interpreter.allocate_tensors()
                tflite_input_details = interpreter.get_input_details()
                tflite_output_details = interpreter.get_output_details()
                model_type = 'tflite'
                print(f"✅ TFLite model loaded from {tflite_path}")
                return
            except Exception as e:
                print(f"⚠️ Failed to load TFLite model: {e}")

        # If TFLite not available or failed, attempt to load Keras model via TensorFlow
        try:
            import importlib
            tf = importlib.import_module('tensorflow')
            model = tf.keras.models.load_model(MODEL_PATH)
            model_type = 'keras'
            print(f"✅ Keras model loaded successfully from {MODEL_PATH}")
        except Exception as e:
            model = None
            model_type = None
            print(f"❌ No model loaded (inference disabled): {e}")

    except Exception as e:
        # Catch-all to avoid startup crash
        model = None
        interpreter = None
        model_type = None
        print(f"❌ Unexpected error during model initialization: {e}")


# =========================================================
# PREDICTION HELPERS (supports TFLite and Keras)
# =========================================================

def predict_image(image_array):
    """Return predictions array matching Keras model.predict output shape.
    Supports TFLite Interpreter (preferred) and Keras models.
    """
    global model, interpreter, model_type, tflite_input_details, tflite_output_details

    if model_type == 'tflite' and interpreter is not None:
        # TFLite expects float32 by default for most converted models
        input_data = image_array.astype(np.float32)
        idx = tflite_input_details[0]['index']
        try:
            interpreter.set_tensor(idx, input_data)
        except Exception:
            # Try resizing input tensor to match data shape
            interpreter.resize_tensor_input(idx, input_data.shape)
            interpreter.allocate_tensors()
            interpreter.set_tensor(idx, input_data)
        interpreter.invoke()
        output_idx = tflite_output_details[0]['index']
        predictions = interpreter.get_tensor(output_idx)
        return predictions

    elif model_type == 'keras' and model is not None:
        return model.predict(image_array, verbose=0)

    else:
        return None


# =========================================================
# DISEASE RISK
# =========================================================

DISEASE_RISK = {
    "Healthy": 10,
    "Bacterial Spot": 75,
    "Early Blight": 80,
    "Late Blight": 90,
    "Leaf Mold": 70,
    "Septoria Leaf Spot": 75,
    "Spider Mites / Two-Spotted Spider Mite": 65,
    "Target Spot": 75,
    "Tomato Mosaic Virus": 85,
    "Tomato Yellow Leaf Curl Virus": 90
}


# =========================================================
# HOME API
# =========================================================

@app.get("/")
def home():

    return {
        "message": "AgriShield AI Backend is running!"
    }


# =========================================================
# WEATHER API
# =========================================================

@app.get("/weather")
def weather(location: str = "Maharajganj"):

    try:

        # -----------------------------------------
        # 1. Location -> Latitude / Longitude
        # -----------------------------------------

        geo_url = "https://geocoding-api.open-meteo.com/v1/search"

        geo_params = {
            "name": location,
            "count": 1,
            "language": "en",
            "format": "json",
            "countryCode": "IN"
        }

        geo_response = requests.get(
            geo_url,
            params=geo_params,
            timeout=10
        )

        geo_response.raise_for_status()

        geo_data = geo_response.json()

        if not geo_data.get("results"):

            return {
                "location": location,
                "error": "Location not found"
            }

        place = geo_data["results"][0]

        latitude = place["latitude"]
        longitude = place["longitude"]


        # -----------------------------------------
        # 2. Real Weather Data
        # -----------------------------------------

        weather_url = "https://api.open-meteo.com/v1/forecast"

        weather_params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": (
                "temperature_2m,"
                "relative_humidity_2m,"
                "precipitation,"
                "rain,"
                "weather_code"
            ),
            "hourly": "precipitation_probability",
            "timezone": "auto",
            "forecast_days": 1
        }

        weather_response = requests.get(
            weather_url,
            params=weather_params,
            timeout=10
        )

        weather_response.raise_for_status()

        weather_data = weather_response.json()

        current = weather_data["current"]


        # -----------------------------------------
        # 3. Rain Probability
        # -----------------------------------------

        rain_probability = max(
            weather_data["hourly"]["precipitation_probability"]
        )

        temperature = round(
            current["temperature_2m"],
            1
        )

        humidity = round(
            current["relative_humidity_2m"]
        )


        # -----------------------------------------
        # 4. Weather Risk Calculation
        # -----------------------------------------

        weather_risk = 0

        # High humidity
        if humidity >= 85:

            weather_risk += 35

        elif humidity >= 75:

            weather_risk += 25

        elif humidity >= 65:

            weather_risk += 15


        # Rain probability
        if rain_probability >= 80:

            weather_risk += 40

        elif rain_probability >= 60:

            weather_risk += 30

        elif rain_probability >= 40:

            weather_risk += 20

        elif rain_probability >= 20:

            weather_risk += 10


        # Temperature
        if temperature >= 35:

            weather_risk += 25

        elif temperature >= 32:

            weather_risk += 15

        elif temperature <= 10:

            weather_risk += 15


        weather_risk = min(
            weather_risk,
            100
        )


        # -----------------------------------------
        # 5. Weather Alert
        # -----------------------------------------

        if weather_risk >= 70:

            alert = "High Weather Risk"

            message = (
                "Current weather conditions "
                "may negatively affect crop health."
            )

        elif weather_risk >= 50:

            alert = "Medium Weather Risk"

            message = (
                "Monitor your crop closely "
                "because weather conditions may "
                "increase crop stress."
            )

        else:

            alert = "Low Weather Risk"

            message = (
                "Current weather conditions "
                "are relatively favorable."
            )


        # -----------------------------------------
        # 6. Final Response
        # -----------------------------------------

        return {

            "location": place["name"],

            "latitude": latitude,

            "longitude": longitude,

            "temperature": temperature,

            "humidity": humidity,

            "rain_probability": rain_probability,

            "weather_risk": weather_risk,

            "alert": alert,

            "message": message
        }


    except Exception as e:

        return {

            "location": location,

            "error": "Weather API failed",

            "message": str(e)
        }


# =========================================================
# CROP RISK ANALYSIS
# =========================================================

@app.get("/risk")
def risk_analysis(
    crop: str = "Wheat",
    location: str = "Unknown"
):

    # -----------------------------------------
    # Crop Risk Data
    # -----------------------------------------

    crop_risk = {

        "Wheat": {
            "disease": 65,
            "pest": 35,
            "weather": 55
        },

        "Rice": {
            "disease": 75,
            "pest": 50,
            "weather": 70
        },

        "Potato": {
            "disease": 60,
            "pest": 45,
            "weather": 50
        },

        "Tomato": {
            "disease": 80,
            "pest": 65,
            "weather": 60
        },

        "Maize": {
            "disease": 55,
            "pest": 40,
            "weather": 65
        }
    }


    # -----------------------------------------
    # Get Crop Data
    # -----------------------------------------

    data = crop_risk.get(
        crop,
        {
            "disease": 50,
            "pest": 40,
            "weather": 50
        }
    )


    disease_risk = data["disease"]

    pest_risk = data["pest"]

    weather_risk = data["weather"]


    # -----------------------------------------
    # Overall Risk
    # -----------------------------------------

    overall_risk = round(
        (
            disease_risk
            + pest_risk
            + weather_risk
        ) / 3
    )


    # -----------------------------------------
    # Crop Health
    # -----------------------------------------

    crop_health = 100 - overall_risk


    # -----------------------------------------
    # Overall Alert
    # -----------------------------------------

    if overall_risk >= 70:

        alert = "High Risk"

        message = (
            "Immediate preventive action is recommended."
        )

    elif overall_risk >= 50:

        alert = "Medium Risk"

        message = (
            "Monitor your crop regularly."
        )

    else:

        alert = "Low Risk"

        message = (
            "Crop condition looks relatively safe."
        )


    # =========================================================
    # MAJOR RISK CONTRIBUTOR
    # =========================================================

    risk_values = {
        "Disease": disease_risk,
        "Pest": pest_risk,
        "Weather": weather_risk
    }

    major_risk = max(
        risk_values,
        key=risk_values.get
    )

    major_risk_value = risk_values[major_risk]


    # =========================================================
    # RISK LEVEL FUNCTION
    # =========================================================

    def get_risk_level(value):

        if value >= 70:
            return "high"

        elif value >= 40:
            return "moderate"

        else:
            return "low"


    disease_level = get_risk_level(disease_risk)

    pest_level = get_risk_level(pest_risk)

    weather_level = get_risk_level(weather_risk)

    overall_level = get_risk_level(overall_risk)


    # =========================================================
    # AI RISK EXPLANATION
    # =========================================================

    risk_factors = []


    # -----------------------------------------
    # Disease Explanation
    # -----------------------------------------

    if disease_level == "high":

        risk_factors.append(
            f"Disease risk is high at {disease_risk}%. "
            "Disease symptoms should be monitored closely."
        )

    elif disease_level == "moderate":

        risk_factors.append(
            f"Disease risk is moderate at {disease_risk}%. "
            "Regular inspection of leaves is recommended."
        )

    else:

        risk_factors.append(
            f"Disease risk is low at {disease_risk}%."
        )


    # -----------------------------------------
    # Pest Explanation
    # -----------------------------------------

    if pest_level == "high":

        risk_factors.append(
            f"Pest risk is high at {pest_risk}%. "
            "The crop should be checked for pest infestation."
        )

    elif pest_level == "moderate":

        risk_factors.append(
            f"Pest risk is moderate at {pest_risk}%. "
            "Regular pest monitoring is recommended."
        )

    else:

        risk_factors.append(
            f"Pest risk is low at {pest_risk}%."
        )


    # -----------------------------------------
    # Weather Explanation
    # -----------------------------------------

    if weather_level == "high":

        risk_factors.append(
            f"Weather risk is high at {weather_risk}%. "
            "Current weather conditions may increase crop stress."
        )

    elif weather_level == "moderate":

        risk_factors.append(
            f"Weather risk is moderate at {weather_risk}%. "
            "Weather conditions should be monitored."
        )

    else:

        risk_factors.append(
            f"Weather risk is low at {weather_risk}%."
        )


    # -----------------------------------------
    # Overall Explanation
    # -----------------------------------------

    if overall_level == "high":

        risk_explanation = (
            f"AI analysis indicates a high overall risk of "
            f"{overall_risk}%. "
            + " ".join(risk_factors)
            + f" The major contributor to the crop risk is "
            f"{major_risk.lower()} risk at {major_risk_value}%. "
            "Immediate preventive action is recommended."
        )

    elif overall_level == "moderate":

        risk_explanation = (
            f"AI analysis indicates a moderate overall risk of "
            f"{overall_risk}%. "
            + " ".join(risk_factors)
            + f" The major contributor to the crop risk is "
            f"{major_risk.lower()} risk at {major_risk_value}%. "
            "Regular monitoring and preventive measures are recommended."
        )

    else:

        risk_explanation = (
            f"AI analysis indicates a low overall risk of "
            f"{overall_risk}%. "
            + " ".join(risk_factors)
            + f" The major contributor to the crop risk is "
            f"{major_risk.lower()} risk at {major_risk_value}%. "
            "The crop appears relatively safe, but regular monitoring is recommended."
        )


    # =========================================================
    # DYNAMIC PREVENTIVE ACTIONS
    # =========================================================

    actions = []


    # -----------------------------------------
    # Disease Actions
    # -----------------------------------------

    if disease_risk >= 70:

        actions.append(
            f"Inspect {crop.lower()} leaves and plants regularly "
            "for visible disease symptoms."
        )

        actions.append(
            "Remove severely infected plant parts where appropriate "
            "to reduce disease spread."
        )

    elif disease_risk >= 40:

        actions.append(
            "Monitor the crop regularly for early disease symptoms."
        )

    else:

        actions.append(
            "Continue routine disease monitoring."
        )


    # -----------------------------------------
    # Pest Actions
    # -----------------------------------------

    if pest_risk >= 70:

        actions.append(
            "Inspect leaves and stems frequently for pest infestation."
        )

        actions.append(
            "Use suitable pest-management measures if infestation is confirmed."
        )

    elif pest_risk >= 40:

        actions.append(
            "Check the crop regularly for signs of pest activity."
        )

    else:

        actions.append(
            "Continue routine pest monitoring."
        )


    # -----------------------------------------
    # Weather Actions
    # -----------------------------------------

    if weather_risk >= 70:

        actions.append(
            "Take precautions against current high-risk weather conditions."
        )

        actions.append(
            "Avoid unnecessary irrigation during periods of excessive moisture or rain."
        )

    elif weather_risk >= 40:

        actions.append(
            "Monitor weather conditions and adjust irrigation accordingly."
        )

    else:

        actions.append(
            "Maintain normal irrigation and monitor weather changes."
        )


    # -----------------------------------------
    # Crop-Specific Actions
    # -----------------------------------------

    crop_specific_actions = {

        "Wheat":
            "Regularly inspect wheat plants for leaf and stem problems.",

        "Rice":
            "Maintain appropriate water levels and monitor rice plants for disease.",

        "Potato":
            "Inspect potato leaves for disease symptoms and avoid excessive moisture.",

        "Tomato":
            "Inspect tomato leaves regularly and avoid unnecessary overhead watering.",

        "Maize":
            "Inspect maize leaves and stems for disease or pest damage."
    }


    if crop in crop_specific_actions:

        actions.append(
            crop_specific_actions[crop]
        )


    # Keep maximum number of actions manageable
    actions = actions[:6]

    # =========================================================
    # SAVE RISK ANALYSIS TO DATABASE
    # =========================================================

    db = SessionLocal()

    try:
        analysis = CropAnalysis(
            crop=crop,
            location=location,
            crop_health=crop_health,
            disease_risk=disease_risk,
            pest_risk=pest_risk,
            weather_risk=weather_risk,
            overall_risk=overall_risk,
            alert=alert,
            ai_explanation=risk_explanation
        )

        db.add(analysis)
        db.commit()

    finally:
        db.close()


    # =========================================================
    # FINAL RISK RESPONSE
    # =========================================================

    return {

        "crop": crop,

        "location": location,

        "crop_health": crop_health,

        "disease_risk": disease_risk,

        "pest_risk": pest_risk,

        "weather_risk": weather_risk,

        "overall_risk": overall_risk,

        "alert": alert,

        "message": message,

        "preventive_actions": actions,

        "risk_explanation": risk_explanation
    }

    # =========================================================
# ANALYSIS HISTORY API
# =========================================================

@app.get("/history")
def get_history():

    db = SessionLocal()

    try:
        records = (
            db.query(CropAnalysis)
            .order_by(CropAnalysis.id.desc())
            .all()
        )

        return [
            {
                "id": record.id,
                "crop": record.crop,
                "location": record.location,
                "crop_health": record.crop_health,
                "disease_risk": record.disease_risk,
                "pest_risk": record.pest_risk,
                "weather_risk": record.weather_risk,
                "overall_risk": record.overall_risk,
                "alert": record.alert,
                "ai_explanation": record.ai_explanation,
                "created_at": record.created_at
            }
            for record in records
        ]

    finally:
        db.close()


# =========================================================
# AI IMAGE DISEASE DETECTION
# =========================================================

@app.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...)
):


    try:

        # -----------------------------------------
        # Read Image
        # -----------------------------------------

        image_bytes = await file.read()


        # -----------------------------------------
        # Open Image
        # -----------------------------------------

        image = Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGB")


        # -----------------------------------------
        # Resize Image
        # -----------------------------------------

        image = image.resize(
            IMG_SIZE
        )


        # -----------------------------------------
        # Convert to NumPy
        # -----------------------------------------

        image_array = np.array(
            image
        )


        # -----------------------------------------
        # Normalize Pixels
        # -----------------------------------------

        image_array = image_array / 255.0


        # -----------------------------------------
        # Add Batch Dimension
        # -----------------------------------------

        image_array = np.expand_dims(
            image_array,
            axis=0
        )

        # -----------------------------------------
        # Make Prediction
        # -----------------------------------------

        predictions = predict_image(image_array)

        if predictions is None:
            return {
                "filename": file.filename,
                "disease": "Model not available",
                "confidence": 0,
                "disease_risk": 50,
                "message": "Model not loaded on this deployment. Provide a .tflite model or deploy a worker with TensorFlow."
            }

        # -----------------------------------------
        # Highest Probability Class
        # -----------------------------------------

        predicted_index = np.argmax(
            predictions[0]
        )


        confidence = float(
            predictions[0][predicted_index] * 100
        )


        disease = CLASS_NAMES[
            predicted_index
        ]


        # -----------------------------------------
        # Disease Risk
        # -----------------------------------------

        base_risk = DISEASE_RISK.get(
            disease,
            50
        )


        if disease == "Healthy":

            disease_risk = max(
                5,
                round(
                    base_risk
                    + (100 - confidence) * 0.2
                )
            )

        else:

            disease_risk = min(
                100,
                round(
                    base_risk
                    * (confidence / 100)
                )
            )


        # -----------------------------------------
        # Message
        # -----------------------------------------

        if disease == "Healthy":

            message = (
                "The uploaded crop image appears healthy. Continue regular monitoring."
            )

        else:

            message = (
                f"Possible {disease} detected. "
                "Please monitor the crop and take "
                "preventive action."
            )


        # -----------------------------------------
        # Final Response
        # -----------------------------------------

        return {

            "filename": file.filename,

            "disease": disease,

            "confidence": round(
                confidence,
                2
            ),

            "disease_risk": disease_risk,

            "message": message
        }


    except Exception as e:

        return {

            "filename": file.filename,

            "disease": "Analysis Failed",

            "confidence": 0,

            "disease_risk": 50,

            "message": str(e)
        }