import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageTk, ImageEnhance, ImageFilter
import os
import time
import hashlib
from datetime import datetime

# --------------------------------------------------
# CONFIG
# --------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Try different possible model names
possible_model_names = [
    ("fish_detector_1.onnx", "best_binary_model.onnx", "stage1_model.onnx"),
    ("species_classifier_1.onnx", "best_species_model.onnx", "stage2_model.onnx"),
    ("grade_classifier_1.onnx", "best_grade_model.onnx", "stage3_model.onnx")
]

def find_model_file(base_names):
    """Find first existing model file from list of possible names"""
    for name in base_names:
        path = os.path.join(SCRIPT_DIR, name)
        if os.path.exists(path):
            return path
    return os.path.join(SCRIPT_DIR, base_names[0])  # Return first as default

FISH_DETECTOR_ONNX = find_model_file(possible_model_names[0])
SPECIES_CLASSIFIER_ONNX = find_model_file(possible_model_names[1])
GRADE_CLASSIFIER_ONNX = find_model_file(possible_model_names[2])

IMG_SIZE = 224

# Adjustable thresholds - LOWERED for internet images
FISH_THRESHOLD = 0.60  # Lowered from 0.70
SPECIES_THRESHOLD = 0.45  # Lowered from 0.50
GRADE_THRESHOLD = 0.45
UNKNOWN_SPECIES_THRESHOLD = 0.30  # Below this, mark as unknown

# Enable test-time augmentation
USE_TTA = True
TTA_AUGMENTATIONS = 3

BINARY_LABELS = {
    0: "fish",
    1: "non_fish"
}

