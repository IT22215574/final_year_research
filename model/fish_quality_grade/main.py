from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
from pillow_heif import register_heif_opener
import io
import os
from typing import Dict, List, Tuple, Optional
import logging
import time
import hashlib
from datetime import datetime
import json
import base64

# Register HEIC/HEIF opener
register_heif_opener()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --------------------------------------------------
# CONFIG
# --------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Update these paths to match your actual model locations
FISH_DETECTOR_ONNX = os.path.join(SCRIPT_DIR, "fish_detector_1.onnx")
SPECIES_CLASSIFIER_ONNX = os.path.join(SCRIPT_DIR, "species_classifier_1.onnx")
GRADE_CLASSIFIER_ONNX = os.path.join(SCRIPT_DIR, "grade_classifier_1.onnx")

# Check if files exist with different possible names
if not os.path.exists(FISH_DETECTOR_ONNX):
    # Try alternative names
    alt_paths = [
        os.path.join(SCRIPT_DIR, "best_binary_model.onnx"),
        os.path.join(SCRIPT_DIR, "stage1_model.onnx"),
        os.path.join(SCRIPT_DIR, "fish_detector.onnx"),
    ]
    for alt_path in alt_paths:
        if os.path.exists(alt_path):
            FISH_DETECTOR_ONNX = alt_path
            logger.info(f"Found fish detector at: {alt_path}")
            break

if not os.path.exists(SPECIES_CLASSIFIER_ONNX):
    alt_paths = [
        os.path.join(SCRIPT_DIR, "best_species_model.onnx"),
        os.path.join(SCRIPT_DIR, "stage2_model.onnx"),
        os.path.join(SCRIPT_DIR, "species_classifier.onnx"),
    ]
    for alt_path in alt_paths:
        if os.path.exists(alt_path):
            SPECIES_CLASSIFIER_ONNX = alt_path
            logger.info(f"Found species classifier at: {alt_path}")
            break

if not os.path.exists(GRADE_CLASSIFIER_ONNX):
    alt_paths = [
        os.path.join(SCRIPT_DIR, "best_grade_model.onnx"),
        os.path.join(SCRIPT_DIR, "stage3_model.onnx"),
        os.path.join(SCRIPT_DIR, "grade_classifier.onnx"),
    ]
    for alt_path in alt_paths:
        if os.path.exists(alt_path):
            GRADE_CLASSIFIER_ONNX = alt_path
            logger.info(f"Found grade classifier at: {alt_path}")
            break

IMG_SIZE = 224

# Adjustable thresholds
FISH_THRESHOLD = 0.60  # Lowered from 0.70 to be more inclusive
SPECIES_THRESHOLD = 0.45  # Lowered for internet images
GRADE_THRESHOLD = 0.45
UNKNOWN_SPECIES_THRESHOLD = 0.30  # Below this, classify as unknown

# Enable test-time augmentation for better accuracy
USE_TTA = True
TTA_AUGMENTATIONS = 3  # Number of augmented views

# Label mappings (update these to match your training)
BINARY_LABELS = {
    0: "fish",
    1: "non_fish"
}

SPECIES_LABELS = {
    0: "flyingfish",
    1: "graymullet",
    2: "makerel",  # Note: spelling "makerel" vs "mackerel"
    3: "tuna",
    4: "whitemullet",
    5: "yellowfintrevally"
}

# Species that need grade classification
GRADE_SPECIES = ["makerel", "tuna", "mackerel"]  # Include both spellings

GRADE_LABELS = {
    0: "A",
    1: "B",
    2: "C"
}

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# Image quality assessment thresholds
MIN_IMAGE_SIZE = 50  # Minimum dimension in pixels
MAX_ASPECT_RATIO = 5.0  # Maximum width/height ratio

