# services/fish_measurement.py
# Computer-vision pipeline to estimate fish length, width, and weight from
# a single uploaded image (optimised for smartphone camera photos).
#
# Pipeline
# --------
# 1.  Load image bytes → BGR NumPy array (Pillow handles HEIC / EXIF rotation)
# 2.  Downsample large camera images to a 1024 px working resolution
# 3.  CLAHE contrast enhancement (helps with uneven field lighting)
# 4.  Detect reference ruler via HSV colour segmentation or Hough lines
#     — ruler mask is used to EXCLUDE the ruler from fish-contour candidates
# 5.  Background subtraction: Otsu threshold + adaptive threshold, merged
# 6.  Canny edges on the ruler-free mask → morphological gap-filling
# 7.  GrabCut seeded from the best Canny candidate to refine the fish outline
# 8.  Rank candidates by fish-likeness score (area, aspect ratio, solidity,
#     distance from ruler, centre weight) → best candidate is "the fish"
# 9.  PCA-based axis measurement:
#       • principal axis (largest eigenvalue) → fish LENGTH
#       • minor axis (smallest eigenvalue)    → fish WIDTH / girth
# 10. Convert pixel dimensions to centimetres using the ruler calibration
# 11. Apply species-specific L-W formula to estimate weight

from __future__ import annotations

import io
import logging
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────

# Working resolution: downscale before processing (speed + noise reduction)
WORK_MAX_DIM   = 1024
# Fish must occupy at least this fraction of the image area
MIN_FISH_AREA  = 0.02
# Fish must NOT occupy more than this (prevents background blobs)
MAX_FISH_AREA  = 0.90
# Minimum aspect ratio (length/width) a fish-like object must have
MIN_FISH_ASPECT = 1.8
# Maximum aspect ratio (very thin slivers are not fish)
MAX_FISH_ASPECT = 12.0
# Minimum contour solidity (area / convex-hull area) a fish should have
MIN_SOLIDITY   = 0.45

# ── Weight-formula registry ────────────────────────────────────────────────────

SPECIES_FORMULAS: Dict[str, Tuple[str, float, float]] = {
    # key: (display_name, a, b)  →  W = a × L^b   (W in kg, L in cm)
    "skipjack_tuna": ("Skipjack Tuna", 0.00000497, 3.39292),
    "indian_scad":   ("Indian Scad",   0.005975,   3.1680),
}

MODEL_LABEL_TO_KEY: Dict[str, str] = {
    "tuna":          "skipjack_tuna",
    "makerel":       "indian_scad",
    "skipjack_tuna": "skipjack_tuna",
    "indian_scad":   "indian_scad",
}


def calculate_fish_weight(species: str, length_cm: float) -> Optional[float]:
    """Return estimated weight in kg, or None for unknown species / bad input."""
    if not _is_valid(length_cm):
        return None
    key = MODEL_LABEL_TO_KEY.get(species.lower().strip())
    if key is None:
        return None
    _, a, b = SPECIES_FORMULAS[key]
    return round(a * (length_cm ** b), 4)


def _is_valid(v: float) -> bool:
    return isinstance(v, (int, float)) and np.isfinite(v) and v > 0


# ── Image loading & preprocessing ─────────────────────────────────────────────

def load_image_bgr(data: bytes) -> np.ndarray:
    """
    Load image bytes (JPEG / PNG / HEIC …) → BGR uint8 array.
    Applies EXIF rotation so portrait phone photos are upright.
    """
    pil_img = Image.open(io.BytesIO(data))
    pil_img = ImageOps.exif_transpose(pil_img)
    pil_img = pil_img.convert("RGB")
    rgb = np.asarray(pil_img, dtype=np.uint8)
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def _resize_for_processing(bgr: np.ndarray) -> Tuple[np.ndarray, float]:
    """
    Downsample to at most WORK_MAX_DIM on the longest side.

    Returns (resized_bgr, scale_factor).
    scale_factor < 1 means the image was shrunk; multiply pixel measurements
    by 1/scale_factor to get back to original-resolution pixels.
    (We do NOT need to do this — calibration is done on the resized image.)
    """
    h, w = bgr.shape[:2]
    max_dim = max(h, w)
    if max_dim <= WORK_MAX_DIM:
        return bgr, 1.0
    scale = WORK_MAX_DIM / max_dim
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    resized = cv2.resize(bgr, (new_w, new_h), interpolation=cv2.INTER_AREA)
    logger.info(f"[measure] Downsampled {w}×{h} → {new_w}×{new_h}")
    return resized, scale


