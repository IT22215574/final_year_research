#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import platform
import sys
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    average_precision_score,
    brier_score_loss,
    classification_report,
    confusion_matrix,
    f1_score,
    log_loss,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

TRAIN_DIR = Path(__file__).resolve().parents[1]
if str(TRAIN_DIR) not in sys.path:
    sys.path.insert(0, str(TRAIN_DIR))

# Local import (train folder)
from land_mask import keep_sea_rows_in_sri_lanka_bbox


def parse_args() -> argparse.Namespace:
    base_dir = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(
        description=(
            "Evaluate rf_fish_zone_model.pkl and generate metrics + charts. "
            "Outputs are saved into the models folder."
        )
    )
    parser.add_argument(
        "--model",
        type=Path,
        default=Path(__file__).resolve().parent / "rf_fish_zone_model.pkl",
        help="Path to the saved model artifact (.pkl via joblib).",
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=base_dir / "final_dataset_no_bathymetry.csv",
        help="Path to the CSV dataset used for evaluation.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent,
        help="Folder to write charts/reports.",
    )
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument(
        "--allow-land",
        action="store_true",
        help="If set, do NOT filter out Sri Lankan land points (default filters them out).",
    )
    return parser.parse_args()


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _load_artifact(model_path: Path):
    artifact = joblib.load(model_path)
    if isinstance(artifact, dict) and "pipeline" in artifact:
        pipeline = artifact["pipeline"]
        feature_columns = artifact.get(
            "feature_columns", ["lat", "lon", "sst", "chlor_a", "water_u", "water_v"]
        )
        target_column = artifact.get("target_column", "fish_presence")
    else:
        pipeline = artifact
        feature_columns = ["lat", "lon", "sst", "chlor_a", "water_u", "water_v"]
        target_column = "fish_presence"

    if not isinstance(pipeline, Pipeline):
        # Backstop: some older versions might have saved the estimator only.
        pipeline = Pipeline(steps=[("imputer", SimpleImputer(strategy="median")), ("model", pipeline)])

    return pipeline, list(feature_columns), str(target_column), artifact


def _safe_float(x) -> float | None:
    try:
        return float(x)
    except Exception:
        return None


