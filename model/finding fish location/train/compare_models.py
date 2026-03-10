#!/usr/bin/env python3
"""
Compare old model (6 features) vs new model (7 features with bathymetry)
Provides comprehensive metrics: accuracy, precision, recall, F1-score, etc.
"""

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from pathlib import Path

# Feature configurations
OLD_FEATURES = ["lat", "lon", "sst", "chlor_a", "water_u", "water_v"]
NEW_FEATURES = ["lat", "lon", "sst", "chlor_a", "water_u", "water_v", "depth"]
TARGET = "fish_presence"

# Model parameters (matching the training configuration)
MODEL_PARAMS = {
    "n_estimators": 300,
    "random_state": 42,
    "n_jobs": -1,
    "class_weight": "balanced",
}

def load_data():
    """Load the dataset with bathymetry"""
    data_path = Path(__file__).with_name("final_dataset_with_bathymetry.csv")
    df = pd.read_csv(data_path)
    return df

def train_and_evaluate_model(X_train, X_test, y_train, y_test, model_name):
    """Train a model and return comprehensive metrics"""
    model = RandomForestClassifier(**MODEL_PARAMS)
    pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("model", model),
    ])
    
    # Train the model
    pipeline.fit(X_train, y_train)
    
    # Predictions
    y_pred = pipeline.predict(X_test)
    y_pred_proba = pipeline.predict_proba(X_test)[:, 1]  # Probability for positive class
    
    # Calculate metrics
    metrics = {
        "model_name": model_name,
        "accuracy": accuracy_score(y_test, y_pred),
        "precision": precision_score(y_test, y_pred, zero_division=0),
        "recall": recall_score(y_test, y_pred, zero_division=0),
        "f1_score": f1_score(y_test, y_pred, zero_division=0),
        "roc_auc": roc_auc_score(y_test, y_pred_proba),
    }
    
    # Confusion matrix
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    metrics.update({
        "true_negatives": tn,
        "false_positives": fp,
        "false_negatives": fn,
        "true_positives": tp,
        "specificity": tn / (tn + fp) if (tn + fp) > 0 else 0,
    })
    
    # Classification report
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    
    return metrics, report, pipeline

