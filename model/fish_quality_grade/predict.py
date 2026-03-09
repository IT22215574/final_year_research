import argparse
import json
import os
import sys

import cv2
import numpy as np

# TensorFlow is required to load the .h5 model
import tensorflow as tf
from tensorflow import keras


# Reduce noisy TensorFlow logs in API responses
os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '2')


def preprocess_image_simple(image, img_size: int):
    if image is None:
        return None

    resized = cv2.resize(image, (img_size, img_size))
    normalized = resized.astype('float32') / 255.0

    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    normalized = (normalized - mean) / std

    return normalized


def extract_basic_color_features(image):
    if image is None:
        return np.zeros(24, dtype=np.float32)

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)

    features = []

    h, s, v = cv2.split(hsv)
    features.extend([np.mean(h), np.std(h), np.mean(s), np.std(s)])

    l, a, b = cv2.split(lab)
    features.extend([np.mean(l), np.std(l), np.mean(a), np.std(a)])

    hist_b = cv2.calcHist([image], [0], None, [4], [0, 256]).flatten()
    hist_g = cv2.calcHist([image], [1], None, [4], [0, 256]).flatten()
    hist_r = cv2.calcHist([image], [2], None, [4], [0, 256]).flatten()

    hb_sum = np.sum(hist_b)
    hg_sum = np.sum(hist_g)
    hr_sum = np.sum(hist_r)

    if hb_sum > 0:
        hist_b = hist_b / hb_sum
    if hg_sum > 0:
        hist_g = hist_g / hg_sum
    if hr_sum > 0:
        hist_r = hist_r / hr_sum

    features.extend(list(hist_b))
    features.extend(list(hist_g))
    features.extend(list(hist_r))

    return np.array(features, dtype=np.float32)


def extract_basic_quality_features(image):
    if image is None:
        return np.zeros(4, dtype=np.float32)

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    features = []

    lower_red = np.array([0, 50, 50])
    upper_red = np.array([10, 255, 255])
    mask = cv2.inRange(hsv, lower_red, upper_red)
    blood_percentage = float(np.sum(mask > 0) / mask.size) if mask.size > 0 else 0.0
    features.append(blood_percentage)

    features.append(float(np.mean(gray)))

    contrast = float(np.std(gray) / (np.mean(gray) + 1e-10))
    features.append(contrast)

    edges = cv2.Canny(gray, 50, 150)
    edge_density = float(np.sum(edges > 0) / edges.size) if edges.size > 0 else 0.0
    features.append(edge_density)

    return np.array(features, dtype=np.float32)


def extract_all_features_basic(left_img, right_img):
    if left_img is None or right_img is None:
        return np.zeros(62, dtype=np.float32)

    left_color = extract_basic_color_features(left_img)   # 24
    left_quality = extract_basic_quality_features(left_img)  # 4

    right_color = extract_basic_color_features(right_img)  # 24
    right_quality = extract_basic_quality_features(right_img)  # 4

    left_all = np.concatenate([left_color, left_quality])   # 28
    right_all = np.concatenate([right_color, right_quality])  # 28

    diff_features = np.abs(left_all[:6] - right_all[:6])  # 6

    combined = np.concatenate([left_all, right_all, diff_features])  # 62
    return combined.astype(np.float32)


def load_metadata(model_dir: str):
    meta_path = os.path.join(model_dir, 'model_metadata.json')
    if not os.path.exists(meta_path):
        return None
    try:
        with open(meta_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None


def normalize_species_label(label: str) -> str:
    # Your app uses "Mackerel" but training used "makerel".
    if label.lower() == 'makerel':
        return 'Mackerel'
    return label


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--side1', required=True)
    parser.add_argument('--side2', required=True)
    parser.add_argument('--model', default=None)
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Model path resolution order:
    # 1) CLI --model
    # 2) env MODEL_PATH
    # 3) model/fish_quality_grade/simple_fish_model.h5
    # 4) model/fish_quality_grade/simple_best_model.h5
    model_path = args.model or os.environ.get('MODEL_PATH') or os.path.join(script_dir, 'simple_fish_model.h5')
    if not os.path.exists(model_path):
        # Fallback to checkpoint name used in notebook
        alt = os.path.join(script_dir, 'simple_best_model.h5')
        if os.path.exists(alt):
            model_path = alt
        else:
            raise FileNotFoundError(
                "Model file not found.\n"
                f"Tried: {model_path}\n"
                f"Also tried: {alt}\n"
                f"Fix: copy your trained model to: {os.path.join(script_dir, 'simple_fish_model.h5')}\n"
                "Or set env MODEL_PATH to an absolute path to the .h5/.keras file."
            )

    metadata = load_metadata(script_dir) or {}
    img_size = int(metadata.get('img_size', 128))
    species_labels = metadata.get('species_labels', None)
    grade_labels = metadata.get('grade_labels', None)

    left_img = cv2.imread(args.side1)
    right_img = cv2.imread(args.side2)

    if left_img is None or right_img is None:
        raise ValueError('Could not read one or both images')

    left_proc = preprocess_image_simple(left_img, img_size)
    right_proc = preprocess_image_simple(right_img, img_size)

    if left_proc is None or right_proc is None:
        raise ValueError('Preprocessing failed')

    # NOTE: The notebook feature vector is 68; but its implementation actually mismatches.
    # We compute features from the same intent (color+quality+diff) and then pad/trim to model input.
    features = extract_all_features_basic(left_img, right_img)

    model = keras.models.load_model(model_path)

    # Determine expected feature size from the model input
    # Inputs are: left_input, right_input, feature_input
    feature_input_shape = model.inputs[2].shape
    expected_feature_dim = int(feature_input_shape[-1])

    if features.shape[0] < expected_feature_dim:
        features = np.pad(features, (0, expected_feature_dim - features.shape[0]), mode='constant')
    elif features.shape[0] > expected_feature_dim:
        features = features[:expected_feature_dim]

    # Add batch dimension
    Xl = np.expand_dims(left_proc, axis=0)
    Xr = np.expand_dims(right_proc, axis=0)
    Xf = np.expand_dims(features, axis=0)

    species_pred, grade_pred = model.predict([Xl, Xr, Xf], verbose=0)

    species_pred = species_pred[0]
    grade_pred = grade_pred[0]

    species_class = int(np.argmax(species_pred))
    grade_class = int(np.argmax(grade_pred))

    if not species_labels:
        species_labels = [f"Class_{i}" for i in range(len(species_pred))]
    if not grade_labels:
        grade_labels = [f"Class_{i}" for i in range(len(grade_pred))]

    species_label = normalize_species_label(str(species_labels[species_class]))
    grade_label = str(grade_labels[grade_class])

    out = {
        'species': {
            'label': species_label,
            'class': species_class,
            'confidence': float(species_pred[species_class]),
            'all_probabilities': [float(x) for x in species_pred.tolist()],
        },
        'grade': {
            'label': grade_label,
            'class': grade_class,
            'confidence': float(grade_pred[grade_class]),
            'all_probabilities': [float(x) for x in grade_pred.tolist()],
        },
    }

    # IMPORTANT: print JSON only (backend parses last line)
    sys.stdout.write(json.dumps(out))


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        sys.stderr.write(str(e))
        sys.stderr.write('\n')
        sys.exit(1)