def main() -> None:
    args = parse_args()

    if not args.model.exists():
        raise FileNotFoundError(f"Model artifact not found: {args.model}")
    if not args.data.exists():
        raise FileNotFoundError(f"Dataset not found: {args.data}")

    output_dir = args.output_dir
    _ensure_dir(output_dir)

    pipeline, feature_columns, target_column, artifact = _load_artifact(args.model)

    df = pd.read_csv(args.data)

    if (not args.allow_land) and ("lat" in df.columns) and ("lon" in df.columns):
        df = keep_sea_rows_in_sri_lanka_bbox(df, lat_col="lat", lon_col="lon")

    missing_cols = [c for c in [*feature_columns, target_column] if c not in df.columns]
    if missing_cols:
        raise ValueError(
            "Missing required columns in dataset: "
            + ", ".join(missing_cols)
            + f". Available columns: {', '.join(df.columns)}"
        )

    X = df[feature_columns]
    y = df[target_column]
    if y.dtype == "bool":
        y = y.astype(int)

    # Ensure binary ints where possible
    if y.nunique() <= 2:
        y = y.astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=args.test_size,
        random_state=args.random_state,
        stratify=y if y.nunique() > 1 else None,
    )

    # If pipeline wasn't fitted (should be), fit defensively
    # (But normally the model is already trained.)
    try:
        _ = pipeline.predict(X_test.iloc[:1])
    except Exception:
        pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)

    # Probabilities for positive class (assume binary 0/1)
    y_proba = None
    try:
        proba = pipeline.predict_proba(X_test)
        if proba.shape[1] == 2:
            y_proba = proba[:, 1]
        else:
            # Multi-class: pick max prob as confidence, and compute macro AUC if possible
            y_proba = None
    except Exception:
        y_proba = None

    metrics: dict[str, object] = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "python": platform.python_version(),
        "platform": platform.platform(),
        "joblib": getattr(joblib, "__version__", None),
        "numpy": getattr(np, "__version__", None),
        "pandas": getattr(pd, "__version__", None),
        "sklearn": None,
        "model_path": str(args.model),
        "data_path": str(args.data),
        "filtered_land": (not args.allow_land),
        "n_rows": int(len(df)),
        "n_test": int(len(X_test)),
        "feature_columns": feature_columns,
        "target_column": target_column,
    }

    try:
        import sklearn  # noqa: PLC0415

        metrics["sklearn"] = sklearn.__version__
    except Exception:
        pass

    # Core metrics
    metrics["accuracy"] = _safe_float(accuracy_score(y_test, y_pred))
    metrics["precision"] = _safe_float(precision_score(y_test, y_pred, zero_division=0))
    metrics["recall"] = _safe_float(recall_score(y_test, y_pred, zero_division=0))
    metrics["f1"] = _safe_float(f1_score(y_test, y_pred, zero_division=0))

    if y_proba is not None:
        metrics["roc_auc"] = _safe_float(roc_auc_score(y_test, y_proba))
        metrics["avg_precision"] = _safe_float(average_precision_score(y_test, y_proba))
        metrics["log_loss"] = _safe_float(log_loss(y_test, np.column_stack([1 - y_proba, y_proba]), labels=[0, 1]))
        metrics["brier_score"] = _safe_float(brier_score_loss(y_test, y_proba))

        # Per-sample loss contributions (for a "loss chart")
        eps = 1e-15
        p = np.clip(y_proba, eps, 1 - eps)
        y_arr = np.asarray(y_test)
        per_sample_nll = -(y_arr * np.log(p) + (1 - y_arr) * np.log(1 - p))
    else:
        per_sample_nll = None

    # Model info
    model = pipeline.named_steps.get("model")
    if model is not None:
        try:
            metrics["model_type"] = type(model).__name__
            metrics["model_params"] = model.get_params()
        except Exception:
            pass
        try:
            metrics["n_features_in"] = int(getattr(model, "n_features_in_"))
        except Exception:
            pass
        try:
            metrics["classes_"] = [int(c) for c in getattr(model, "classes_")]
        except Exception:
            pass

    # Save metrics JSON
    (output_dir / "rf_model_metrics.json").write_text(json.dumps(metrics, indent=2, sort_keys=True))

    # Save classification report text
    report_txt = classification_report(y_test, y_pred, digits=4, zero_division=0)
    (output_dir / "rf_classification_report.txt").write_text(report_txt)

    # Charts
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt  # noqa: PLC0415

    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm)
    fig, ax = plt.subplots(figsize=(5, 5))
    disp.plot(ax=ax, values_format="d", colorbar=False)
    ax.set_title("Confusion Matrix")
    fig.tight_layout()
    fig.savefig(output_dir / "rf_confusion_matrix.png", dpi=180)
    plt.close(fig)

    if y_proba is not None:
        # ROC curve
        fpr, tpr, _ = roc_curve(y_test, y_proba)
        fig, ax = plt.subplots(figsize=(6, 5))
        ax.plot(fpr, tpr, label=f"AUC={metrics.get('roc_auc', 0):.3f}")
        ax.plot([0, 1], [0, 1], linestyle="--", linewidth=1)
        ax.set_xlabel("False Positive Rate")
        ax.set_ylabel("True Positive Rate")
        ax.set_title("ROC Curve")
        ax.legend(loc="lower right")
        fig.tight_layout()
        fig.savefig(output_dir / "rf_roc_curve.png", dpi=180)
        plt.close(fig)

        # Precision-Recall curve
        precision, recall, _ = precision_recall_curve(y_test, y_proba)
        fig, ax = plt.subplots(figsize=(6, 5))
        ax.plot(recall, precision, label=f"AP={metrics.get('avg_precision', 0):.3f}")
        ax.set_xlabel("Recall")
        ax.set_ylabel("Precision")
        ax.set_title("Precision-Recall Curve")
        ax.legend(loc="lower left")
        fig.tight_layout()
        fig.savefig(output_dir / "rf_pr_curve.png", dpi=180)
        plt.close(fig)

        # Calibration curve
        frac_pos, mean_pred = calibration_curve(y_test, y_proba, n_bins=10, strategy="uniform")
        fig, ax = plt.subplots(figsize=(6, 5))
        ax.plot(mean_pred, frac_pos, marker="o", label="Model")
        ax.plot([0, 1], [0, 1], linestyle="--", linewidth=1, label="Perfect")
        ax.set_xlabel("Mean predicted probability")
        ax.set_ylabel("Fraction of positives")
        ax.set_title("Calibration Curve")
        ax.legend(loc="upper left")
        fig.tight_layout()
        fig.savefig(output_dir / "rf_calibration_curve.png", dpi=180)
        plt.close(fig)

        # Probability histogram by class
        y_arr = np.asarray(y_test)
        fig, ax = plt.subplots(figsize=(6, 5))
        ax.hist(y_proba[y_arr == 0], bins=30, alpha=0.7, label="True=0")
        ax.hist(y_proba[y_arr == 1], bins=30, alpha=0.7, label="True=1")
        ax.set_xlabel("Predicted probability (class=1)")
        ax.set_ylabel("Count")
        ax.set_title("Predicted Probability Distribution")
        ax.legend(loc="upper center")
        fig.tight_layout()
        fig.savefig(output_dir / "rf_probability_hist.png", dpi=180)
        plt.close(fig)

        # Threshold metrics curves
        thresholds = np.linspace(0.0, 1.0, 101)
        accs, precs, recs, f1s = [], [], [], []
        for t in thresholds:
            pred_t = (y_proba >= t).astype(int)
            accs.append(accuracy_score(y_test, pred_t))
            precs.append(precision_score(y_test, pred_t, zero_division=0))
            recs.append(recall_score(y_test, pred_t, zero_division=0))
            f1s.append(f1_score(y_test, pred_t, zero_division=0))

        fig, ax = plt.subplots(figsize=(7, 5))
        ax.plot(thresholds, accs, label="Accuracy")
        ax.plot(thresholds, precs, label="Precision")
        ax.plot(thresholds, recs, label="Recall")
        ax.plot(thresholds, f1s, label="F1")
        ax.set_xlabel("Threshold")
        ax.set_ylabel("Score")
        ax.set_title("Metrics vs Threshold")
        ax.set_ylim(0, 1.0)
        ax.legend(loc="best")
        fig.tight_layout()
        fig.savefig(output_dir / "rf_metrics_vs_threshold.png", dpi=180)
        plt.close(fig)

        # "Model loss" chart: per-sample negative log-likelihood distribution
        if per_sample_nll is not None:
            fig, ax = plt.subplots(figsize=(6, 5))
            ax.hist(per_sample_nll, bins=40, alpha=0.85)
            ax.set_xlabel("Per-sample negative log-likelihood")
            ax.set_ylabel("Count")
            ax.set_title("Log Loss Distribution")
            fig.tight_layout()
            fig.savefig(output_dir / "rf_logloss_distribution.png", dpi=180)
            plt.close(fig)

    # Feature importance (if available)
    if model is not None and hasattr(model, "feature_importances_"):
        importances = np.asarray(getattr(model, "feature_importances_"))
        order = np.argsort(importances)[::-1]
        names = [feature_columns[i] for i in order]
        vals = importances[order]

        fig, ax = plt.subplots(figsize=(7, 4))
        ax.bar(range(len(vals)), vals)
        ax.set_xticks(range(len(vals)))
        ax.set_xticklabels(names, rotation=35, ha="right")
        ax.set_ylabel("Importance")
        ax.set_title("Feature Importances")
        fig.tight_layout()
        fig.savefig(output_dir / "rf_feature_importances.png", dpi=180)
        plt.close(fig)

    # Human-readable summary
    summary_lines = [
        f"Model: {args.model.name}",
        f"Type: {metrics.get('model_type')}",
        f"Dataset: {args.data.name}",
        f"Rows used: {metrics.get('n_rows')} (land filtered={metrics.get('filtered_land')})",
        f"Test size: {args.test_size} (n_test={metrics.get('n_test')})",
        "",
        "Metrics:",
        f"- Accuracy: {metrics.get('accuracy')}",
        f"- Precision: {metrics.get('precision')}",
        f"- Recall: {metrics.get('recall')}",
        f"- F1: {metrics.get('f1')}",
    ]
    if y_proba is not None:
        summary_lines += [
            f"- ROC AUC: {metrics.get('roc_auc')}",
            f"- Average Precision (PR AUC): {metrics.get('avg_precision')}",
            f"- Log loss: {metrics.get('log_loss')}",
            f"- Brier score: {metrics.get('brier_score')}",
        ]

    summary_lines += [
        "",
        "Saved files:",
        "- rf_model_metrics.json",
        "- rf_classification_report.txt",
        "- rf_confusion_matrix.png",
        "- rf_feature_importances.png (if supported)",
        "- rf_roc_curve.png / rf_pr_curve.png / rf_calibration_curve.png / rf_probability_hist.png",
        "- rf_metrics_vs_threshold.png",
        "- rf_logloss_distribution.png",
    ]

    (output_dir / "rf_model_summary.txt").write_text("\n".join(summary_lines) + "\n")


if __name__ == "__main__":
    main()