# Update this list to match your actual species training order
SPECIES_LABELS = {
    0: "flyingfish",
    1: "graymullet",
    2: "makerel",
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


def softmax(x: np.ndarray) -> np.ndarray:
    x = x - np.max(x, axis=1, keepdims=True)
    e = np.exp(x)
    return e / np.sum(e, axis=1, keepdims=True)


def assess_image_quality(img: Image.Image) -> dict:
    """Assess image quality to help with internet/downloaded images"""
    width, height = img.size
    aspect_ratio = max(width/height, height/width)
    
    # Convert to grayscale
    gray = img.convert('L')
    np_gray = np.array(gray)
    
    # Calculate brightness and contrast
    brightness = np.mean(np_gray) / 255.0
    contrast = np.std(np_gray) / 255.0
    
    # Simple sharpness estimate (variance of laplacian approximation)
    from scipy import ndimage
    try:
        laplacian = ndimage.laplace(np_gray)
        sharpness = np.var(laplacian)
    except:
        sharpness = contrast * 100  # Fallback
    
    # Check if image might be a screenshot
    is_screenshot = sharpness < 100 and contrast > 0.3
    
    quality_issues = []
    if width < 100 or height < 100:
        quality_issues.append("very_small")
    if aspect_ratio > 3.0:
        quality_issues.append("extreme_aspect_ratio")
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


def apply_tta_augmentations(img_array: np.ndarray) -> list:
    """Create multiple augmented views for Test-Time Augmentation"""
    augmented = [img_array]  # Original
    
    # Horizontal flip
    flipped = np.flip(img_array, axis=3)
    augmented.append(flipped)
    
    # Slight brightness variations
    for factor in [0.9, 1.1]:
        bright = img_array * factor
        bright = np.clip(bright, -2.5, 2.5)
        augmented.append(bright)
    
    return augmented[:TTA_AUGMENTATIONS]


class MultiStageFishPredictor:
    def __init__(self, root):
        self.root = root
        self.root.title("Multi-Stage Fish Classifier - Enhanced for Internet Images")
        self.root.geometry("1000x800")

        self.left_path = None
        self.right_path = None
        self.prediction_history = []

        self.fish_session = None
        self.species_session = None
        self.grade_session = None

        # Settings
        self.use_tta = tk.BooleanVar(value=USE_TTA)
        self.fish_threshold = tk.DoubleVar(value=FISH_THRESHOLD)
        self.species_threshold = tk.DoubleVar(value=SPECIES_THRESHOLD)
        self.grade_threshold = tk.DoubleVar(value=GRADE_THRESHOLD)

        self.load_models()
        self.create_widgets()

    def load_models(self):
        try:
            missing = []
            for p in [FISH_DETECTOR_ONNX, SPECIES_CLASSIFIER_ONNX, GRADE_CLASSIFIER_ONNX]:
                if not os.path.exists(p):
                    missing.append(p)
            
            if missing:
                warning_msg = "Some model files not found:\n" + "\n".join(missing)
                warning_msg += "\n\nUsing first available models. Some features may be limited."
                print(warning_msg)
            
            # Load available models
            if os.path.exists(FISH_DETECTOR_ONNX):
                self.fish_session = ort.InferenceSession(FISH_DETECTOR_ONNX, providers=["CPUExecutionProvider"])
            
            if os.path.exists(SPECIES_CLASSIFIER_ONNX):
                self.species_session = ort.InferenceSession(SPECIES_CLASSIFIER_ONNX, providers=["CPUExecutionProvider"])
            
            if os.path.exists(GRADE_CLASSIFIER_ONNX):
                self.grade_session = ort.InferenceSession(GRADE_CLASSIFIER_ONNX, providers=["CPUExecutionProvider"])
            
            self.models_loaded = any([self.fish_session, self.species_session, self.grade_session])
            self.model_error = "" if self.models_loaded else "No models could be loaded"
            
        except Exception as e:
            self.models_loaded = False
            self.model_error = str(e)

    def preprocess(self, path: str, apply_enhancements: bool = True) -> tuple:
        """Preprocess image with optional enhancements"""
        img = Image.open(path).convert("RGB")
        
        # Assess quality
        quality_info = assess_image_quality(img)
        
        # Apply enhancements for internet images
        if apply_enhancements and quality_info.get("is_screenshot", False):
            img = enhance_for_internet_image(img)
        
        img = img.resize((IMG_SIZE, IMG_SIZE), Image.BILINEAR)

        arr = np.asarray(img).astype(np.float32) / 255.0
        arr = (arr - MEAN) / STD
        arr = np.transpose(arr, (2, 0, 1))
        arr = np.expand_dims(arr, 0)

        return arr.astype(np.float32), quality_info

    def run_model_tta(self, session, left, right):
        """Run inference with Test-Time Augmentation"""
        try:
            left_views = apply_tta_augmentations(left)
            right_views = apply_tta_augmentations(right)
            
            all_probs = []
            
            for left_view, right_view in zip(left_views, right_views):
                logits = session.run(None, {"left": left_view, "right": right_view})[0]
                probs = softmax(logits)[0]
                all_probs.append(probs)
            
            avg_probs = np.mean(all_probs, axis=0)
            std_probs = np.std(all_probs, axis=0)
            uncertainty = float(np.mean(std_probs))
            
            pred_idx = int(np.argmax(avg_probs))
            confidence = float(avg_probs[pred_idx])
            
            return pred_idx, confidence, avg_probs, uncertainty
            
        except Exception as e:
            print(f"TTA error: {e}, falling back to single inference")
            logits = session.run(None, {"left": left, "right": right})[0]
            probs = softmax(logits)[0]
            pred_idx = int(np.argmax(probs))
            confidence = float(probs[pred_idx])
            return pred_idx, confidence, probs, 1.0

    def run_model(self, session, left, right):
        """Run inference with optional TTA"""
        if self.use_tta.get() and session is not None:
            return self.run_model_tta(session, left, right)
        else:
            logits = session.run(None, {"left": left, "right": right})[0]
            probs = softmax(logits)[0]
            pred_idx = int(np.argmax(probs))
            confidence = float(probs[pred_idx])
            return pred_idx, confidence, probs, 0.0

    def create_widgets(self):
        # Top status bar
        top = tk.Frame(self.root)
        top.pack(fill=tk.X, padx=10, pady=5)

        if self.models_loaded:
            status_text = "✓ Models loaded"
            if not self.fish_session:
                status_text += " (Fish detector missing)"
            if not self.species_session:
                status_text += " (Species classifier missing)"
            if not self.grade_session:
                status_text += " (Grade classifier missing)"
            tk.Label(top, text=status_text, fg="green", font=("Arial", 11, "bold")).pack(side=tk.LEFT)
        else:
            tk.Label(top, text=f"✗ Model load failed: {self.model_error}", fg="red", font=("Arial", 11, "bold")).pack(side=tk.LEFT)

        # Settings panel
        settings_frame = tk.Frame(top)
        settings_frame.pack(side=tk.RIGHT)
        
        tk.Checkbutton(settings_frame, text="Use TTA", variable=self.use_tta).pack(side=tk.LEFT, padx=5)
        
        tk.Label(settings_frame, text="Fish Thresh:").pack(side=tk.LEFT)
        tk.Scale(settings_frame, from_=0.1, to=0.9, resolution=0.05, 
                orient=tk.HORIZONTAL, variable=self.fish_threshold, length=100).pack(side=tk.LEFT)
        
        # Main panels
        main = tk.Frame(self.root)
        main.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        left_panel = tk.Frame(main)
        left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=10)

        right_panel = tk.Frame(main)
        right_panel.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10)

        # Image selection buttons
        tk.Button(left_panel, text="Select LEFT Image", command=self.pick_left, 
                 width=20, bg="lightblue").pack(pady=5)
        tk.Button(left_panel, text="Select RIGHT Image", command=self.pick_right, 
                 width=20, bg="lightblue").pack(pady=5)
        tk.Button(left_panel, text="TEST MODEL", command=self.predict, 
                 width=20, bg="green", fg="white").pack(pady=10)
        tk.Button(left_panel, text="Clear All", command=self.clear_all, 
                 width=20, bg="orange").pack(pady=5)

        # Image previews
        self.left_preview = tk.Label(left_panel, text="Left preview", bg="gray", width=20, height=10)
        self.left_preview.pack(pady=5)

        self.right_preview = tk.Label(left_panel, text="Right preview", bg="gray", width=20, height=10)
        self.right_preview.pack(pady=5)

        # File info
        self.left_lbl = tk.Label(left_panel, text="Left: (not selected)", wraplength=220, justify=tk.LEFT)
        self.left_lbl.pack(fill=tk.X, pady=2)

        self.right_lbl = tk.Label(left_panel, text="Right: (not selected)", wraplength=220, justify=tk.LEFT)
        self.right_lbl.pack(fill=tk.X, pady=2)

        # Results area
        tk.Label(right_panel, text="Prediction Results", font=("Arial", 15, "bold")).pack(pady=5)

        self.status = tk.Label(right_panel, text="Select left and right images", fg="blue", font=("Arial", 12))
        self.status.pack(pady=5)

        result_box = tk.Frame(right_panel, relief=tk.GROOVE, bd=2)
        result_box.pack(fill=tk.X, pady=5)

        self.final_result = tk.Label(result_box, text="No prediction yet", font=("Arial", 18, "bold"))
        self.final_result.pack(pady=10)

        # Stage results
        self.stage1_label = tk.Label(result_box, text="Stage 1: -", font=("Arial", 11))
        self.stage1_label.pack()

        self.stage2_label = tk.Label(result_box, text="Stage 2: -", font=("Arial", 11))
        self.stage2_label.pack()

        self.stage3_label = tk.Label(result_box, text="Stage 3: -", font=("Arial", 11))
        self.stage3_label.pack()

        # Image quality info
        self.quality_label = tk.Label(result_box, text="", font=("Arial", 10), fg="gray")
        self.quality_label.pack()

        # Notebook for details
        notebook = ttk.Notebook(right_panel)
        notebook.pack(fill=tk.BOTH, expand=True, pady=5)

        details_frame = tk.Frame(notebook)
        notebook.add(details_frame, text="Details")

        self.details = tk.Text(details_frame, wrap=tk.WORD)
        self.details.pack(fill=tk.BOTH, expand=True)

        probs_frame = tk.Frame(notebook)
        notebook.add(probs_frame, text="Probabilities")

        self.probs_text = tk.Text(probs_frame, wrap=tk.WORD)
        self.probs_text.pack(fill=tk.BOTH, expand=True)

        history_frame = tk.Frame(notebook)
        notebook.add(history_frame, text="History")

        self.history_text = tk.Text(history_frame, wrap=tk.WORD)
        self.history_text.pack(fill=tk.BOTH, expand=True)

    def update_preview(self, label, path):
        if path and os.path.exists(path):
            img = Image.open(path)
            img.thumbnail((160, 160))
            photo = ImageTk.PhotoImage(img)
            label.config(image=photo, text="")
            label.image = photo

    def pick_left(self):
        path = filedialog.askopenfilename(
            title="Select LEFT image",
            filetypes=[("Images", "*.jpg *.jpeg *.png *.JPG *.JPEG *.PNG *.heic *.HEIC")]
        )
        if path:
            self.left_path = path
            self.left_lbl.config(text=f"Left: {os.path.basename(path)}")
            self.update_preview(self.left_preview, path)

    def pick_right(self):
        path = filedialog.askopenfilename(
            title="Select RIGHT image",
            filetypes=[("Images", "*.jpg *.jpeg *.png *.JPG *.JPEG *.PNG *.heic *.HEIC")]
        )
        if path:
            self.right_path = path
            self.right_lbl.config(text=f"Right: {os.path.basename(path)}")
            self.update_preview(self.right_preview, path)

    def clear_all(self):
        self.left_path = None
        self.right_path = None
        self.left_lbl.config(text="Left: (not selected)")
        self.right_lbl.config(text="Right: (not selected)")
        self.left_preview.config(image="", text="Left preview", bg="gray")
        self.right_preview.config(image="", text="Right preview", bg="gray")
        self.final_result.config(text="No prediction yet", fg="black")
        self.status.config(text="Cleared")
        self.stage1_label.config(text="Stage 1: -")
        self.stage2_label.config(text="Stage 2: -")
        self.stage3_label.config(text="Stage 3: -")
        self.quality_label.config(text="")
        self.details.delete("1.0", tk.END)
        self.probs_text.delete("1.0", tk.END)

    def predict(self):
        if not self.models_loaded:
            messagebox.showerror("Error", f"Models not loaded:\n{self.model_error}")
            return

        if not self.left_path or not self.right_path:
            messagebox.showerror("Error", "Please select both left and right images.")
            return

        try:
            # Preprocess with quality assessment
            left, left_quality = self.preprocess(self.left_path, apply_enhancements=True)
            right, right_quality = self.preprocess(self.right_path, apply_enhancements=True)

            self.details.delete("1.0", tk.END)
            self.probs_text.delete("1.0", tk.END)

            # Show quality info
            quality_text = f"Left: {left_quality['width']}x{left_quality['height']}"
            if left_quality['is_screenshot']:
                quality_text += " (screenshot)"
            if left_quality['quality_issues']:
                quality_text += f" Issues: {', '.join(left_quality['quality_issues'])}"
            self.quality_label.config(text=quality_text)

            # --------------------------
            # Stage 1: Fish / Non-Fish
            # --------------------------
            if self.fish_session is None:
                self.details.insert(tk.END, "ERROR: Fish detector model not loaded\n")
                return

            s1_idx, s1_conf, s1_probs, s1_uncertainty = self.run_model(self.fish_session, left, right)
            s1_label = BINARY_LABELS[s1_idx]

            # Adjust threshold for screenshots
            current_threshold = self.fish_threshold.get()
            if left_quality['is_screenshot'] or right_quality['is_screenshot']:
                current_threshold = max(0.5, current_threshold - 0.1)

            self.stage1_label.config(
                text=f"Stage 1: {s1_label} ({s1_conf:.2%}) [uncertainty: {s1_uncertainty:.3f}]"
            )

            self.probs_text.insert(tk.END, "STAGE 1 - Fish Detector\n")
            for i, p in enumerate(s1_probs):
                self.probs_text.insert(tk.END, f"  {BINARY_LABELS[i]}: {p:.4f}\n")
            self.probs_text.insert(tk.END, f"Uncertainty: {s1_uncertainty:.3f}\n\n")

            if s1_label != "fish" or s1_conf < current_threshold:
                self.final_result.config(text="NOT FISH", fg="red")
                self.stage2_label.config(text="Stage 2: skipped")
                self.stage3_label.config(text="Stage 3: skipped")
                self.status.config(text=f"Rejected at Stage 1 ({s1_conf:.2%})")
                self.details.insert(tk.END, f"Final Result: NOT FISH\n")
                self.details.insert(tk.END, f"Stage 1 confidence: {s1_conf:.2%}\n")
                self.details.insert(tk.END, f"Threshold used: {current_threshold:.2f}\n")
                
                # Add to history
                self.add_to_history("NOT FISH", s1_conf, "Rejected at stage 1")
                return

            # --------------------------
            # Stage 2: Species
            # --------------------------
            if self.species_session is None:
                self.details.insert(tk.END, "ERROR: Species classifier not loaded\n")
                return

            s2_idx, s2_conf, s2_probs, s2_uncertainty = self.run_model(self.species_session, left, right)
            species = SPECIES_LABELS[s2_idx]

            self.stage2_label.config(
                text=f"Stage 2: {species} ({s2_conf:.2%}) [uncertainty: {s2_uncertainty:.3f}]"
            )

            self.probs_text.insert(tk.END, "STAGE 2 - Species Classifier\n")
            # Show top 3 probabilities
            probs_list = [(SPECIES_LABELS[i], p) for i, p in enumerate(s2_probs)]
            probs_list.sort(key=lambda x: x[1], reverse=True)
            for label, prob in probs_list[:3]:
                self.probs_text.insert(tk.END, f"  {label}: {prob:.4f}\n")
            self.probs_text.insert(tk.END, f"Uncertainty: {s2_uncertainty:.3f}\n\n")

            # Check if species is known with confidence
            is_known = s2_conf >= UNKNOWN_SPECIES_THRESHOLD

            # --------------------------
            # Stage 3: Grade (if applicable)
            # --------------------------
            if self.grade_session and species.lower() in [s.lower() for s in GRADE_SPECIES]:
                s3_idx, s3_conf, s3_probs, s3_uncertainty = self.run_model(self.grade_session, left, right)
                grade = GRADE_LABELS[s3_idx]

                self.stage3_label.config(
                    text=f"Stage 3: {grade} ({s3_conf:.2%}) [uncertainty: {s3_uncertainty:.3f}]"
                )

                self.probs_text.insert(tk.END, "STAGE 3 - Grade Classifier\n")
                for i, p in enumerate(s3_probs):
                    self.probs_text.insert(tk.END, f"  {GRADE_LABELS[i]}: {p:.4f}\n")
                self.probs_text.insert(tk.END, f"Uncertainty: {s3_uncertainty:.3f}\n")

                if not is_known:
                    final_label = f"UNKNOWN_{species}_({grade})"
                    self.final_result.config(text=final_label, fg="orange")
                else:
                    final_label = f"{species}_{grade}"
                    self.final_result.config(text=final_label, fg="green")
            else:
                if not self.grade_session:
                    grade_note = " (grade model not loaded)"
                else:
                    grade_note = " (grade not applicable)"
                
                if not is_known:
                    final_label = f"UNKNOWN_{species}{grade_note}"
                    self.final_result.config(text=final_label, fg="orange")
                else:
                    final_label = f"{species}{grade_note}"
                    self.final_result.config(text=final_label, fg="green")
                
                self.stage3_label.config(text=f"Stage 3: {grade_note}")

            self.status.config(text=f"Predicted: {final_label}")

            # Add details
            self.details.insert(tk.END, f"Final Result: {final_label}\n\n")
            self.details.insert(tk.END, f"Image Quality:\n")
            self.details.insert(tk.END, f"  Left: {left_quality['width']}x{left_quality['height']}\n")
            self.details.insert(tk.END, f"  Right: {right_quality['width']}x{right_quality['height']}\n")
            if left_quality['is_screenshot']:
                self.details.insert(tk.END, "  Detected as screenshot\n")
            self.details.insert(tk.END, "\n")
            
            self.details.insert(tk.END, f"Stage 1: {s1_label} ({s1_conf:.2%})\n")
            self.details.insert(tk.END, f"Stage 2: {species} ({s2_conf:.2%})\n")
            if 'grade' in locals():
                self.details.insert(tk.END, f"Stage 3: {grade} ({s3_conf:.2%})\n")

            # Add warnings
            warnings = []
            if s1_uncertainty > 0.3:
                warnings.append(f"High uncertainty in fish detection")
            if s2_uncertainty > 0.3:
                warnings.append(f"High uncertainty in species classification")
            if s2_conf < self.species_threshold.get():
                warnings.append(f"Low species confidence")
            
            if warnings:
                self.details.insert(tk.END, "\nWarnings:\n")
                for w in warnings:
                    self.details.insert(tk.END, f"  ⚠ {w}\n")

            # Add to history
            self.add_to_history(final_label, s1_conf, f"Species: {species}")

        except Exception as e:
            messagebox.showerror("Prediction Error", str(e))
            import traceback
            traceback.print_exc()

    def add_to_history(self, result, confidence, details):
        """Add prediction to history"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.prediction_history.append({
            'time': timestamp,
            'result': result,
            'confidence': confidence,
            'details': details
        })
        
        # Update history display
        self.history_text.insert("1.0", f"[{timestamp}] {result} ({confidence:.1%}) - {details}\n")
        self.history_text.insert("1.0", "-" * 50 + "\n")


if __name__ == "__main__":
    root = tk.Tk()
    app = MultiStageFishPredictor(root)
    root.mainloop()