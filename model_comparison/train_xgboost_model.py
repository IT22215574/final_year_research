#!/usr/bin/env python3

import argparse
import json
from pathlib import Path

import joblib
import pandas as pd
import xgboost as xgb
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


DEFAULT_FEATURE_COLUMNS = [
    "lat",
    "lon",
    "sst",
    "chlor_a",
    "water_u",
    "water_v",
    "depth",
]
DEFAULT_TARGET_COLUMN = "fish_presence"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Train an XGBoost classifier to predict fish presence using oceanographic features."
        )
    )

    parser.add_argument(
        "--data",
        type=Path,
        default=Path(__file__).with_name("final_dataset_with_bathymetry.csv"),
        help="Path to the CSV dataset.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent / "xgboost_fish_zone_model.pkl",
        help="Where to save the trained model artifact.",
    )
    parser.add_argument(
        "--metrics-output",
        type=Path,
        default=Path(__file__).resolve().parent / "xgboost_model_metrics.json",
        help="Where to save metrics JSON.",
    )
    parser.add_argument(
        "--report-output",
        type=Path,
        default=Path(__file__).resolve().parent / "xgboost_classification_report.txt",
        help="Where to save classification report.",
    )

    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--random-state", type=int, default=42)

    parser.add_argument("--n-estimators", type=int, default=300)
    parser.add_argument("--max-depth", type=int, default=6)
    parser.add_argument("--learning-rate", type=float, default=0.1)
    parser.add_argument("--subsample", type=float, default=0.8)
    parser.add_argument("--colsample-bytree", type=float, default=0.8)
    parser.add_argument("--min-child-weight", type=int, default=1)

    parser.add_argument(
        "--features",
        nargs="+",
        default=DEFAULT_FEATURE_COLUMNS,
        help="Feature column names in the CSV.",
    )
    parser.add_argument(
        "--target",
        type=str,
        default=DEFAULT_TARGET_COLUMN,
        help="Target label column name in the CSV.",
    )

    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if not args.data.exists():
        raise FileNotFoundError(f"Dataset not found: {args.data}")

    print(f"Loading dataset from: {args.data}")
    df = pd.read_csv(args.data)
    print(f"Dataset shape: {df.shape}")

    missing_cols = [c for c in [*args.features, args.target] if c not in df.columns]
    if missing_cols:
        raise ValueError(
            "Missing required columns in dataset: "
            + ", ".join(missing_cols)
            + f". Available columns: {', '.join(df.columns)}"
        )

    X = df[args.features]
    y = df[args.target]

    if y.dtype == "bool":
        y = y.astype(int)

    print(f"Training set size: {len(X)}")
    print(f"Class distribution: {y.value_counts().to_dict()}")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=args.test_size,
        random_state=args.random_state,
        stratify=y if y.nunique() > 1 else None,
    )

    print(f"Training samples: {len(X_train)}, Test samples: {len(X_test)}")

    model = xgb.XGBClassifier(
        n_estimators=args.n_estimators,
        max_depth=args.max_depth,
        learning_rate=args.learning_rate,
        subsample=args.subsample,
        colsample_bytree=args.colsample_bytree,
        min_child_weight=args.min_child_weight,
        random_state=args.random_state,
        n_jobs=-1,
        scale_pos_weight=1,
        tree_method="auto",
    )

    pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("model", model),
        ]
    )

    print("Training XGBoost model...")
    pipeline.fit(X_train, y_train)

    print("Evaluating model...")
    y_pred = pipeline.predict(X_test)
    y_pred_proba = pipeline.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0

    print(f"\n{'='*80}")
    print(f"XGBoost Model Evaluation Results")
    print(f"{'='*80}")
    print(f"Accuracy:    {acc:.4f}")
    print(f"Precision:   {precision:.4f}")
    print(f"Recall:      {recall:.4f}")
    print(f"F1-Score:    {f1:.4f}")
    print(f"ROC-AUC:     {roc_auc:.4f}")
    print(f"Specificity: {specificity:.4f}")
    print(f"\nConfusion Matrix:")
    print(f"True Positives:  {tp}")
    print(f"True Negatives:  {tn}")
    print(f"False Positives: {fp}")
    print(f"False Negatives: {fn}")

    print("\nClassification Report:")
    class_report = classification_report(y_test, y_pred, digits=4, zero_division=0)
    print(class_report)

    metrics = {
        "model": "XGBoost",
        "accuracy": float(acc),
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "roc_auc": float(roc_auc),
        "specificity": float(specificity),
        "confusion_matrix": {"tp": int(tp), "tn": int(tn), "fp": int(fp), "fn": int(fn)},
        "test_size": args.test_size,
        "random_state": args.random_state,
        "hyperparameters": {
            "n_estimators": args.n_estimators,
            "max_depth": args.max_depth,
            "learning_rate": args.learning_rate,
            "subsample": args.subsample,
            "colsample_bytree": args.colsample_bytree,
            "min_child_weight": args.min_child_weight,
        },
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": pipeline, "feature_columns": list(args.features), "target_column": args.target}, args.output)
    print(f"\nSaved model artifact to: {args.output}")

    with open(args.metrics_output, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Saved metrics to: {args.metrics_output}")

    with open(args.report_output, "w") as f:
        f.write("="*80 + "\n")
        f.write("XGBoost Classifier - Fish Zone Prediction\n")
        f.write("="*80 + "\n\n")
        f.write("EVALUATION METRICS:\n")
        f.write("-"*80 + "\n")
        f.write(f"Accuracy:    {acc:.4f}\n")
        f.write(f"Precision:   {precision:.4f}\n")
        f.write(f"Recall:      {recall:.4f}\n")
        f.write(f"F1-Score:    {f1:.4f}\n")
        f.write(f"ROC-AUC:     {roc_auc:.4f}\n")
        f.write(f"Specificity: {specificity:.4f}\n\n")
        f.write("CONFUSION MATRIX:\n")
        f.write("-"*80 + "\n")
        f.write(f"True Positives:  {tp}\n")
        f.write(f"True Negatives:  {tn}\n")
        f.write(f"False Positives: {fp}\n")
        f.write(f"False Negatives: {fn}\n\n")
        f.write("CLASSIFICATION REPORT:\n")
        f.write("-"*80 + "\n")
        f.write(class_report)
    print(f"Saved classification report to: {args.report_output}")


if __name__ == "__main__":
    main()
