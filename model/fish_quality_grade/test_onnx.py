import numpy as np
import pandas as pd
import onnxruntime as ort
from PIL import Image
from sklearn.metrics import confusion_matrix, classification_report

ONNX_PATH = "fish_multiview.onnx"
TEST_CSV = "test.csv"
IMG_SIZE = 160

IDX_TO_LABEL = {
    0: "tuna_A",
    1: "tuna_B",
    2: "tuna_C",
    3: "makerel_B",
    4: "makerel_C",
}
LABEL_TO_IDX = {v: k for k, v in IDX_TO_LABEL.items()}

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)

def preprocess(path: str) -> np.ndarray:
    img = Image.open(path).convert("RGB")
    img = img.resize((IMG_SIZE, IMG_SIZE))
    arr = np.asarray(img).astype(np.float32) / 255.0  # HWC
    arr = (arr - MEAN) / STD
    arr = np.transpose(arr, (2, 0, 1))  # CHW
    arr = np.expand_dims(arr, 0)        # NCHW
    return arr.astype(np.float32)

def softmax(x):
    x = x - np.max(x, axis=1, keepdims=True)
    e = np.exp(x)
    return e / np.sum(e, axis=1, keepdims=True)

def main():
    df = pd.read_csv(TEST_CSV)
    df["label"] = df["species"].astype(str) + "_" + df["grade"].astype(str)

    sess = ort.InferenceSession(ONNX_PATH, providers=["CPUExecutionProvider"])
    input_names = [i.name for i in sess.get_inputs()]
    print("ONNX inputs:", input_names)

    y_true, y_pred = [], []
    confidences = []

    for _, row in df.iterrows():
        left = preprocess(row["left_image"])
        right = preprocess(row["right_image"])

        out = sess.run(None, {"left": left, "right": right})[0]  # logits (1,5)
        probs = softmax(out)
        pred = int(np.argmax(probs, axis=1)[0])
        conf = float(np.max(probs))

        true = LABEL_TO_IDX[row["label"]]

        y_true.append(true)
        y_pred.append(pred)
        confidences.append(conf)

    print("\nAccuracy:", np.mean(np.array(y_true) == np.array(y_pred)))
    print("Avg confidence:", float(np.mean(confidences)))

    print("\nConfusion matrix:\n", confusion_matrix(y_true, y_pred))
    print("\nClassification report:")
    target_names = [IDX_TO_LABEL[i] for i in range(len(IDX_TO_LABEL))]
    print(classification_report(y_true, y_pred, target_names=target_names))

if __name__ == "__main__":
    main()