def _enhance_contrast(gray: np.ndarray) -> np.ndarray:
    """CLAHE contrast enhancement — helps with uneven field / flash lighting."""
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    return clahe.apply(gray)


# ── Ruler detection ─────────────────────────────────────────────────────────

def _ruler_mask_by_color(bgr: np.ndarray) -> np.ndarray:
    """
    Return a binary mask of pixels that could belong to a coloured ruler.
    Covers yellow/orange, white, blue, and red rulers commonly found in
    fisheries fieldwork.
    """
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)

    # Yellow / orange  (hue 12-38°)
    m_yellow = cv2.inRange(hsv, np.array([12, 70, 70]),  np.array([38, 255, 255]))
    # White            (low saturation, high value)
    m_white  = cv2.inRange(hsv, np.array([0,   0, 160]), np.array([180, 45, 255]))
    # Blue / cyan      (hue 90-135°)
    m_blue   = cv2.inRange(hsv, np.array([90, 55, 55]),  np.array([135, 255, 255]))
    # Red              (hue wraps: 0-10° and 165-180°)
    m_red1   = cv2.inRange(hsv, np.array([0,  100, 80]), np.array([10,  255, 255]))
    m_red2   = cv2.inRange(hsv, np.array([165, 100, 80]), np.array([180, 255, 255]))

    mask = cv2.bitwise_or(m_yellow, m_white)
    mask = cv2.bitwise_or(mask, m_blue)
    mask = cv2.bitwise_or(mask, cv2.bitwise_or(m_red1, m_red2))

    # Morphological clean-up
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  k, iterations=1)
    return mask


def _best_ruler_contour(mask: np.ndarray) -> Optional[np.ndarray]:
    """
    From a colour mask, return the most ruler-like contour (long & thin).
    A ruler must have aspect ratio ≥ 4 and occupy < 40 % of image area.
    """
    h, w = mask.shape
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    best: Optional[np.ndarray] = None
    best_score: float = 0.0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 200:
            continue
        rect = cv2.minAreaRect(cnt)
        rw, rh = rect[1]
        if rw == 0 or rh == 0:
            continue
        long_side  = max(rw, rh)
        short_side = min(rw, rh)
        aspect = long_side / short_side
        if aspect < 4.0:
            continue
        if area > h * w * 0.40:   # ruler can't fill nearly the whole frame
            continue
        score = aspect * long_side
        if score > best_score:
            best_score = score
            best = cnt
    return best


