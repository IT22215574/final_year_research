from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List
import os
import json

import numpy as np
import pandas as pd
import pickle
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Fish Analysis API - Price Prediction & Quality Grading", version="2.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent
# Try ml-pipeline first, fallback to Backend
ML_MODELS_DIR = BASE_DIR.parent / "ml-pipeline" / "models"
BACKEND_MODELS_DIR = BASE_DIR.parent / "Backend" / "models"
MODELS_DIR = ML_MODELS_DIR if ML_MODELS_DIR.exists() else BACKEND_MODELS_DIR

ML_DATA_DIR = BASE_DIR.parent / "ml-pipeline" / "data" / "processed"
BACKEND_DATA_DIR = BASE_DIR.parent / "Backend" / "dataset" / "processed"
DATA_DIR = ML_DATA_DIR if ML_DATA_DIR.exists() else BACKEND_DATA_DIR

QUALITY_MODEL_DIR = BASE_DIR.parent / "ml-pipeline" / "models-extra" / "fish_quality_grade"
UPLOAD_DIR = BASE_DIR / "uploads"

# Create upload directory if it doesn't exist
UPLOAD_DIR.mkdir(exist_ok=True)

print(f"📁 Models directory: {MODELS_DIR}")
print(f"📁 Data directory: {DATA_DIR}")

# Load artifacts at startup
try:
    # Price prediction models
    with open(MODELS_DIR / "rf_model.pkl", "rb") as f:
        rf_model = pickle.load(f)
    with open(MODELS_DIR / "gb_model.pkl", "rb") as f:
        gb_model = pickle.load(f)
    with open(MODELS_DIR / "feature_names.pkl", "rb") as f:
        feature_names: List[str] = pickle.load(f)
    with open(MODELS_DIR / "le_sinhala.pkl", "rb") as f:
        le_sinhala = pickle.load(f)
    fish_df = pd.read_csv(DATA_DIR / "fish_names.csv")
    
    # Quality grading model (try to load, may not exist yet)
    quality_model = None
    try:
        import tensorflow as tf
        quality_model = tf.keras.models.load_model(QUALITY_MODEL_DIR / "fish_quality_final_model.h5")
        print("✅ Fish quality grading model loaded successfully")
    except Exception as e:
        print(f"⚠️  Quality model not available: {e}")
        
except Exception as exc:  # pragma: no cover - startup failure
    raise RuntimeError(f"Failed to load models or data: {exc}")


# Quality grading labels
QUALITY_GRADES = {
    0: {'grade': 'A', 'description': 'Excellent Quality'},
    1: {'grade': 'B', 'description': 'Good Quality'}, 
    2: {'grade': 'C', 'description': 'Average Quality'},
    3: {'grade': 'D', 'description': 'Poor Quality'}
}


class PredictRequest(BaseModel):
    fish_id: Optional[int] = None
    sinhala_name: Optional[str] = None
    date: str  # YYYY-MM-DD


class QualityGradeResponse(BaseModel):
    grade: str
    confidence: float
    description: str
    timestamp: str


def _encode_fish(sinhala_name: str) -> int:
    try:
        return int(le_sinhala.transform([sinhala_name])[0])
    except Exception:
        return 0


def _find_fish(req: PredictRequest) -> pd.Series:
    if req.fish_id is not None:
        matches = fish_df[fish_df["fish_id"] == req.fish_id]
    elif req.sinhala_name:
        matches = fish_df[fish_df["sinhala_name"] == req.sinhala_name]
    else:
        matches = pd.DataFrame()
    if matches.empty:
        raise HTTPException(status_code=404, detail="Fish not found")
    return matches.iloc[0]


def _build_feature_row(target_date: datetime, fish_encoded: int) -> dict:
    year = target_date.year
    month = target_date.month
    day_of_week = target_date.weekday()
    week_of_year = target_date.isocalendar()[1]
    season = 1 if month in [12, 1, 2] else 2 if month in [3, 4, 5] else 3 if month in [6, 7, 8] else 4
    is_weekend = 1 if day_of_week >= 5 else 0
    features_dict = {
        "fish_encoded": fish_encoded,
        "day_of_week": day_of_week,
        "month": month,
        "year": year,
        "week_of_year": week_of_year,
        "month_sin": np.sin(2 * np.pi * month / 12),
        "month_cos": np.cos(2 * np.pi * month / 12),
        "season": season,
        "is_weekend": is_weekend,
        "is_festival_day": 0,
        "before_festival_window": 0,
        "days_to_festival": 999,
        "weather_effect": 0,
        "poya_effect": 0,
        "festival_effect": 0,
    }
    return {name: features_dict.get(name, 0) for name in feature_names}