app = FastAPI(title="Fish Classifier API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model sessions (lazy loading)
fish_session = None
species_session = None
grade_session = None

# Cache for recent predictions (optional)
prediction_cache = {}
CACHE_SIZE = 100
CACHE_TTL = 3600  # 1 hour


def softmax(x: np.ndarray) -> np.ndarray:
    """Stable softmax"""
    x = x - np.max(x, axis=1, keepdims=True)
    e = np.exp(x)
    return e / np.sum(e, axis=1, keepdims=True)


def assess_image_quality(img: Image.Image) -> Dict:
    """Assess image quality to help with internet/downloaded images"""
    width, height = img.size
    aspect_ratio = max(width / height, height / width)

    # Convert to grayscale for quality metrics.
    # We avoid scipy here so the API runs with only Pillow + NumPy.
    gray = img.convert('L')

    # Downscale very large images for speed (quality metrics don't need full res)
    max_dim = max(width, height)
    if max_dim > 512:
        scale = 512 / max_dim
        new_w = max(1, int(round(width * scale)))
        new_h = max(1, int(round(height * scale)))
        gray = gray.resize((new_w, new_h), Image.BILINEAR)

    np_gray = np.asarray(gray, dtype=np.float32)

    # Sharpness: variance of Laplacian (5-point stencil)
    if np_gray.shape[0] < 3 or np_gray.shape[1] < 3:
        sharpness = 0.0
    else:
        padded = np.pad(np_gray, ((1, 1), (1, 1)), mode='reflect')
        lap = (
            -4.0 * padded[1:-1, 1:-1]
            + padded[0:-2, 1:-1]
            + padded[2:, 1:-1]
            + padded[1:-1, 0:-2]
            + padded[1:-1, 2:]
        )
        sharpness = float(np.var(lap))

    # Brightness and contrast
    brightness = float(np.mean(np_gray) / 255.0)
    contrast = float(np.std(np_gray) / 255.0)
    
    # Check if image might be a screenshot (low sharpness, high contrast edges)
    is_screenshot = sharpness < 100 and contrast > 0.3
    
    quality_issues = []
    if width < MIN_IMAGE_SIZE or height < MIN_IMAGE_SIZE:
        quality_issues.append("image_too_small")
    if aspect_ratio > MAX_ASPECT_RATIO:
        quality_issues.append("extreme_aspect_ratio")
    if sharpness < 50:
        quality_issues.append("blurry")
    if brightness < 0.1:
        quality_issues.append("too_dark")
    if brightness > 0.95:
        quality_issues.append("too_bright")
    
    return {
        "width": width,
        "height": height,
        "aspect_ratio": float(aspect_ratio),
        "sharpness": float(sharpness),
        "brightness": float(brightness),
        "contrast": float(contrast),
        "is_screenshot": is_screenshot,
        "quality_issues": quality_issues
    }


def enhance_for_internet_image(img: Image.Image) -> Image.Image:
    """Apply enhancements to help with internet/downloaded images"""
    # Enhance contrast slightly
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.1)
    
    # Enhance sharpness
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(1.2)
    
    return img


def apply_tta_augmentations(img_array: np.ndarray) -> List[np.ndarray]:
    """Create multiple augmented views for Test-Time Augmentation"""
    augmented = [img_array]  # Original
    
    # Horizontal flip
    flipped = np.flip(img_array, axis=3)  # Flip width dimension
    augmented.append(flipped)
    
    # Slight brightness variations
    for factor in [0.9, 1.1]:
        bright = img_array * factor
        bright = np.clip(bright, -2.5, 2.5)  # Keep within reasonable range
        augmented.append(bright)
    
    return augmented[:TTA_AUGMENTATIONS]  # Limit number


def get_cache_key(left_data: bytes, right_data: bytes) -> str:
    """Generate cache key from image data"""
    combined = left_data + right_data
    return hashlib.md5(combined).hexdigest()


def load_models():
    """Load ONNX models"""
    global fish_session, species_session, grade_session
    
    try:
        # Check if model files exist
        missing = []
        for model_path in [FISH_DETECTOR_ONNX, SPECIES_CLASSIFIER_ONNX, GRADE_CLASSIFIER_ONNX]:
            if not os.path.exists(model_path):
                missing.append(model_path)
        
        if missing:
            error_msg = f"Missing model files: {missing}"
            logger.error(error_msg)
            return False, error_msg
        
        # Create sessions with optimal settings
        sess_options = ort.SessionOptions()
        sess_options.intra_op_num_threads = 2
        sess_options.inter_op_num_threads = 2
        sess_options.enable_cpu_mem_arena = False
        sess_options.enable_mem_pattern = False
        
        fish_session = ort.InferenceSession(
            FISH_DETECTOR_ONNX, 
            sess_options=sess_options,
            providers=["CPUExecutionProvider"]
        )
        species_session = ort.InferenceSession(
            SPECIES_CLASSIFIER_ONNX,
            sess_options=sess_options,
            providers=["CPUExecutionProvider"]
        )
        grade_session = ort.InferenceSession(
            GRADE_CLASSIFIER_ONNX,
            sess_options=sess_options,
            providers=["CPUExecutionProvider"]
        )
        
        logger.info("All models loaded successfully")
        return True, "Models loaded successfully"
    except Exception as e:
        logger.error(f"Error loading models: {str(e)}")
        return False, str(e)


