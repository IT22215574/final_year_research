#!/usr/bin/env python3
"""
Compare feature importance between old and new models
"""

import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from pathlib import Path

# Feature configurations
OLD_FEATURES = ["lat", "lon", "sst", "chlor_a", "water_u", "water_v"]
NEW_FEATURES = ["lat", "lon", "sst", "chlor_a", "water_u", "water_v", "depth"]
TARGET = "fish_presence"

MODEL_PARAMS = {
    "n_estimators": 300,
    "random_state": 42,
    "n_jobs": -1,
    "class_weight": "balanced",
}

def train_and_get_importance(X_train, X_test, y_train, y_test, features):
    """Train model and extract feature importance"""
    model = RandomForestClassifier(**MODEL_PARAMS)
    pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("model", model),
    ])
    
    pipeline.fit(X_train, y_train)
    
    # Get feature importances from the Random Forest
    importances = pipeline.named_steps['model'].feature_importances_
    
    return dict(zip(features, importances))

def main():
    print("Loading dataset...")
    data_path = Path(__file__).with_name("final_dataset_with_bathymetry.csv")
    df = pd.read_csv(data_path)
    
    y = df[TARGET].astype(int)
    
    # Split data
    X_train_full, X_test_full, y_train, y_test = train_test_split(
        df[NEW_FEATURES],
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )
    
    # Train old model
    print("\nTraining OLD MODEL (6 features)...")
    X_train_old = X_train_full[OLD_FEATURES]
    X_test_old = X_test_full[OLD_FEATURES]
    old_importance = train_and_get_importance(
        X_train_old, X_test_old, y_train, y_test, OLD_FEATURES
    )
    
    # Train new model
    print("Training NEW MODEL (7 features)...")
    X_train_new = X_train_full[NEW_FEATURES]
    X_test_new = X_test_full[NEW_FEATURES]
    new_importance = train_and_get_importance(
        X_train_new, X_test_new, y_train, y_test, NEW_FEATURES
    )
    
    # Display comparison
    print("\n" + "=" * 80)
    print("FEATURE IMPORTANCE COMPARISON")
    print("=" * 80)
    print()
    
    print("OLD MODEL (6 features):")
    print("-" * 80)
    print(f"{'Feature':<15} {'Importance':>12} {'Percentage':>12}")
    print("-" * 80)
    sorted_old = sorted(old_importance.items(), key=lambda x: x[1], reverse=True)
    for feature, importance in sorted_old:
        print(f"{feature:<15} {importance:>12.6f} {importance*100:>11.2f}%")
    print()
    
    print("NEW MODEL (7 features with bathymetry):")
    print("-" * 80)
    print(f"{'Feature':<15} {'Importance':>12} {'Percentage':>12} {'Change':>12}")
    print("-" * 80)
    sorted_new = sorted(new_importance.items(), key=lambda x: x[1], reverse=True)
    for feature, importance in sorted_new:
        old_val = old_importance.get(feature, 0)
        change = importance - old_val
        change_str = f"{change:+.6f}" if feature in old_importance else "NEW"
        print(f"{feature:<15} {importance:>12.6f} {importance*100:>11.2f}% {change_str:>12}")
    print()
    
    # Highlight depth importance
    depth_importance = new_importance['depth']
    print("DEPTH FEATURE ANALYSIS:")
    print("-" * 80)
    print(f"Depth importance: {depth_importance:.6f} ({depth_importance*100:.2f}%)")
    print(f"Depth rank: {sorted([v for v in new_importance.values()], reverse=True).index(depth_importance) + 1} out of 7 features")
    print()
    
    # Calculate how much importance shifted
    print("IMPORTANCE REDISTRIBUTION:")
    print("-" * 80)
    for feature in OLD_FEATURES:
        old_val = old_importance[feature]
        new_val = new_importance[feature]
        change = new_val - old_val
        change_pct = (change / old_val * 100) if old_val > 0 else 0
        
        if abs(change) > 0.001:
            direction = "↓" if change < 0 else "↑"
            print(f"{feature:<15} {direction} {abs(change):.6f} ({change_pct:+.2f}%)")
    
    print(f"\nDepth absorbed: {depth_importance:.6f} ({depth_importance*100:.2f}%) from other features")
    print()
    
    print("=" * 80)

if __name__ == "__main__":
    main()