def _predict_series(center_date: datetime, fish_encoded: int):
    dates: List[str] = []
    prices: List[float] = []
    for offset in range(-15, 16):
        d = center_date + timedelta(days=offset)
        feature_row = _build_feature_row(d, fish_encoded)
        features_df = pd.DataFrame([feature_row])
        rf_pred = float(rf_model.predict(features_df)[0])
        gb_pred = float(gb_model.predict(features_df)[0])
        ensemble_pred = (rf_pred + gb_pred) / 2
        dates.append(d.date().isoformat())
        prices.append(ensemble_pred)
    return dates, prices


@app.get("/")
def root():
    return {
        "message": "Fish Analysis API - Price Prediction & Quality Grading",
        "version": "2.0.0",
        "services": {
            "price_prediction": True,
            "quality_grading": quality_model is not None
        },
        "endpoints": {
            "GET /fish": "List all fish species",
            "POST /predict": "Predict price for fish_id and date",
            "POST /grade": "Grade fish quality from image",
            "GET /health": "Check API health"
        }
    }


@app.get("/fish")
def list_fish():
    return fish_df.to_dict(orient="records")


@app.post("/predict")
def predict(req: PredictRequest):
    try:
        fish_row = _find_fish(req)
        target_date = datetime.fromisoformat(req.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")

    fish_encoded = _encode_fish(fish_row["sinhala_name"])
    dates, prices = _predict_series(target_date, fish_encoded)
    current_price = prices[15]

    return {
        "fish": fish_row.to_dict(),
        "predicted": current_price,
        "series": [{"date": d, "price": p} for d, p in zip(dates, prices)],
    }


def _preprocess_image_for_quality(image_path: str):
    """Preprocess image for quality grading"""
    try:
        from PIL import Image
        import numpy as np
        
        # Load and resize image
        image = Image.open(image_path)
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize to model input size
        image = image.resize((224, 224))
        
        # Convert to numpy array
        image_array = np.array(image)
        
        # Normalize pixel values to [0, 1]
        image_array = image_array.astype('float32') / 255.0
        
        # Add batch dimension
        image_array = np.expand_dims(image_array, axis=0)
        
        return image_array
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")


@app.post("/grade")
async def grade_fish_quality(
    image: UploadFile = File(...),
    fish_type: Optional[str] = Form(None)
):
    """
    Grade fish quality from uploaded image
    """
    if not quality_model:
        return {
            "success": False,
            "error": "Quality grading service not available",
            "message": "TensorFlow model not loaded. Install tensorflow to enable this feature.",
            "grade": "N/A",
            "confidence": 0.0
        }
    
    # Validate file type
    if not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Save uploaded file temporarily
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_file:
        content = await image.read()
        tmp_file.write(content)
        temp_path = tmp_file.name
    
    try:
        # Preprocess image
        processed_image = _preprocess_image_for_quality(temp_path)
        
        # Make prediction
        predictions = quality_model.predict(processed_image, verbose=0)
        
        # Get predicted class and confidence
        predicted_class = int(np.argmax(predictions[0]))
        confidence = float(np.max(predictions[0]))
        
        # Get grade info
        grade_info = QUALITY_GRADES.get(predicted_class, {'grade': 'Unknown', 'description': 'Unknown quality'})
        
        return {
            "success": True,
            "grade": grade_info['grade'],
            "confidence": confidence,
            "description": grade_info['description'],
            "fish_type": fish_type or "Unknown",
            "timestamp": datetime.now().isoformat(),
            "all_probabilities": predictions[0].tolist()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
    
    finally:
        # Clean up temporary file
        try:
            os.unlink(temp_path)
        except:
            pass


@app.get("/health")
def health_check():
    """Check API health status"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "price_prediction": True,
            "quality_grading": quality_model is not None
        },
        "models_loaded": {
            "random_forest": rf_model is not None,
            "gradient_boosting": gb_model is not None,
            "quality_grading": quality_model is not None
        }
    }


if __name__ == "__main__":
    print("🐟 Starting Fish Analysis API Server...")
    print("📈 Price Prediction: ✅ Enabled") 
    print(f"🔍 Quality Grading: {'✅ Enabled' if quality_model else '❌ Disabled (model not found)'}")
    print("🌐 Server starting on http://localhost:8000")
    
    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)