async def preprocess_image(file: UploadFile, apply_enhancements: bool = True) -> Tuple[np.ndarray, Dict]:
    """Preprocess uploaded image with quality assessment"""
    try:
        contents = await file.read()
        if not contents:
            raise ValueError(f"Received empty file for '{file.filename}'")
        
        logger.info(f"Preprocessing '{file.filename}': {len(contents)} bytes")
        
        # Open image
        img = Image.open(io.BytesIO(contents))
        
        # Apply EXIF rotation
        img = ImageOps.exif_transpose(img)
        
        # Assess quality
        quality_info = assess_image_quality(img)
        logger.info(f"Image quality: {quality_info}")
        
        # Convert to RGB
        img = img.convert("RGB")
        
        # Apply enhancements for internet/downloaded images
        if apply_enhancements and quality_info.get("is_screenshot", False):
            img = enhance_for_internet_image(img)
            logger.info("Applied enhancements for screenshot/internet image")
        
        # Resize
        img = img.resize((IMG_SIZE, IMG_SIZE), Image.BILINEAR)
        
        # Normalize
        arr = np.asarray(img).astype(np.float32) / 255.0
        arr = (arr - MEAN) / STD
        arr = np.transpose(arr, (2, 0, 1))
        arr = np.expand_dims(arr, 0)
        
        return arr.astype(np.float32), quality_info
        
    except Exception as e:
        logger.error(f"Error preprocessing image '{file.filename}': {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid image '{file.filename}': {str(e)}")


def run_model_tta(session, left: np.ndarray, right: np.ndarray) -> Tuple[int, float, np.ndarray, float]:
    """
    Run inference with Test-Time Augmentation for better accuracy
    Returns: (pred_idx, confidence, probabilities, uncertainty)
    """
    try:
        # Create augmented views
        left_views = apply_tta_augmentations(left)
        right_views = apply_tta_augmentations(right)
        
        all_probs = []
        
        for left_view, right_view in zip(left_views, right_views):
            logits = session.run(None, {"left": left_view, "right": right_view})[0]
            probs = softmax(logits)[0]
            all_probs.append(probs)
        
        # Average probabilities
        avg_probs = np.mean(all_probs, axis=0)
        
        # Calculate uncertainty (standard deviation across augmentations)
        std_probs = np.std(all_probs, axis=0)
        uncertainty = float(np.mean(std_probs))
        
        pred_idx = int(np.argmax(avg_probs))
        confidence = float(avg_probs[pred_idx])
        
        return pred_idx, confidence, avg_probs, uncertainty
        
    except Exception as e:
        logger.error(f"Error in TTA inference: {str(e)}")
        # Fall back to single inference
        logits = session.run(None, {"left": left, "right": right})[0]
        probs = softmax(logits)[0]
        pred_idx = int(np.argmax(probs))
        confidence = float(probs[pred_idx])
        return pred_idx, confidence, probs, 1.0  # High uncertainty on error


def run_model(session, left: np.ndarray, right: np.ndarray, use_tta: bool = False) -> Dict:
    """Run inference on a model with optional TTA"""
    try:
        if use_tta:
            pred_idx, confidence, probs, uncertainty = run_model_tta(session, left, right)
            return {
                "prediction_idx": pred_idx,
                "confidence": confidence,
                "probabilities": probs,
                "uncertainty": uncertainty,
                "method": "tta"
            }
        else:
            logits = session.run(None, {"left": left, "right": right})[0]
            probs = softmax(logits)[0]
            pred_idx = int(np.argmax(probs))
            confidence = float(probs[pred_idx])
            return {
                "prediction_idx": pred_idx,
                "confidence": confidence,
                "probabilities": probs,
                "uncertainty": 0.0,
                "method": "single"
            }
    except Exception as e:
        logger.error(f"Error running model: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Model inference error: {str(e)}")


@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    success, message = load_models()
    if not success:
        logger.warning(f"Models not loaded on startup: {message}")
    else:
        logger.info("All models loaded successfully!")


@app.get("/")
async def root():
    return {
        "message": "Fish Classifier API",
        "version": "2.0",
        "status": "running",
        "features": {
            "tta": USE_TTA,
            "unknown_species_detection": True,
            "image_quality_assessment": True
        }
    }