def _ruler_pixel_length_by_hough(gray: np.ndarray) -> Optional[float]:
    """
    Detect the ruler pixel length from Hough lines when no colour ruler found.
    Returns the longest near-axis-aligned line, or None.
    """
    _, w = gray.shape
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges   = cv2.Canny(blurred, 50, 150, apertureSize=3)
    min_len = int(w * 0.18)
    lines   = cv2.HoughLinesP(edges, 1, np.pi / 180,
                               threshold=60, minLineLength=min_len, maxLineGap=12)
    if lines is None:
        return None
    best: float = 0.0
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = abs(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
        if angle <= 15 or angle >= 75:   # near-horizontal or near-vertical
            length = float(np.hypot(x2 - x1, y2 - y1))
            if length > best:
                best = length
    return best if best > 20 else None


def detect_ruler(
    bgr: np.ndarray,
    gray: np.ndarray,
) -> Tuple[Optional[float], str, Optional[np.ndarray]]:
    """
    Try ruler-detection strategies in priority order.

    Returns
    -------
    (pixel_length, strategy_name, ruler_contour_or_None)
    pixel_length is None when detection fails (fallback is applied by the caller).
    ruler_contour is used to mask out the ruler before fish detection.
    """
    ruler_mask = _ruler_mask_by_color(bgr)
    ruler_cnt  = _best_ruler_contour(ruler_mask)

    if ruler_cnt is not None:
        rect = cv2.minAreaRect(ruler_cnt)
        px   = float(max(rect[1]))
        if px > 20:
            logger.info(f"[measure] Ruler via colour: {px:.1f} px")
            return px, "colour_segmentation", ruler_cnt

    px = _ruler_pixel_length_by_hough(gray)
    if px:
        logger.info(f"[measure] Ruler via Hough lines: {px:.1f} px")
        return px, "hough_lines", None

    logger.warning("[measure] No ruler detected — image-width fallback will be used")
    return None, "none", None


# ── Fish-likeness scoring ──────────────────────────────────────────────────────

def _fish_score(cnt: np.ndarray, img_h: int, img_w: int) -> float:
    """
    Heuristic score (higher = more fish-like).
    Criteria: area in valid range, elongated shape, high solidity, central position.
    Returns 0 for disqualified contours.
    """
    area = cv2.contourArea(cnt)
    img_area = img_h * img_w
    area_frac = area / img_area

    if area_frac < MIN_FISH_AREA or area_frac > MAX_FISH_AREA:
        return 0.0

    rect = cv2.minAreaRect(cnt)
    rw, rh = rect[1]
    if rw == 0 or rh == 0:
        return 0.0
    long_side  = max(rw, rh)
    short_side = min(rw, rh)
    aspect = long_side / short_side

    if aspect < MIN_FISH_ASPECT or aspect > MAX_FISH_ASPECT:
        return 0.0

    hull  = cv2.convexHull(cnt)
    hull_area = cv2.contourArea(hull)
    solidity = area / hull_area if hull_area > 0 else 0.0
    if solidity < MIN_SOLIDITY:
        return 0.0

    # Centre weight: reward contours whose centroid is near the image centre
    M = cv2.moments(cnt)
    if M["m00"] == 0:
        return 0.0
    cx = M["m10"] / M["m00"] / img_w
    cy = M["m01"] / M["m00"] / img_h
    centre_dist = np.hypot(cx - 0.5, cy - 0.5)   # 0 = perfect centre
    centre_score = max(0.0, 1.0 - centre_dist * 2)

    score = area_frac * aspect * solidity * (1.0 + centre_score)
    return score


# ── Fish contour detection ─────────────────────────────────────────────────────

def find_fish_contour(
    gray: np.ndarray,
    bgr: np.ndarray,
    ruler_cnt: Optional[np.ndarray],
) -> Optional[np.ndarray]:
    """
    Detect and return the fish contour.

    Improvements over the previous version
    ───────────────────────────────────────
    • The ruler contour (if detected) is painted black before edge detection
      so it cannot be confused with the fish.
    • Otsu + adaptive thresholding merged with Canny provides better
      segmentation on camera images with complex backgrounds.
    • Candidates are ranked by a fish-likeness score (not just area).
    • GrabCut is seeded from the best Canny candidate rather than a fixed
      centre rectangle, so it works regardless of how the fish is framed.
    """
    h, w = gray.shape

    # ── Build ruler exclusion mask ──────────────────────────────────────────
    ruler_excl = np.zeros_like(gray)
    if ruler_cnt is not None:
        cv2.drawContours(ruler_excl, [ruler_cnt], -1, 255, -1)
        # Dilate slightly to cover ruler edges
        k = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
        ruler_excl = cv2.dilate(ruler_excl, k, iterations=2)

    # Paint ruler area out of the working images
    bgr_clean  = bgr.copy()
    gray_clean = gray.copy()
    if ruler_excl.any():
        # Fill ruler with its immediate neighbourhood median colour so
        # Canny doesn't fire on the ruler edge
        bgr_clean[ruler_excl > 0]  = np.array([128, 128, 128], dtype=np.uint8)
        gray_clean[ruler_excl > 0] = 128

    # ── CLAHE on cleaned gray ──────────────────────────────────────────────
    enhanced = _enhance_contrast(gray_clean)

    # ── Otsu binary threshold ──────────────────────────────────────────────
    blurred_otsu  = cv2.GaussianBlur(enhanced, (7, 7), 0)
    _, otsu_mask  = cv2.threshold(blurred_otsu, 0, 255,
                                   cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # ── Adaptive threshold (handles shadows on the fish body) ─────────────
    blurred_adap  = cv2.GaussianBlur(enhanced, (5, 5), 0)
    adap_mask     = cv2.adaptiveThreshold(blurred_adap, 255,
                                           cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                           cv2.THRESH_BINARY_INV, 21, 5)

    # ── Canny edges ────────────────────────────────────────────────────────
    blurred_canny = cv2.GaussianBlur(enhanced, (7, 7), 0)
    edges         = cv2.Canny(blurred_canny, 25, 80)

    # ── Merge all three signal sources ────────────────────────────────────
    combined = cv2.bitwise_or(otsu_mask, adap_mask)
    combined = cv2.bitwise_or(combined, edges)

    # Remove ruler pixels
    if ruler_excl.any():
        combined[ruler_excl > 0] = 0

    # Fill small holes and join nearby edges
    k_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    k_open  = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, k_close, iterations=3)
    combined = cv2.morphologyEx(combined, cv2.MORPH_OPEN,  k_open,  iterations=2)
    combined = cv2.dilate(combined, k_open, iterations=1)

    # ── Find and rank candidates ───────────────────────────────────────────
    contours_raw, _ = cv2.findContours(combined, cv2.RETR_EXTERNAL,
                                        cv2.CHAIN_APPROX_SIMPLE)
    candidates = [
        (cnt, _fish_score(cnt, h, w))
        for cnt in contours_raw
        if _fish_score(cnt, h, w) > 0
    ]

    if not candidates:
        # Relax: just take the largest contour that is not the ruler
        all_valid = [c for c in contours_raw
                     if cv2.contourArea(c) > h * w * 0.01]
        if not all_valid:
            return None
        return max(all_valid, key=cv2.contourArea)

    # Sort by score descending; pick the best candidate
    candidates.sort(key=lambda x: x[1], reverse=True)
    best_cnt = candidates[0][0]

    # ── Refine with GrabCut seeded from best candidate ─────────────────────
    try:
        # Build a tight bounding rect around the best candidate
        bx, by, bw, bh = cv2.boundingRect(best_cnt)
        # Add 5 % padding so GrabCut has some background context
        pad_x = max(5, int(bw * 0.05))
        pad_y = max(5, int(bh * 0.05))
        gx    = max(0, bx - pad_x)
        gy    = max(0, by - pad_y)
        gw    = min(w - gx, bw + 2 * pad_x)
        gh    = min(h - gy, bh + 2 * pad_y)

        if gw > 10 and gh > 10:
            gc_mask   = np.zeros((h, w), np.uint8)
            bgd_model = np.zeros((1, 65), np.float64)
            fgd_model = np.zeros((1, 65), np.float64)
            cv2.grabCut(bgr_clean, gc_mask, (gx, gy, gw, gh),
                        bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
            fg = np.where(
                (gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 255, 0
            ).astype(np.uint8)
            # Remove ruler from GrabCut result
            if ruler_excl.any():
                fg[ruler_excl > 0] = 0
            gc_cnts, _ = cv2.findContours(fg, cv2.RETR_EXTERNAL,
                                           cv2.CHAIN_APPROX_SIMPLE)
            gc_valid = [(c, _fish_score(c, h, w)) for c in gc_cnts
                        if _fish_score(c, h, w) > 0]
            if gc_valid:
                gc_valid.sort(key=lambda x: x[1], reverse=True)
                gc_best = gc_valid[0][0]
                # Only prefer GrabCut result if it has a better score
                if gc_valid[0][1] >= candidates[0][1] * 0.8:
                    logger.info("[measure] GrabCut refinement accepted")
                    best_cnt = gc_best
    except Exception as exc:
        logger.debug(f"[measure] GrabCut skipped: {exc}")

    return best_cnt


# ── PCA-based contour measurement ─────────────────────────────────────────────

def measure_contour(contour: np.ndarray) -> Tuple[float, float]:
    """
    Compute fish LENGTH and WIDTH using PCA on contour pixel coordinates.

    Why PCA instead of minAreaRect
    ───────────────────────────────
    minAreaRect simply finds the tightest-fitting rectangle — it can confuse
    width and height when the fish is at a 45° angle.  PCA finds the actual
    principal axis of the blob (body axis of the fish = length) and the
    perpendicular axis (girth = width).

    Returns
    -------
    (pixel_length, pixel_width) — length is always ≥ width.
    """
    # All (x, y) pixel coordinates of the contour points
    pts = contour.reshape(-1, 2).astype(np.float32)

    # ── PCA ──────────────────────────────────────────────────────────────
    mean, eigenvectors = cv2.PCACompute(pts, mean=np.array([]))
    # eigenvectors[0] = principal axis (largest variance = length direction)
    # eigenvectors[1] = minor axis     (smallest variance = width direction)

    # Project all points onto both axes and measure the span
    projected = cv2.PCAProject(pts, mean, eigenvectors)
    pca_length = float(projected[:, 0].max() - projected[:, 0].min())
    pca_width  = float(projected[:, 1].max() - projected[:, 1].min())

    # ── Cross-check with oriented bounding box ────────────────────────────
    rect          = cv2.minAreaRect(contour)
    obb_long_side  = float(max(rect[1]))
    obb_short_side = float(min(rect[1]))

    # Use the larger of PCA-length vs OBB long side (PCA can under-estimate for
    # very curved contours; OBB over-estimates for deeply cupped shapes)
    pixel_length = max(pca_length, obb_long_side)
    # Width: use PCA width unless OBB short side is meaningfully larger
    pixel_width  = max(pca_width, obb_short_side * 0.85)

    # Guarantee length > width (swap if the fish contour is nearly square)
    if pixel_width > pixel_length:
        pixel_length, pixel_width = pixel_width, pixel_length

    logger.debug(
        f"[measure] PCA length={pca_length:.1f}, OBB long={obb_long_side:.1f} "
        f"→ length={pixel_length:.1f}  "
        f"PCA width={pca_width:.1f}, OBB short={obb_short_side:.1f} "
        f"→ width={pixel_width:.1f}"
    )
    return pixel_length, pixel_width


# ── Pixel → cm conversion ─────────────────────────────────────────────────────

def pixel_to_cm(pixels: float, ruler_pixel_length: float, ruler_real_cm: float) -> float:
    """
    length_cm = (fish_pixel_length / ruler_pixel_length) × ruler_real_cm
    """
    if ruler_pixel_length <= 0:
        raise ValueError("ruler_pixel_length must be > 0")
    return (pixels / ruler_pixel_length) * ruler_real_cm


# ── Confidence score ──────────────────────────────────────────────────────────

def _compute_confidence(
    fish_area_ratio: float,
    ruler_strategy: str,
    has_fish: bool,
    fish_aspect: float,
) -> float:
    """
    Heuristic confidence in [0, 1].  Penalised for:
    • No ruler detected       → −0.35
    • Hough-line ruler only   → −0.10
    • Fish area < 4 %         → −0.20
    • Aspect ratio < 2.0      → −0.15  (nearly round → probably misdetected)
    """
    if not has_fish:
        return 0.0

    c = 0.95

    if ruler_strategy == "none":
        c -= 0.35
    elif ruler_strategy == "hough_lines":
        c -= 0.10

    if fish_area_ratio < 0.04:
        c -= 0.20
    elif fish_area_ratio > 0.88:
        c -= 0.10

    if fish_aspect < 2.0:
        c -= 0.15

    return max(0.0, round(c, 2))


# ── Main result class ─────────────────────────────────────────────────────────

class MeasurementResult:
    """Structured result from the measurement pipeline."""

    def __init__(
        self,
        length_cm: float,
        width_cm: float,
        weight_kg: Optional[float],
        pixel_length: float,
        pixel_width: float,
        ruler_pixel_length: Optional[float],
        ruler_strategy: str,
        confidence: float,
        warnings: List[str],
    ):
        self.length_cm          = length_cm
        self.width_cm           = width_cm
        self.weight_kg          = weight_kg
        self.pixel_length       = pixel_length
        self.pixel_width        = pixel_width
        self.ruler_pixel_length = ruler_pixel_length
        self.ruler_strategy     = ruler_strategy
        self.confidence         = confidence
        self.warnings           = warnings

    def to_dict(self) -> Dict:
        return {
            "length_cm":          round(self.length_cm, 2),
            "width_cm":           round(self.width_cm, 2),
            "weight_kg":          self.weight_kg,
            "pixel_length":       round(self.pixel_length, 1),
            "pixel_width":        round(self.pixel_width, 1),
            "ruler_pixel_length": (round(self.ruler_pixel_length, 1)
                                   if self.ruler_pixel_length else None),
            "ruler_strategy":     self.ruler_strategy,
            "confidence":         self.confidence,
            "warnings":           self.warnings,
        }


# ── Main pipeline ─────────────────────────────────────────────────────────────

def measure_fish(
    image_data: bytes,
    species: Optional[str] = None,
    ruler_real_cm: float   = 30.0,
) -> MeasurementResult:
    """
    Full measurement pipeline.

    Parameters
    ----------
    image_data    : raw bytes of the uploaded image (any format Pillow supports).
    species       : optional model label (``"tuna"`` / ``"makerel"``) for weight.
    ruler_real_cm : real-world length of the reference ruler in cm (default 30).

    Returns
    -------
    :class:`MeasurementResult`
    """
    warnings_list: List[str] = []

    # ── 1. Load ────────────────────────────────────────────────────────────────
    bgr_orig = load_image_bgr(image_data)
    orig_h, orig_w = bgr_orig.shape[:2]
    logger.info(f"[measure] Original image: {orig_w}×{orig_h}")

    # ── 2. Resize to working resolution ───────────────────────────────────────
    bgr, _scale = _resize_for_processing(bgr_orig)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    img_h, img_w = gray.shape

    # ── 3. Detect ruler ────────────────────────────────────────────────────────
    ruler_px, ruler_strategy, ruler_cnt = detect_ruler(bgr, gray)

    if ruler_px is None:
        # Conservative fallback: assume ruler spans ~40 % of the longer edge
        ruler_px = max(img_w, img_h) * 0.40
        warnings_list.append(
            "No reference ruler detected. Place a clearly visible ruler "
            "alongside the fish for accurate measurements. "
            "Falling back to image-size estimate — result accuracy is low."
        )

    # ── 4. Detect fish contour (ruler-aware) ───────────────────────────────────
    contour = find_fish_contour(gray, bgr, ruler_cnt)

    if contour is None:
        warnings_list.append(
            "Could not isolate a clear fish outline. "
            "Ensure the fish is well-lit, in focus, and on a contrasting background."
        )
        return MeasurementResult(
            length_cm=0.0, width_cm=0.0, weight_kg=None,
            pixel_length=0.0, pixel_width=0.0,
            ruler_pixel_length=ruler_px,
            ruler_strategy=ruler_strategy,
            confidence=0.0,
            warnings=warnings_list,
        )

    # ── 5. Measure via PCA ────────────────────────────────────────────────────
    pixel_length, pixel_width = measure_contour(contour)
    fish_area   = float(cv2.contourArea(contour))
    area_ratio  = fish_area / (img_h * img_w)
    fish_aspect = pixel_length / pixel_width if pixel_width > 0 else 1.0

    logger.info(
        f"[measure] Fish: length={pixel_length:.1f} px, width={pixel_width:.1f} px, "
        f"aspect={fish_aspect:.2f}, area_ratio={area_ratio:.3f}"
    )

    # ── 6. Pixel → cm ──────────────────────────────────────────────────────────
    length_cm = pixel_to_cm(pixel_length, ruler_px, ruler_real_cm)
    width_cm  = pixel_to_cm(pixel_width,  ruler_px, ruler_real_cm)

    if length_cm > 200:
        warnings_list.append(
            f"Estimated length {length_cm:.1f} cm is unusually large — "
            "check that the ruler is the correct length."
        )
    if length_cm < 3:
        warnings_list.append(
            f"Estimated length {length_cm:.1f} cm is very small — "
            "the fish may not have been detected correctly."
        )

    # ── 7. Weight estimation ───────────────────────────────────────────────────
    weight_kg: Optional[float] = None
    if species:
        weight_kg = calculate_fish_weight(species, length_cm)
        if weight_kg is None:
            warnings_list.append(
                f"Species '{species}' is not supported for weight estimation. "
                "Supported labels: 'tuna' (Skipjack Tuna), 'makerel' (Indian Scad)."
            )

    # ── 8. Confidence ──────────────────────────────────────────────────────────
    confidence = _compute_confidence(area_ratio, ruler_strategy,
                                     contour is not None, fish_aspect)

    return MeasurementResult(
        length_cm=length_cm,
        width_cm=width_cm,
        weight_kg=weight_kg,
        pixel_length=pixel_length,
        pixel_width=pixel_width,
        ruler_pixel_length=ruler_px,
        ruler_strategy=ruler_strategy,
        confidence=confidence,
        warnings=warnings_list,
    )
