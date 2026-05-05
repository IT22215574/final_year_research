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

# Configure logging first — must be set up before any module-level log calls
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Register HEIC/HEIF opener
register_heif_opener()

# Fish measurement service (OpenCV pipeline) — optional dependency
try:
    from services.fish_measurement import measure_fish
    MEASUREMENT_AVAILABLE = True
except ImportError as _cv_err:
    logger.warning(f"fish_measurement service unavailable (opencv not installed?): {_cv_err}")
    MEASUREMENT_AVAILABLE = False

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
    FISH_DETECTOR_ONNX = os.path.join(SCRIPT_DIR, "data_csv/train/Effecient_best1_binary_model.onnx")
    if os.path.exists(FISH_DETECTOR_ONNX):
        logger.info(f"Found fish detector at: {FISH_DETECTOR_ONNX}")

if not os.path.exists(SPECIES_CLASSIFIER_ONNX):
    SPECIES_CLASSIFIER_ONNX = os.path.join(SCRIPT_DIR, "data_csv/train/Effecient_best1_species_model.onnx")
    if os.path.exists(SPECIES_CLASSIFIER_ONNX):
        logger.info(f"Found species classifier at: {SPECIES_CLASSIFIER_ONNX}")

if not os.path.exists(GRADE_CLASSIFIER_ONNX):
    GRADE_CLASSIFIER_ONNX = os.path.join(SCRIPT_DIR, "data_csv/train/Effecient_best1_grade_model.onnx")
    if os.path.exists(GRADE_CLASSIFIER_ONNX):
        logger.info(f"Found grade classifier at: {GRADE_CLASSIFIER_ONNX}")

IMG_SIZE = 224

# Adjustable thresholds
FISH_THRESHOLD = 0.60  # Lowered from 0.70 to be more inclusive
SPECIES_THRESHOLD = 0.45  # Lowered for internet images
GRADE_THRESHOLD = 0.45
UNKNOWN_SPECIES_THRESHOLD = 0.30  # Below this, classify as unknown

# ── Per-image validation thresholds ─────────────────────────────────────────
# Lowered thresholds to handle internet/downloaded fish images better
# Internet fish images often look different from training data (lighting, angles, compression)
PER_IMAGE_FISH_THRESHOLD  = 0.55   # Lowered to 0.55 to accept marginal fish detections
PER_IMAGE_SPECIES_THRESHOLD = 0.45 # Lowered from 0.70 for internet images
FINAL_GRADE_THRESHOLD = 0.58       # Grade confidence minimum

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

# All species recognised by the species classifier
SUPPORTED_SPECIES = list(SPECIES_LABELS.values())

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