@app.get("/health")
async def health_check():
    """Check if models are loaded and API is healthy"""
    models_loaded = all([fish_session, species_session, grade_session])
    return {
        "status": "healthy" if models_loaded else "degraded",
        "timestamp": datetime.now().isoformat(),
        "models_loaded": models_loaded,
        "fish_detector": fish_session is not None,
        "species_classifier": species_session is not None,
        "grade_classifier": grade_session is not None,
        "model_paths": {
            "fish_detector": FISH_DETECTOR_ONNX if os.path.exists(FISH_DETECTOR_ONNX) else "missing",
            "species_classifier": SPECIES_CLASSIFIER_ONNX if os.path.exists(SPECIES_CLASSIFIER_ONNX) else "missing",
            "grade_classifier": GRADE_CLASSIFIER_ONNX if os.path.exists(GRADE_CLASSIFIER_ONNX) else "missing"
        }
    }


@app.post("/predict")
async def predict(
    left_image: UploadFile = File(...),
    right_image: UploadFile = File(...),
    use_tta: bool = Query(USE_TTA, description="Use Test-Time Augmentation")
) -> Dict:
    """
    Predict fish species and grade from left and right images
    Handles internet/downloaded images with special preprocessing
    """
    start_time = time.time()
    
    # Check if models are loaded
    if not all([fish_session, species_session, grade_session]):
        success, message = load_models()
        if not success:
            raise HTTPException(status_code=503, detail=f"Models not available: {message}")
    
    # Validate file types
    REJECTED_TYPES = {'application/json', 'text/plain', 'text/html'}
    for img in [left_image, right_image]:
        ct = (img.content_type or '').lower()
        if ct in REJECTED_TYPES:
            raise HTTPException(status_code=400, detail=f"File {img.filename} is not an image")
    
    # Check cache
    cache_key = None
    if CACHE_SIZE > 0:
        left_contents = await left_image.read()
        right_contents = await right_image.read()
        cache_key = get_cache_key(left_contents, right_contents)
        
        if cache_key in prediction_cache:
            cached = prediction_cache[cache_key]
            if time.time() - cached["timestamp"] < CACHE_TTL:
                logger.info(f"Cache hit for {cache_key}")
                cached["result"]["from_cache"] = True
                return cached["result"]
        
        # Reset file positions for preprocessing
        await left_image.seek(0)
        await right_image.seek(0)
    
    # Preprocess images with quality assessment
    try:
        left, left_quality = await preprocess_image(left_image, apply_enhancements=True)
        right, right_quality = await preprocess_image(right_image, apply_enhancements=True)
    finally:
        await left_image.close()
        await right_image.close()
    
    # Stage 1: Fish / Non-Fish with TTA
    s1_result = run_model(fish_session, left, right, use_tta=use_tta)
    s1_label = BINARY_LABELS[s1_result["prediction_idx"]]
    
    # Adjust fish threshold based on image quality
    adjusted_fish_threshold = FISH_THRESHOLD
    if left_quality.get("is_screenshot", False) or right_quality.get("is_screenshot", False):
        adjusted_fish_threshold = 0.55  # Lower threshold for screenshots
    
    # Prepare response
    response = {
        "request_id": hashlib.md5(str(time.time()).encode()).hexdigest()[:8],
        "timestamp": datetime.now().isoformat(),
        "processing_time": 0,
        "image_quality": {
            "left": left_quality,
            "right": right_quality
        },
        "stage1": {
            "label": s1_label,
            "confidence": s1_result["confidence"],
            "threshold_used": adjusted_fish_threshold,
            "threshold_met": s1_result["confidence"] >= adjusted_fish_threshold,
            "probabilities": {BINARY_LABELS[i]: float(p) for i, p in enumerate(s1_result["probabilities"])},
            "uncertainty": s1_result["uncertainty"],
            "method": s1_result["method"]
        },
        "final_result": "NOT FISH",
        "status": "rejected"
    }
    
    # If not fish or low confidence, return early
    if s1_label != "fish" or s1_result["confidence"] < adjusted_fish_threshold:
        response["reason"] = "Not identified as fish or low confidence"
        response["status"] = "rejected_at_stage1"
        response["processing_time"] = time.time() - start_time
        
        # Cache the result
        if cache_key:
            prediction_cache[cache_key] = {
                "timestamp": time.time(),
                "result": response
            }
            # Limit cache size
            if len(prediction_cache) > CACHE_SIZE:
                oldest = min(prediction_cache.keys(), 
                           key=lambda k: prediction_cache[k]["timestamp"])
                del prediction_cache[oldest]
        
        return response
    
    # Stage 2: Species with TTA
    s2_result = run_model(species_session, left, right, use_tta=use_tta)
    species = SPECIES_LABELS[s2_result["prediction_idx"]]
    
    response["stage2"] = {
        "label": species,
        "confidence": s2_result["confidence"],
        "threshold_met": s2_result["confidence"] >= SPECIES_THRESHOLD,
        "probabilities": {SPECIES_LABELS[i]: float(p) for i, p in enumerate(s2_result["probabilities"])},
        "uncertainty": s2_result["uncertainty"],
        "method": s2_result["method"]
    }
    
    # Check if species is known with confidence
    is_known_species = s2_result["confidence"] >= UNKNOWN_SPECIES_THRESHOLD
    
    if not is_known_species:
        response["species_status"] = "unknown"
        response["final_result"] = f"UNKNOWN_SPECIES (closest: {species})"
        response["status"] = "unknown_species"
    else:
        response["species_status"] = "known"
        
        # Stage 3: Grade (only for target species)
        if species.lower() in [s.lower() for s in GRADE_SPECIES]:
            s3_result = run_model(grade_session, left, right, use_tta=use_tta)
            grade = GRADE_LABELS[s3_result["prediction_idx"]]
            
            response["stage3"] = {
                "label": grade,
                "confidence": s3_result["confidence"],
                "threshold_met": s3_result["confidence"] >= GRADE_THRESHOLD,
                "probabilities": {GRADE_LABELS[i]: float(p) for i, p in enumerate(s3_result["probabilities"])},
                "uncertainty": s3_result["uncertainty"],
                "method": s3_result["method"]
            }
            
            response["final_result"] = f"{species}_{grade}"
            response["status"] = "success"
        else:
            response["stage3"] = {
                "label": "not_applicable",
                "reason": f"Grade only available for: {GRADE_SPECIES}"
            }
            response["final_result"] = species
            response["status"] = "success_no_grade"
    
    # Add warnings
    warnings = []
    if s1_result["uncertainty"] > 0.3:
        warnings.append(f"High uncertainty in fish detection: {s1_result['uncertainty']:.2f}")
    if s2_result["uncertainty"] > 0.3:
        warnings.append(f"High uncertainty in species classification: {s2_result['uncertainty']:.2f}")
    if left_quality.get("quality_issues") or right_quality.get("quality_issues"):
        warnings.append("Image quality issues detected")
    
    if warnings:
        response["warnings"] = warnings
    
    response["processing_time"] = time.time() - start_time
    
    # Cache the result
    if cache_key:
        prediction_cache[cache_key] = {
            "timestamp": time.time(),
            "result": response
        }
        # Limit cache size
        if len(prediction_cache) > CACHE_SIZE:
            oldest = min(prediction_cache.keys(), 
                       key=lambda k: prediction_cache[k]["timestamp"])
            del prediction_cache[oldest]
    
    return response