def print_comparison(old_metrics, new_metrics, old_report, new_report):
    """Print a formatted comparison of both models"""
    print("=" * 80)
    print("MODEL COMPARISON: OLD (6 features) vs NEW (7 features with Bathymetry)")
    print("=" * 80)
    print()
    
    # Feature comparison
    print("FEATURES USED:")
    print("-" * 80)
    print(f"Old Model: {', '.join(OLD_FEATURES)}")
    print(f"New Model: {', '.join(NEW_FEATURES)}")
    print(f"Difference: Added 'depth' (bathymetry) feature")
    print()
    
    # Core metrics comparison
    print("CORE METRICS:")
    print("-" * 80)
    print(f"{'Metric':<20} {'Old Model':>15} {'New Model':>15} {'Change':>15}")
    print("-" * 80)
    
    metrics_to_compare = [
        ("Accuracy", "accuracy", "%.4f"),
        ("Precision", "precision", "%.4f"),
        ("Recall", "recall", "%.4f"),
        ("F1-Score", "f1_score", "%.4f"),
        ("ROC-AUC", "roc_auc", "%.4f"),
        ("Specificity", "specificity", "%.4f"),
    ]
    
    for label, key, fmt in metrics_to_compare:
        old_val = old_metrics[key]
        new_val = new_metrics[key]
        change = new_val - old_val
        change_pct = (change / old_val * 100) if old_val != 0 else 0
        
        old_str = fmt % old_val
        new_str = fmt % new_val
        change_str = f"{change:+.4f} ({change_pct:+.2f}%)"
        
        print(f"{label:<20} {old_str:>15} {new_str:>15} {change_str:>15}")
    
    print()
    
    # Confusion matrix comparison
    print("CONFUSION MATRIX:")
    print("-" * 80)
    print(f"{'Metric':<20} {'Old Model':>15} {'New Model':>15}")
    print("-" * 80)
    print(f"{'True Positives':<20} {old_metrics['true_positives']:>15,} {new_metrics['true_positives']:>15,}")
    print(f"{'True Negatives':<20} {old_metrics['true_negatives']:>15,} {new_metrics['true_negatives']:>15,}")
    print(f"{'False Positives':<20} {old_metrics['false_positives']:>15,} {new_metrics['false_positives']:>15,}")
    print(f"{'False Negatives':<20} {old_metrics['false_negatives']:>15,} {new_metrics['false_negatives']:>15,}")
    print()
    
    # Per-class metrics
    print("PER-CLASS METRICS (Class 0: No Fish, Class 1: Fish Present):")
    print("-" * 80)
    
    for class_label in ['0', '1']:
        class_name = "No Fish (0)" if class_label == '0' else "Fish Present (1)"
        print(f"\n{class_name}:")
        print(f"{'Metric':<20} {'Old Model':>15} {'New Model':>15}")
        print("-" * 40)
        
        for metric in ['precision', 'recall', 'f1-score', 'support']:
            old_val = old_report[class_label][metric]
            new_val = new_report[class_label][metric]
            
            if metric == 'support':
                print(f"{metric.capitalize():<20} {int(old_val):>15,} {int(new_val):>15,}")
            else:
                print(f"{metric.capitalize():<20} {old_val:>15.4f} {new_val:>15.4f}")
    
    print()
    
    # Summary
    print("SUMMARY:")
    print("-" * 80)
    
    improvements = []
    degradations = []
    
    for label, key, _ in metrics_to_compare:
        change = new_metrics[key] - old_metrics[key]
        if change > 0.0001:
            improvements.append(f"{label} (+{change:.4f})")
        elif change < -0.0001:
            degradations.append(f"{label} ({change:.4f})")
    
    if improvements:
        print("✓ Improvements:", ", ".join(improvements))
    else:
        print("✓ No significant improvements in core metrics")
    
    if degradations:
        print("✗ Degradations:", ", ".join(degradations))
    else:
        print("✓ No degradations in core metrics")
    
    print()
    print("CONCLUSION:")
    print("-" * 80)
    
    accuracy_change = new_metrics['accuracy'] - old_metrics['accuracy']
    f1_change = new_metrics['f1_score'] - old_metrics['f1_score']
    
    if accuracy_change > 0.001 and f1_change > 0.001:
        print("🎯 Adding bathymetry (depth) feature IMPROVED the model significantly!")
    elif accuracy_change < -0.001 or f1_change < -0.001:
        print("⚠️  Adding bathymetry (depth) feature DEGRADED the model performance.")
    else:
        print("➡️  Adding bathymetry (depth) feature had MINIMAL IMPACT on metrics.")
        print("   However, the model now makes depth-aware predictions, which are more")
        print("   biologically meaningful for fishing zone recommendations.")
    
    print("=" * 80)

def main():
    print("Loading dataset...")
    df = load_data()
    
    # Ensure target is integer
    y = df[TARGET].astype(int)
    
    # Split data (same split for both models)
    X_train_full, X_test_full, y_train, y_test = train_test_split(
        df[NEW_FEATURES],
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )
    
    print(f"Training set size: {len(X_train_full):,}")
    print(f"Test set size: {len(X_test_full):,}")
    print(f"Positive class ratio: {y_train.mean():.2%} (train), {y_test.mean():.2%} (test)")
    print()
    
    # Old model (6 features - without depth)
    print("Training OLD MODEL (6 features, no bathymetry)...")
    X_train_old = X_train_full[OLD_FEATURES]
    X_test_old = X_test_full[OLD_FEATURES]
    old_metrics, old_report, old_pipeline = train_and_evaluate_model(
        X_train_old, X_test_old, y_train, y_test, "Old Model (6 features)"
    )
    print("✓ Old model trained")
    print()
    
    # New model (7 features - with depth)
    print("Training NEW MODEL (7 features, with bathymetry)...")
    X_train_new = X_train_full[NEW_FEATURES]
    X_test_new = X_test_full[NEW_FEATURES]
    new_metrics, new_report, new_pipeline = train_and_evaluate_model(
        X_train_new, X_test_new, y_train, y_test, "New Model (7 features)"
    )
    print("✓ New model trained")
    print()
    
    # Print comparison
    print_comparison(old_metrics, new_metrics, old_report, new_report)
    
    # Save detailed results to file
    output_file = Path(__file__).with_name("model_comparison_results.txt")
    with open(output_file, 'w') as f:
        import sys
        from io import StringIO
        
        # Redirect stdout to capture the comparison output
        old_stdout = sys.stdout
        sys.stdout = StringIO()
        
        print_comparison(old_metrics, new_metrics, old_report, new_report)
        
        comparison_text = sys.stdout.getvalue()
        sys.stdout = old_stdout
        
        f.write(comparison_text)
    
    print(f"\nDetailed results saved to: {output_file}")

if __name__ == "__main__":
    main()