def run_single_image(session, img: np.ndarray, use_tta: bool = False) -> Dict:
    """
    Run inference on a single image by feeding it as both the left and right
    input.  This allows per-image validation with the dual-input model.
    """
    return run_model(session, img, img, use_tta=use_tta)


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
    Full validation and prediction pipeline for fish images.

    Steps:
      1. Validate LEFT image is a fish  (per-image)
      2. Validate RIGHT image is a fish (per-image)
      3. Predict species for LEFT image  (per-image)
      4. Predict species for RIGHT image (per-image)
      5. Reject if species confidence too low  → unknown_species
      6. Compare left vs right species         → species_mismatch
      7. Check species is supported            → unsupported_species
      8. Run dual-image grading
      9. Apply grade confidence threshold      → low_confidence
    """
    start_time = time.time()

    # ── Model check ───────────────────────────────────────────────────────
    if not all([fish_session, species_session, grade_session]):
        success, message = load_models()
        if not success:
            raise HTTPException(status_code=503, detail=f"Models not available: {message}")

    # ── File-type validation ──────────────────────────────────────────────
    REJECTED_TYPES = {'application/json', 'text/plain', 'text/html'}
    for img in [left_image, right_image]:
        ct = (img.content_type or '').lower()
        if ct in REJECTED_TYPES:
            raise HTTPException(status_code=400, detail=f"File {img.filename} is not an image")

    # ── Cache check ───────────────────────────────────────────────────────
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
        await left_image.seek(0)
        await right_image.seek(0)

    # ── Preprocess ────────────────────────────────────────────────────────
    try:
        left, left_quality = await preprocess_image(left_image, apply_enhancements=True)
        right, right_quality = await preprocess_image(right_image, apply_enhancements=True)
    finally:
        await left_image.close()
        await right_image.close()

    # Collect image-quality warnings
    warnings: List[str] = []
    if left_quality.get("is_screenshot"):
        warnings.append("Left image appears to be a screenshot — results may be less accurate")
    if right_quality.get("is_screenshot"):
        warnings.append("Right image appears to be a screenshot — results may be less accurate")
    if left_quality.get("quality_issues"):
        warnings.append(f"Left image issues: {', '.join(left_quality['quality_issues'])}")
    if right_quality.get("quality_issues"):
        warnings.append(f"Right image issues: {', '.join(right_quality['quality_issues'])}")

    # ── Helper: build response dict ───────────────────────────────────────
    def _response(status: str, message: str, **kw) -> Dict:
        resp = {
            "request_id": hashlib.md5(str(time.time()).encode()).hexdigest()[:8],
            "timestamp": datetime.now().isoformat(),
            "processing_time": round(time.time() - start_time, 3),
            "status": status,
            "message": message,
            "image_quality": {"left": left_quality, "right": right_quality},
            "warnings": warnings,
        }
        resp.update(kw)
        return resp

    def _cache_and_return(resp: Dict) -> Dict:
        if cache_key:
            prediction_cache[cache_key] = {"timestamp": time.time(), "result": resp}
            if len(prediction_cache) > CACHE_SIZE:
                oldest = min(prediction_cache.keys(),
                             key=lambda k: prediction_cache[k]["timestamp"])
                del prediction_cache[oldest]
        return resp

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 1 & 2 — Per-image fish detection (no TTA for speed)
    # ═══════════════════════════════════════════════════════════════════════
    left_fish = run_single_image(fish_session, left, use_tta=False)
    right_fish = run_single_image(fish_session, right, use_tta=False)

    left_fish_label  = BINARY_LABELS[left_fish["prediction_idx"]]
    right_fish_label = BINARY_LABELS[right_fish["prediction_idx"]]
    left_fish_ok  = left_fish_label == "fish" and left_fish["confidence"] >= PER_IMAGE_FISH_THRESHOLD
    right_fish_ok = right_fish_label == "fish" and right_fish["confidence"] >= PER_IMAGE_FISH_THRESHOLD

    piv = {  # per-image validation payload
        "left_fish_detected":    left_fish_ok,
        "left_fish_confidence":  round(left_fish["confidence"], 4),
        "left_fish_label":       left_fish_label,
        "right_fish_detected":   right_fish_ok,
        "right_fish_confidence": round(right_fish["confidence"], 4),
        "right_fish_label":      right_fish_label,
    }

    logger.info(
        f"[predict] Per-image fish: left={left_fish_label}"
        f"({left_fish['confidence']:.2f}) "
        f"right={right_fish_label}({right_fish['confidence']:.2f})"
    )

    # Both non-fish
    if not left_fish_ok and not right_fish_ok:
        return _cache_and_return(_response(
            "no_fish",
            "No valid fish detected in the uploaded images.",
            per_image_validation=piv,
            final_result="NOT FISH",
            stage1={
                "label": "non_fish",
                "confidence": max(left_fish["confidence"], right_fish["confidence"]),
                "probabilities": {
                    BINARY_LABELS[i]: float(p)
                    for i, p in enumerate(left_fish["probabilities"])
                },
            },
        ))

    # One fish, one non-fish
    if left_fish_ok != right_fish_ok:
        return _cache_and_return(_response(
            "invalid_pair",
            "Both images must contain a valid fish. "
            "One image does not appear to contain a fish.",
            per_image_validation=piv,
            final_result="INVALID PAIR",
        ))

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 3 & 4 — Per-image species prediction
    # ═══════════════════════════════════════════════════════════════════════
    left_sp  = run_single_image(species_session, left, use_tta=use_tta)
    right_sp = run_single_image(species_session, right, use_tta=use_tta)

    left_species    = SPECIES_LABELS[left_sp["prediction_idx"]]
    right_species   = SPECIES_LABELS[right_sp["prediction_idx"]]
    left_sp_conf    = left_sp["confidence"]
    right_sp_conf   = right_sp["confidence"]

    piv.update({
        "left_species":             left_species,
        "left_species_confidence":  round(left_sp_conf, 4),
        "right_species":            right_species,
        "right_species_confidence": round(right_sp_conf, 4),
    })

    logger.info(
        f"[predict] Per-image species: left={left_species}"
        f"({left_sp_conf:.2f}) right={right_species}({right_sp_conf:.2f})"
    )

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 5 — Per-image species confidence check (NON-BLOCKING)
    # run_single_image duplicates the same image as both left & right which
    # can confuse the dual-input model, so per-image species predictions are
    # treated as advisory only.  The dual-image pipeline (Step 7) is the
    # authoritative source for species identification.
    # ═══════════════════════════════════════════════════════════════════════
    if left_sp_conf < PER_IMAGE_SPECIES_THRESHOLD or right_sp_conf < PER_IMAGE_SPECIES_THRESHOLD:
        low_side = "left" if left_sp_conf <= right_sp_conf else "right"
        low_conf = min(left_sp_conf, right_sp_conf)
        warnings.append(
            f"Per-image species confidence is low on the {low_side} side "
            f"({low_conf:.0%}). Proceeding with dual-image classification."
        )
        logger.info(
            f"[predict] Low per-image species confidence ({low_side}={low_conf:.2f}), "
            f"continuing to dual-image pipeline"
        )

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 6 — Per-image species mismatch (NON-BLOCKING)
    # ═══════════════════════════════════════════════════════════════════════
    if left_species != right_species:
        warnings.append(
            f"Per-image species predictions disagree "
            f"(left={left_species}, right={right_species}). "
            f"Dual-image prediction will be used as the definitive result."
        )
        logger.info(
            f"[predict] Per-image species mismatch: {left_species} vs {right_species}, "
            f"continuing to dual-image pipeline"
        )

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 7 — Dual-image pipeline + ensemble species prediction
    # Combine dual-image and per-image species probabilities for a more
    # robust result.  Dual-image gets extra weight (×2) because it uses
    # proper left+right views as designed during training.
    # ═══════════════════════════════════════════════════════════════════════

    # Stage 1: Dual-image fish detection (backward-compatible response)
    s1_result = run_model(fish_session, left, right, use_tta=use_tta)
    s1_label  = BINARY_LABELS[s1_result["prediction_idx"]]

    # Stage 2: Dual-image species
    s2_result    = run_model(species_session, left, right, use_tta=use_tta)
    dual_species_raw = SPECIES_LABELS[s2_result["prediction_idx"]]
    dual_sp_conf_raw = s2_result["confidence"]

    # ── Ensemble: weighted average of per-image + dual-image probabilities ─
    # Weights: dual-image ×2, left per-image ×1, right per-image ×1
    ensemble_probs = (
        left_sp["probabilities"]
        + right_sp["probabilities"]
        + 2.0 * s2_result["probabilities"]
    ) / 4.0
    ensemble_idx  = int(np.argmax(ensemble_probs))
    ensemble_conf = float(ensemble_probs[ensemble_idx])
    dual_species  = SPECIES_LABELS[ensemble_idx]
    dual_sp_conf  = ensemble_conf

    logger.info(
        f"[predict] Dual-image raw species: {dual_species_raw} ({dual_sp_conf_raw:.2f})"
    )
    logger.info(
        f"[predict] Ensemble species: {dual_species} ({dual_sp_conf:.2f}) "
        f"[left={left_species}({left_sp_conf:.2f}), "
        f"right={right_species}({right_sp_conf:.2f}), "
        f"dual={dual_species_raw}({dual_sp_conf_raw:.2f})]"
    )

    # Update s2_result probabilities to reflect the ensemble for downstream use
    s2_result_ensemble = dict(s2_result)
    s2_result_ensemble["probabilities"] = ensemble_probs
    s2_result_ensemble["prediction_idx"] = ensemble_idx
    s2_result_ensemble["confidence"] = ensemble_conf
    s2_result_ensemble["method"] = s2_result.get("method", "single") + "+ensemble"

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 8 — Reject only if ensemble species confidence is too low
    # ═══════════════════════════════════════════════════════════════════════
    if dual_sp_conf < SPECIES_THRESHOLD:
        return _cache_and_return(_response(
            "unknown_species",
            f"Fish species could not be recognised confidently. "
            f"Ensemble species confidence was {dual_sp_conf:.0%}.",
            per_image_validation=piv,
            final_result="UNKNOWN SPECIES",
        ))

    # Supported species check (using authoritative dual-image species)
    if dual_species not in SUPPORTED_SPECIES:
        return _cache_and_return(_response(
            "unsupported_species",
            f"The species '{dual_species}' is not supported by the grading model.",
            per_image_validation=piv,
            final_result=f"UNSUPPORTED: {dual_species}",
        ))

    response = _response(
        "success",
        "Prediction completed successfully.",
        per_image_validation=piv,
        pair_validation={
            "matched": left_species == right_species,
            "left_label":      left_species,
            "left_confidence":  round(left_sp_conf, 4),
            "right_label":     right_species,
            "right_confidence": round(right_sp_conf, 4),
        },
        stage1={
            "label": s1_label,
            "confidence": s1_result["confidence"],
            "probabilities": {
                BINARY_LABELS[i]: float(p)
                for i, p in enumerate(s1_result["probabilities"])
            },
            "uncertainty": s1_result["uncertainty"],
            "method": s1_result["method"],
        },
        stage2={
            "label": dual_species,
            "confidence": s2_result_ensemble["confidence"],
            "probabilities": {
                SPECIES_LABELS[i]: float(p)
                for i, p in enumerate(s2_result_ensemble["probabilities"])
            },
            "uncertainty": s2_result.get("uncertainty", 0),
            "method": s2_result_ensemble["method"],
        },
        final_result=dual_species,
    )

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 9 — Grade classification (only for grade-supported species)
    # Uses dual_species (authoritative) for grading decision
    # ═══════════════════════════════════════════════════════════════════════
    if dual_species.lower() in [s.lower() for s in GRADE_SPECIES]:
        s3_result  = run_model(grade_session, left, right, use_tta=use_tta)
        grade      = GRADE_LABELS[s3_result["prediction_idx"]]
        grade_conf = s3_result["confidence"]

        response["stage3"] = {
            "label": grade,
            "confidence": grade_conf,
            "probabilities": {
                GRADE_LABELS[i]: float(p)
                for i, p in enumerate(s3_result["probabilities"])
            },
            "uncertainty": s3_result["uncertainty"],
            "method": s3_result["method"],
        }

        if grade_conf < FINAL_GRADE_THRESHOLD:
            response["status"]  = "low_confidence"
            response["message"] = (
                f"Grade prediction confidence ({grade_conf:.0%}) is below "
                f"the minimum threshold ({FINAL_GRADE_THRESHOLD:.0%})."
            )
            response["final_result"] = f"{dual_species} (grade uncertain)"
        else:
            response["final_result"] = f"{dual_species}_{grade}"
    else:
        response["stage3"] = {
            "label": "not_applicable",
            "reason": f"Grade classification only available for: {GRADE_SPECIES}",
        }
        response["status"] = "success_no_grade"

    # Additional uncertainty warnings
    if s1_result.get("uncertainty", 0) > 0.3:
        warnings.append(f"High uncertainty in fish detection: {s1_result['uncertainty']:.2f}")
    if s2_result.get("uncertainty", 0) > 0.3:
        warnings.append(f"High uncertainty in species classification: {s2_result['uncertainty']:.2f}")
    response["warnings"] = warnings

    return _cache_and_return(response)


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


@app.post("/predict/single")
async def predict_single(
    image: UploadFile = File(...),
    use_tta: bool = Query(USE_TTA, description="Use Test-Time Augmentation")
) -> Dict:
    """
    Single-image grading pipeline for internet-downloaded or user-uploaded fish photos.
    
    This endpoint is optimized for single images with relaxed thresholds:
    - Fish detection threshold: 0.60 (vs 0.80 for paired mode)
    - No pair validation checks
    - Returns same output format as /predict for consistency
    
    Ideal for:
    • Photos taken from a camera roll (single orientation)
    • Internet-downloaded fish images
    • Quick grading when paired images aren't available
    
    Returns the same response format as /predict but without per-image pair validation.
    """
    start_time = time.time()

    # ── Model check ───────────────────────────────────────────────────────
    if not all([fish_session, species_session, grade_session]):
        success, message = load_models()
        if not success:
            raise HTTPException(status_code=503, detail=f"Models not available: {message}")

    # ── File-type validation ──────────────────────────────────────────────
    ct = (image.content_type or '').lower()
    if ct in {'application/json', 'text/plain', 'text/html'}:
        raise HTTPException(status_code=400, detail=f"File {image.filename} is not an image")

    # ── Preprocess ────────────────────────────────────────────────────────
    try:
        img_array, img_quality = await preprocess_image(image, apply_enhancements=True)
    finally:
        await image.close()

    # Collect warnings
    warnings: List[str] = []
    if img_quality.get("is_screenshot"):
        warnings.append("Image appears to be a screenshot — results may be less accurate")
    if img_quality.get("quality_issues"):
        warnings.append(f"Image quality issues: {', '.join(img_quality['quality_issues'])}")

    # ── Helper: build response dict ───────────────────────────────────────
    def _response(status: str, message: str, **kw) -> Dict:
        resp = {
            "request_id": hashlib.md5(str(time.time()).encode()).hexdigest()[:8],
            "timestamp": datetime.now().isoformat(),
            "processing_time": round(time.time() - start_time, 3),
            "status": status,
            "message": message,
            "image_quality": img_quality,
            "warnings": warnings,
            "mode": "single_image",
        }
        resp.update(kw)
        return resp

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 1 — Fish detection (single-image mode, relaxed threshold 0.60)
    # ═══════════════════════════════════════════════════════════════════════
    SINGLE_IMAGE_FISH_THRESHOLD = 0.60  # Relaxed for internet images
    
    fish_result = run_single_image(fish_session, img_array, use_tta=False)
    fish_label = BINARY_LABELS[fish_result["prediction_idx"]]
    fish_confidence = fish_result["confidence"]
    fish_ok = fish_label == "fish" and fish_confidence >= SINGLE_IMAGE_FISH_THRESHOLD

    logger.info(
        f"[predict/single] Fish detection: {fish_label} "
        f"(confidence={fish_confidence:.4f}, threshold={SINGLE_IMAGE_FISH_THRESHOLD}, ok={fish_ok})"
    )

    # No fish detected
    if not fish_ok:
        return _response(
            "no_fish",
            f"No fish detected in the image (confidence {fish_confidence:.0%} < {SINGLE_IMAGE_FISH_THRESHOLD:.0%}).",
            final_result="NOT FISH",
            stage1={
                "label": fish_label,
                "confidence": fish_confidence,
                "probabilities": {
                    BINARY_LABELS[i]: float(p)
                    for i, p in enumerate(fish_result["probabilities"])
                },
            },
        )

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 2 — Species prediction (single image)
    # ═══════════════════════════════════════════════════════════════════════
    species_result = run_single_image(species_session, img_array, use_tta=use_tta)
    species_label = SPECIES_LABELS[species_result["prediction_idx"]]
    species_confidence = species_result["confidence"]

    logger.info(
        f"[predict/single] Species: {species_label} (confidence={species_confidence:.4f})"
    )

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 3 — Species confidence check
    # ═══════════════════════════════════════════════════════════════════════
    if species_confidence < SPECIES_THRESHOLD:
        return _response(
            "unknown_species",
            f"Fish species could not be recognised confidently "
            f"(confidence {species_confidence:.0%} < {SPECIES_THRESHOLD:.0%}).",
            final_result="UNKNOWN SPECIES",
            stage1={
                "label": fish_label,
                "confidence": fish_confidence,
                "probabilities": {
                    BINARY_LABELS[i]: float(p)
                    for i, p in enumerate(fish_result["probabilities"])
                },
            },
            stage2={
                "label": species_label,
                "confidence": species_confidence,
                "probabilities": {
                    SPECIES_LABELS[i]: float(p)
                    for i, p in enumerate(species_result["probabilities"])
                },
            },
        )

    # Supported species check
    if species_label not in SUPPORTED_SPECIES:
        return _response(
            "unsupported_species",
            f"The species '{species_label}' is not supported by the grading model.",
            final_result=f"UNSUPPORTED: {species_label}",
        )

    # Success response (fish + species recognized)
    response = _response(
        "success",
        "Single-image prediction completed successfully.",
        final_result=species_label,
        stage1={
            "label": fish_label,
            "confidence": fish_confidence,
            "probabilities": {
                BINARY_LABELS[i]: float(p)
                for i, p in enumerate(fish_result["probabilities"])
            },
            "uncertainty": fish_result.get("uncertainty", 0),
            "method": fish_result.get("method", "single"),
        },
        stage2={
            "label": species_label,
            "confidence": species_confidence,
            "probabilities": {
                SPECIES_LABELS[i]: float(p)
                for i, p in enumerate(species_result["probabilities"])
            },
            "uncertainty": species_result.get("uncertainty", 0),
            "method": species_result.get("method", "single"),
        },
    )

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 4 — Grade classification (for supported species)
    # ═══════════════════════════════════════════════════════════════════════
    if species_label.lower() in [s.lower() for s in GRADE_SPECIES]:
        grade_result = run_single_image(grade_session, img_array, use_tta=use_tta)
        grade = GRADE_LABELS[grade_result["prediction_idx"]]
        grade_confidence = grade_result["confidence"]

        logger.info(
            f"[predict/single] Grade: {grade} (confidence={grade_confidence:.4f})"
        )

        response["stage3"] = {
            "label": grade,
            "confidence": grade_confidence,
            "probabilities": {
                GRADE_LABELS[i]: float(p)
                for i, p in enumerate(grade_result["probabilities"])
            },
            "uncertainty": grade_result.get("uncertainty", 0),
            "method": grade_result.get("method", "single"),
        }

        if grade_confidence < FINAL_GRADE_THRESHOLD:
            response["status"] = "low_confidence"
            response["message"] = (
                f"Grade prediction confidence ({grade_confidence:.0%}) is below "
                f"the minimum threshold ({FINAL_GRADE_THRESHOLD:.0%})."
            )
            response["final_result"] = f"{species_label} (grade uncertain)"
        else:
            response["final_result"] = f"{species_label}_{grade}"
    else:
        response["stage3"] = {
            "label": "not_applicable",
            "reason": f"Grade classification only available for: {GRADE_SPECIES}",
        }
        response["status"] = "success_no_grade"

    # Uncertainty warnings
    if fish_result.get("uncertainty", 0) > 0.3:
        warnings.append(f"High uncertainty in fish detection: {fish_result['uncertainty']:.2f}")
    if species_result.get("uncertainty", 0) > 0.3:
        warnings.append(f"High uncertainty in species classification: {species_result['uncertainty']:.2f}")
    response["warnings"] = warnings

    return response


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
            "unknown_species": UNKNOWN_SPECIES_THRESHOLD,
            "per_image_fish": PER_IMAGE_FISH_THRESHOLD,
            "per_image_species": PER_IMAGE_SPECIES_THRESHOLD,
            "final_grade": FINAL_GRADE_THRESHOLD
        },
        "supported_species": SUPPORTED_SPECIES,
        "tta_enabled": USE_TTA,
        "model_paths": {
            "fish_detector": FISH_DETECTOR_ONNX,
            "species_classifier": SPECIES_CLASSIFIER_ONNX,
            "grade_classifier": GRADE_CLASSIFIER_ONNX
        }
    }


# ── /measure endpoint ──────────────────────────────────────────────────────────

@app.post("/measure")
async def measure(
    image: UploadFile = File(..., description="Fish photo. Include a ruler for accurate results."),
    species: Optional[str] = Query(
        None,
        description=(
            "Model label for weight estimation: "
            "'tuna' (Skipjack Tuna) or 'makerel' (Indian Scad). "
            "Omit to skip weight calculation."
        ),
    ),
    ruler_real_cm: float = Query(
        30.0,
        ge=1.0,
        le=200.0,
        description="Real-world length of the reference ruler in centimetres (default 30 cm).",
    ),
) -> Dict:
    """
    Measure fish length, width, and (optionally) weight from a single image.

    The image should contain:
    • The fish, ideally photographed from the side on a flat surface.
    • A reference ruler placed beside the fish for accurate pixel→cm calibration.
      If no ruler is detected the API falls back to an image-width estimate
      (confidence will be lower).

    Returns
    -------
    ```json
    {
      "length_cm":          48.20,
      "width_cm":            8.10,
      "weight_kg":           2.41,
      "pixel_length":       920.0,
      "pixel_width":        155.3,
      "ruler_pixel_length": 580.0,
      "ruler_strategy":     "colour_segmentation",
      "confidence":          0.85,
      "warnings":           []
    }
    ```
    `weight_kg` is `null` when `species` is not supplied or not supported.
    """
    if not MEASUREMENT_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail=(
                "Fish measurement service is unavailable. "
                "Install opencv-python-headless and restart the server."
            ),
        )

    # Validate content type
    content_type = (image.content_type or "").lower()
    allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/webp",
                     "image/heic", "image/heif", "image/bmp", "image/tiff"}
    if content_type and content_type not in allowed_types and not content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported content type '{content_type}'. Please upload an image file."
        )

    try:
        image_data = await image.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {exc}")
    finally:
        await image.close()

    if not image_data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        start = time.time()
        result = measure_fish(
            image_data=image_data,
            species=species,
            ruler_real_cm=ruler_real_cm,
        )
        elapsed = round(time.time() - start, 3)

        response = result.to_dict()
        response["processing_time"] = elapsed
        response["species"] = species
        response["ruler_real_cm"] = ruler_real_cm

        logger.info(
            f"[/measure] length={result.length_cm:.2f} cm, "
            f"weight={result.weight_kg} kg, "
            f"confidence={result.confidence}, "
            f"time={elapsed}s"
        )
        return response

    except Exception as exc:
        logger.error(f"[/measure] Unexpected error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Measurement failed: {exc}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)