@app.post("/predict/base64")
async def predict_base64(request: Dict):
    """
    Alternative endpoint that accepts base64 encoded images
    Request format: {"left": "base64_string", "right": "base64_string"}
    """
    try:
        left_b64 = request.get("left")
        right_b64 = request.get("right")
        
        if not left_b64 or not right_b64:
            raise HTTPException(status_code=400, detail="Missing left or right image")
        
        # Decode base64
        left_bytes = base64.b64decode(left_b64)
        right_bytes = base64.b64decode(right_b64)
        
        # Create UploadFile-like objects
        from fastapi.datastructures import UploadFile
        from tempfile import SpooledTemporaryFile
        
        left_file = SpooledTemporaryFile()
        left_file.write(left_bytes)
        left_file.seek(0)
        
        right_file = SpooledTemporaryFile()
        right_file.write(right_bytes)
        right_file.seek(0)
        
        left_upload = UploadFile(filename="left.jpg", file=left_file)
        right_upload = UploadFile(filename="right.jpg", file=right_file)
        
        # Call predict endpoint with default TTA setting
        return await predict(left_upload, right_upload, use_tta=USE_TTA)
        
    except Exception as e:
        logger.error(f"Error in base64 prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats")
async def get_stats():
    """Get API statistics"""
    return {
        "cache_size": len(prediction_cache),
        "cache_ttl": CACHE_TTL,
        "models_loaded": all([fish_session, species_session, grade_session]),
        "thresholds": {
            "fish": FISH_THRESHOLD,
            "species": SPECIES_THRESHOLD,
            "grade": GRADE_THRESHOLD,
            "unknown_species": UNKNOWN_SPECIES_THRESHOLD
        },
        "tta_enabled": USE_TTA,
        "model_paths": {
            "fish_detector": FISH_DETECTOR_ONNX,
            "species_classifier": SPECIES_CLASSIFIER_ONNX,
            "grade_classifier": GRADE_CLASSIFIER_ONNX
        }
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)