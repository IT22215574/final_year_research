from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener   # HEIC/HEIF support (iPhone photos)
import io
import os
from typing import Dict, List, Tuple
import logging

# Register HEIC/HEIF opener with Pillow so Image.open() handles iPhone photos
register_heif_opener()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --------------------------------------------------
# CONFIG
# --------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

FISH_DETECTOR_ONNX = os.path.join(SCRIPT_DIR, "fish_detector.onnx")
SPECIES_CLASSIFIER_ONNX = os.path.join(SCRIPT_DIR, "species_classifier.onnx")
GRADE_CLASSIFIER_ONNX = os.path.join(SCRIPT_DIR, "grade_classifier.onnx")

IMG_SIZE = 224

FISH_THRESHOLD = 0.70
SPECIES_THRESHOLD = 0.50
GRADE_THRESHOLD = 0.50

BINARY_LABELS = {
    0: "fish",
    1: "non_fish"
}

SPECIES_LABELS = {
    0: "flyingfish",
    1: "graymullet",
    2: "makerel",
    3: "tuna",
    4: "whitemullet",
    5: "yellowfintrevally"
}

GRADE_LABELS = {
    0: "A",
    1: "B",
    2: "C"
}

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

app = FastAPI(title="Fish Classifier API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your React Native app's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model sessions (lazy loading)
fish_session = None
species_session = None
grade_session = None


def softmax(x: np.ndarray) -> np.ndarray:
    x = x - np.max(x, axis=1, keepdims=True)
    e = np.exp(x)
    return e / np.sum(e, axis=1, keepdims=True)


def load_models():
    """Load ONNX models"""
    global fish_session, species_session, grade_session
    
    try:
        # Create models directory if it doesn't exist
        os.makedirs(os.path.dirname(FISH_DETECTOR_ONNX), exist_ok=True)
        
        # Check if model files exist
        missing = []
        for model_path in [FISH_DETECTOR_ONNX, SPECIES_CLASSIFIER_ONNX, GRADE_CLASSIFIER_ONNX]:
            if not os.path.exists(model_path):
                missing.append(model_path)
        
        if missing:
            error_msg = f"Missing model files: {missing}"
            logger.error(error_msg)
            return False, error_msg
        
        fish_session = ort.InferenceSession(FISH_DETECTOR_ONNX, providers=["CPUExecutionProvider"])
        species_session = ort.InferenceSession(SPECIES_CLASSIFIER_ONNX, providers=["CPUExecutionProvider"])
        grade_session = ort.InferenceSession(GRADE_CLASSIFIER_ONNX, providers=["CPUExecutionProvider"])
        
        logger.info("All models loaded successfully")
        return True, "Models loaded successfully"
    except Exception as e:
        logger.error(f"Error loading models: {str(e)}")
        return False, str(e)


async def preprocess_image(file: UploadFile) -> np.ndarray:
    """Preprocess uploaded image — async so the full stream is read correctly."""
    try:
        # await file.read() is the correct FastAPI way; file.file.read() can return
        # empty bytes when the stream position is non-zero in an async context.
        contents = await file.read()
        if not contents:
            raise ValueError(f"Received empty file for '{file.filename}'")
        
        logger.info(f"Preprocessing '{file.filename}': {len(contents)} bytes, content_type={file.content_type}")
        
        img = Image.open(io.BytesIO(contents))
        # Apply EXIF rotation (phone cameras embed orientation in metadata)
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGB")
        img = img.resize((IMG_SIZE, IMG_SIZE), Image.BILINEAR)
        
        # Normalize with ImageNet mean/std
        arr = np.asarray(img).astype(np.float32) / 255.0
        arr = (arr - MEAN) / STD
        arr = np.transpose(arr, (2, 0, 1))
        arr = np.expand_dims(arr, 0)
        
        return arr.astype(np.float32)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error preprocessing image '{file.filename}': {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid image '{file.filename}': {str(e)}")


def run_model(session, left: np.ndarray, right: np.ndarray) -> Tuple[int, float, np.ndarray]:
    """Run inference on a model"""
    try:
        logits = session.run(None, {"left": left, "right": right})[0]
        probs = softmax(logits)[0]
        pred_idx = int(np.argmax(probs))
        conf = float(probs[pred_idx])
        return pred_idx, conf, probs
    except Exception as e:
        logger.error(f"Error running model: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Model inference error: {str(e)}")


@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    success, message = load_models()
    if not success:
        logger.warning(f"Models not loaded on startup: {message}")


@app.get("/")
async def root():
    return {"message": "Fish Classifier API", "status": "running"}


@app.get("/health")
async def health_check():
    """Check if models are loaded and API is healthy"""
    models_loaded = all([fish_session, species_session, grade_session])
    return {
        "status": "healthy" if models_loaded else "degraded",
        "models_loaded": models_loaded,
        "fish_detector": fish_session is not None,
        "species_classifier": species_session is not None,
        "grade_classifier": grade_session is not None
    }


@app.post("/predict")
async def predict(
    left_image: UploadFile = File(...),
    right_image: UploadFile = File(...)
) -> Dict:
    """
    Predict fish species and grade from left and right images
    
    Returns:
    - final_result: Combined species_grade or NOT FISH
    - stage1: Fish/non-fish detection result
    - stage2: Species classification result (if applicable)
    - stage3: Grade classification result (if applicable)
    - probabilities: Raw probabilities for all stages
    """
    # Check if models are loaded
    if not all([fish_session, species_session, grade_session]):
        success, message = load_models()
        if not success:
            raise HTTPException(status_code=503, detail=f"Models not available: {message}")
    
    # Validate file types — React Native sometimes sends application/octet-stream,
    # so we accept anything that isn't clearly wrong (e.g. application/json).
    REJECTED_TYPES = {'application/json', 'text/plain', 'text/html'}
    for img in [left_image, right_image]:
        ct = (img.content_type or '').lower()
        if ct in REJECTED_TYPES:
            raise HTTPException(status_code=400, detail=f"File {img.filename} is not an image (content_type={ct})")
    
    # Preprocess images
    try:
        left = await preprocess_image(left_image)
        right = await preprocess_image(right_image)
    finally:
        # Close file handles
        await left_image.close()
        await right_image.close()
    
    # Stage 1: Fish / Non-Fish
    s1_idx, s1_conf, s1_probs = run_model(fish_session, left, right)
    s1_label = BINARY_LABELS[s1_idx]
    
    # Prepare response
    response = {
        "stage1": {
            "label": s1_label,
            "confidence": s1_conf,
            "threshold_met": s1_conf >= FISH_THRESHOLD,
            "probabilities": {BINARY_LABELS[i]: float(p) for i, p in enumerate(s1_probs)}
        },
        "final_result": "NOT FISH",
        "status": "rejected"
    }
    
    # If not fish or low confidence, return early
    if s1_label != "fish" or s1_conf < FISH_THRESHOLD:
        response["reason"] = "Not identified as fish or low confidence"
        response["status"] = "rejected_at_stage1"
        return response
    
    # Stage 2: Species
    s2_idx, s2_conf, s2_probs = run_model(species_session, left, right)
    species = SPECIES_LABELS[s2_idx]
    
    response["stage2"] = {
        "label": species,
        "confidence": s2_conf,
        "threshold_met": s2_conf >= SPECIES_THRESHOLD,
        "probabilities": {SPECIES_LABELS[i]: float(p) for i, p in enumerate(s2_probs)}
    }
    
    # Stage 3: Grade
    s3_idx, s3_conf, s3_probs = run_model(grade_session, left, right)
    grade = GRADE_LABELS[s3_idx]
    
    response["stage3"] = {
        "label": grade,
        "confidence": s3_conf,
        "threshold_met": s3_conf >= GRADE_THRESHOLD,
        "probabilities": {GRADE_LABELS[i]: float(p) for i, p in enumerate(s3_probs)}
    }
    
    # Final result
    final_label = f"{species}_{grade}"
    response["final_result"] = final_label
    response["status"] = "success"
    
    # Add warnings if needed
    warnings = []
    if s2_conf < SPECIES_THRESHOLD:
        warnings.append(f"Low species confidence: {s2_conf:.2%}")
    if s3_conf < GRADE_THRESHOLD:
        warnings.append(f"Low grade confidence: {s3_conf:.2%}")
    
    if warnings:
        response["warnings"] = warnings
    
    return response


@app.post("/predict/base64")
async def predict_base64(request: Dict):
    """
    Alternative endpoint that accepts base64 encoded images
    Request format: {"left": "base64_string", "right": "base64_string"}
    """
    # Similar implementation for base64
    pass


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)