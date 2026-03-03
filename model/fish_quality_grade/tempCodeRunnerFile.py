import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageTk
import os

# --------------------------------------------------
# CONFIG
# --------------------------------------------------
# Resolve model paths relative to this file so the GUI works
# no matter what the current working directory is.
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

# Update this list to match your actual species training order
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


def softmax(x: np.ndarray) -> np.ndarray:
    x = x - np.max(x, axis=1, keepdims=True)
    e = np.exp(x)
    return e / np.sum(e, axis=1, keepdims=True)


class MultiStageFishPredictor:
    def __init__(self, root):
        self.root = root
        self.root.title("Multi-Stage Fish Classifier")
        self.root.geometry("950x720")

        self.left_path = None
        self.right_path = None

        self.fish_session = None
        self.species_session = None
        self.grade_session = None

        self.load_models()
        self.create_widgets()

    def load_models(self):
        try:
            missing = [
                p for p in [FISH_DETECTOR_ONNX, SPECIES_CLASSIFIER_ONNX, GRADE_CLASSIFIER_ONNX]
                if not os.path.exists(p)
            ]
            if missing:
                raise FileNotFoundError(
                    "Missing model file(s):\n"
                    + "\n".join(missing)
                    + f"\n\nCurrent working directory: {os.getcwd()}"
                )
            self.fish_session = ort.InferenceSession(FISH_DETECTOR_ONNX, providers=["CPUExecutionProvider"])
            self.species_session = ort.InferenceSession(SPECIES_CLASSIFIER_ONNX, providers=["CPUExecutionProvider"])
            self.grade_session = ort.InferenceSession(GRADE_CLASSIFIER_ONNX, providers=["CPUExecutionProvider"])
            self.models_loaded = True
            self.model_error = ""
        except Exception as e:
            self.models_loaded = False
            self.model_error = str(e)

    def preprocess(self, path: str) -> np.ndarray:
        img = Image.open(path).convert("RGB")
        img = img.resize((IMG_SIZE, IMG_SIZE), Image.BILINEAR)

        arr = np.asarray(img).astype(np.float32) / 255.0
        arr = (arr - MEAN) / STD
        arr = np.transpose(arr, (2, 0, 1))
        arr = np.expand_dims(arr, 0)

        return arr.astype(np.float32)

    def run_model(self, session, left, right):
        logits = session.run(None, {"left": left, "right": right})[0]
        probs = softmax(logits)[0]
        pred_idx = int(np.argmax(probs))
        conf = float(probs[pred_idx])
        return pred_idx, conf, probs

    def create_widgets(self):
        top = tk.Frame(self.root)
        top.pack(fill=tk.X, padx=10, pady=5)

        if self.models_loaded:
            tk.Label(top, text="Models loaded successfully", fg="green", font=("Arial", 11, "bold")).pack(side=tk.LEFT)
        else:
            tk.Label(top, text=f"Model load failed: {self.model_error}", fg="red", font=("Arial", 11, "bold")).pack(side=tk.LEFT)

        main = tk.Frame(self.root)
        main.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        left_panel = tk.Frame(main)
        left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=10)

        right_panel = tk.Frame(main)
        right_panel.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10)

        tk.Button(left_panel, text="Select LEFT Image", command=self.pick_left, width=20, bg="lightblue").pack(pady=5)
        tk.Button(left_panel, text="Select RIGHT Image", command=self.pick_right, width=20, bg="lightblue").pack(pady=5)
        tk.Button(left_panel, text="TEST MODEL", command=self.predict, width=20, bg="green", fg="white").pack(pady=10)

        self.left_preview = tk.Label(left_panel, text="Left preview", bg="gray", width=20, height=10)
        self.left_preview.pack(pady=5)

        self.right_preview = tk.Label(left_panel, text="Right preview", bg="gray", width=20, height=10)
        self.right_preview.pack(pady=5)

        self.left_lbl = tk.Label(left_panel, text="Left: (not selected)", wraplength=220, justify=tk.LEFT)
        self.left_lbl.pack(fill=tk.X, pady=2)

        self.right_lbl = tk.Label(left_panel, text="Right: (not selected)", wraplength=220, justify=tk.LEFT)
        self.right_lbl.pack(fill=tk.X, pady=2)

        tk.Label(right_panel, text="Prediction Results", font=("Arial", 15, "bold")).pack(pady=5)

        self.status = tk.Label(right_panel, text="Select left and right images", fg="blue", font=("Arial", 12))
        self.status.pack(pady=5)

        result_box = tk.Frame(right_panel, relief=tk.GROOVE, bd=2)
        result_box.pack(fill=tk.X, pady=5)

        self.final_result = tk.Label(result_box, text="No prediction yet", font=("Arial", 18, "bold"))
        self.final_result.pack(pady=10)

        self.stage1_label = tk.Label(result_box, text="Stage 1: -", font=("Arial", 11))
        self.stage1_label.pack()

        self.stage2_label = tk.Label(result_box, text="Stage 2: -", font=("Arial", 11))
        self.stage2_label.pack()

        self.stage3_label = tk.Label(result_box, text="Stage 3: -", font=("Arial", 11))
        self.stage3_label.pack()

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
            filetypes=[("Images", "*.jpg *.jpeg *.png *.JPG *.JPEG *.PNG")]
        )
        if path:
            self.left_path = path
            self.left_lbl.config(text=f"Left: {os.path.basename(path)}")
            self.update_preview(self.left_preview, path)

    def pick_right(self):
        path = filedialog.askopenfilename(
            title="Select RIGHT image",
            filetypes=[("Images", "*.jpg *.jpeg *.png *.JPG *.JPEG *.PNG")]
        )
        if path:
            self.right_path = path
            self.right_lbl.config(text=f"Right: {os.path.basename(path)}")
            self.update_preview(self.right_preview, path)

    def predict(self):
        if not self.models_loaded:
            messagebox.showerror("Error", f"Models not loaded:\n{self.model_error}")
            return

        if not self.left_path or not self.right_path:
            messagebox.showerror("Error", "Please select both left and right images.")
            return

        try:
            left = self.preprocess(self.left_path)
            right = self.preprocess(self.right_path)

            self.details.delete("1.0", tk.END)
            self.probs_text.delete("1.0", tk.END)

            # --------------------------
            # Stage 1: Fish / Non-Fish
            # --------------------------
            s1_idx, s1_conf, s1_probs = self.run_model(self.fish_session, left, right)
            s1_label = BINARY_LABELS[s1_idx]

            self.stage1_label.config(text=f"Stage 1: {s1_label} ({s1_conf:.2%})")

            self.probs_text.insert(tk.END, "STAGE 1 - Fish Detector\n")
            for i, p in enumerate(s1_probs):
                self.probs_text.insert(tk.END, f"{BINARY_LABELS[i]}: {p:.4f}\n")
            self.probs_text.insert(tk.END, "\n")

            if s1_label != "fish" or s1_conf < FISH_THRESHOLD:
                self.final_result.config(text="NOT FISH", fg="red")
                self.stage2_label.config(text="Stage 2: skipped")
                self.stage3_label.config(text="Stage 3: skipped")
                self.status.config(text=f"Rejected at Stage 1 ({s1_conf:.2%})")
                self.details.insert(tk.END, f"Final Result: NOT FISH\n")
                self.details.insert(tk.END, f"Stage 1 confidence: {s1_conf:.2%}\n")
                return

            # --------------------------
            # Stage 2: Species
            # --------------------------
            s2_idx, s2_conf, s2_probs = self.run_model(self.species_session, left, right)
            species = SPECIES_LABELS[s2_idx]

            self.stage2_label.config(text=f"Stage 2: {species} ({s2_conf:.2%})")

            self.probs_text.insert(tk.END, "STAGE 2 - Species Classifier\n")
            for i, p in enumerate(s2_probs):
                self.probs_text.insert(tk.END, f"{SPECIES_LABELS[i]}: {p:.4f}\n")
            self.probs_text.insert(tk.END, "\n")

            # --------------------------
            # Stage 3: Grade
            # --------------------------
            s3_idx, s3_conf, s3_probs = self.run_model(self.grade_session, left, right)
            grade = GRADE_LABELS[s3_idx]

            self.stage3_label.config(text=f"Stage 3: {grade} ({s3_conf:.2%})")

            self.probs_text.insert(tk.END, "STAGE 3 - Grade Classifier\n")
            for i, p in enumerate(s3_probs):
                self.probs_text.insert(tk.END, f"{GRADE_LABELS[i]}: {p:.4f}\n")

            final_label = f"{species}_{grade}"

            self.final_result.config(text=final_label, fg="green")
            self.status.config(text=f"Predicted: {final_label}")

            self.details.insert(tk.END, f"Final Result: {final_label}\n\n")
            self.details.insert(tk.END, f"Stage 1 (Fish Detector): {s1_label} ({s1_conf:.2%})\n")
            self.details.insert(tk.END, f"Stage 2 (Species): {species} ({s2_conf:.2%})\n")
            self.details.insert(tk.END, f"Stage 3 (Grade): {grade} ({s3_conf:.2%})\n")

            if s2_conf < SPECIES_THRESHOLD:
                self.details.insert(tk.END, "\nWarning: Low species confidence.\n")

            if s3_conf < GRADE_THRESHOLD:
                self.details.insert(tk.END, "Warning: Low grade confidence.\n")

        except Exception as e:
            messagebox.showerror("Prediction Error", str(e))


if __name__ == "__main__":
    root = tk.Tk()
    app = MultiStageFishPredictor(root)
    root.mainloop()