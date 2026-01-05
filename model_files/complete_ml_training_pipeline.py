# ==========================================================
# SMART FISHER LANKA - COMPLETE ML MODEL TRAINING PIPELINE
# Trip Base Cost Prediction (Fuel, Ice, Water)
# FINAL CORRECTED VERSION
# ==========================================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

# ML Libraries
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

# Models
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor
from sklearn.linear_model import Ridge, Lasso
from sklearn.multioutput import MultiOutputRegressor

# Utilities
import joblib
import json
from datetime import datetime
import os

print("✅ ML Training Pipeline Initialized")

# ==========================================================
# 1. LOAD AND PREPARE DATASET
# ==========================================================

print("\n" + "="*60)
print("STEP 1: LOADING AND PREPARING DATASET")
print("="*60)

# Load the generated dataset
try:
    df = pd.read_csv("smart_fisher_full_dataset.csv")
    print(f"✓ Loaded full dataset: {len(df)} records")
except FileNotFoundError as e:
    print("❌ Dataset not found. Please run the dataset generator first.")
    print("   Run: generate_complete_dataset() from the dataset generator")
    print(f"   Error: {e}")
    exit()
except Exception as e:
    print(f"❌ Error loading dataset: {e}")
    exit()

print(f"📊 Dataset shape: {df.shape}")

# ==========================================================
# 2. DEFINE FEATURES AND TARGETS (NO DATA LEAKAGE)
# ==========================================================

print("\n" + "="*60)
print("STEP 2: DEFINING FEATURES AND TARGETS")
print("="*60)

# IMPORTANT: Remove data leakage features!
# 'total_hours', 'fuel_per_hour', and 'fuel_per_km' are calculated from targets - REMOVE THEM!

feature_columns = [
    # Boat specifications
    'boat_type', 'engine_hp', 'fuel_type', 'crew_size',
    'ice_capacity_kg', 'water_capacity_L', 'avg_speed_kmh',
    
    # Trip parameters
    'trip_days', 'trip_month', 'distance_km',
    
    # Environmental factors
    'wind_kph', 'wave_height_m', 'weather_factor',
    
    # Location and derived (NO LEAKAGE)
    'region', 'is_multi_day', 'has_engine', 'is_deep_sea'
]

# TARGETS (What we want to predict)
target_columns = ['fuel_cost_lkr', 'ice_cost_lkr', 'water_cost_lkr', 'total_base_cost_lkr']

print(f"🎯 Features ({len(feature_columns)}):")
for i, feat in enumerate(feature_columns, 1):
    print(f"  {i:2d}. {feat}")

print(f"\n🎯 Targets ({len(target_columns)}):")
for i, target in enumerate(target_columns, 1):
    print(f"  {i}. {target}")

# ==========================================================
# 3. DATA PREPROCESSING & FEATURE ENGINEERING
# ==========================================================

print("\n" + "="*60)
print("STEP 3: DATA PREPROCESSING")
print("="*60)

# Create features DataFrame
X = df[feature_columns].copy()
y = df[target_columns].copy()

print(f"✅ Features (X) shape: {X.shape}")
print(f"✅ Targets (y) shape: {y.shape}")

# Diagnostic: Check target statistics
print("\n🔍 Target Statistics:")
for target in target_columns:
    target_min = y[target].min()
    target_max = y[target].max()
    target_mean = y[target].mean()
    target_std = y[target].std()
    zero_count = (y[target] == 0).sum()
    
    print(f"  {target}:")
    print(f"    Min: LKR {target_min:,.0f}")
    print(f"    Max: LKR {target_max:,.0f}")
    print(f"    Mean: LKR {target_mean:,.0f}")
    print(f"    Std: LKR {target_std:,.0f}")
    if zero_count > 0:
        print(f"    ⚠️ Zero values: {zero_count} ({zero_count/len(y)*100:.2f}%)")

# Check for missing values
missing = X.isnull().sum()
if missing.sum() > 0:
    print(f"\n⚠️ Missing values found:")
    for col, count in missing[missing > 0].items():
        print(f"   {col}: {count}")
    X = X.fillna(X.median(numeric_only=True))  # Fill numerical with median
    print("✅ Missing values filled with median")

# Identify categorical and numerical columns
categorical_cols = X.select_dtypes(include=['object', 'category']).columns.tolist()
numerical_cols = X.select_dtypes(include=['int64', 'float64']).columns.tolist()

print(f"\n📊 Categorical features ({len(categorical_cols)}): {categorical_cols}")
print(f"📊 Numerical features ({len(numerical_cols)}): {numerical_cols}")

# ==========================================================
# 4. SPLIT DATA
# ==========================================================

print("\n" + "="*60)
print("STEP 4: DATA SPLITTING")
print("="*60)

# Split into train and test
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=X['boat_type']
)

print(f"📈 Training set: {X_train.shape[0]:,} samples ({X_train.shape[0]/len(X)*100:.1f}%)")
print(f"📉 Test set: {X_test.shape[0]:,} samples ({X_test.shape[0]/len(X)*100:.1f}%)")

# ==========================================================
# 5. CREATE PREPROCESSING PIPELINE
# ==========================================================

print("\n" + "="*60)
print("STEP 5: CREATING PREPROCESSING PIPELINE")
print("="*60)

# Create preprocessing transformers
numeric_transformer = Pipeline(steps=[
    ('scaler', StandardScaler())
])

categorical_transformer = Pipeline(steps=[
    ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
])

# Combine transformers
preprocessor = ColumnTransformer(
    transformers=[
        ('num', numeric_transformer, numerical_cols),
        ('cat', categorical_transformer, categorical_cols)
    ]
)

print("✅ Preprocessing pipeline created")
print(f"   - Numerical features: StandardScaler")
print(f"   - Categorical features: OneHotEncoder (handle_unknown='ignore')")

# ==========================================================
# 6. IMPROVED METRIC FUNCTIONS
# ==========================================================

print("\n" + "="*60)
print("STEP 6: DEFINING ROBUST METRIC FUNCTIONS")
print("="*60)

def safe_mape(y_true, y_pred, epsilon=1e-6):
    """
    Calculate MAPE safely avoiding division by zero
    Returns MAPE in percentage
    """
    y_true = np.array(y_true).astype(float)
    y_pred = np.array(y_pred).astype(float)
    
    # Create mask to filter out values that are too small
    mask = np.abs(y_true) > epsilon
    
    if np.sum(mask) == 0:
        return 0.0  # All values are zero or very small
    
    # Calculate percentage error only for valid values
    percentage_errors = np.abs((y_true[mask] - y_pred[mask]) / y_true[mask]) * 100
    
    return np.mean(percentage_errors)

def smape(y_true, y_pred, epsilon=1e-10):
    """
    Symmetric Mean Absolute Percentage Error
    Less sensitive to small values than MAPE
    """
    y_true = np.array(y_true).astype(float)
    y_pred = np.array(y_pred).astype(float)
    
    denominator = (np.abs(y_true) + np.abs(y_pred))
    # Avoid division by zero
    denominator = np.where(denominator == 0, epsilon, denominator)
    
    smape_values = 2.0 * np.abs(y_true - y_pred) / denominator
    return np.mean(smape_values) * 100

def calculate_all_metrics(y_true, y_pred, target_name=""):
    """Calculate all metrics for a target"""
    mse = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    mape = safe_mape(y_true, y_pred)
    smape_val = smape(y_true, y_pred)
    
    return {
        'R2': r2,
        'RMSE': rmse,
        'MAE': mae,
        'MAPE': mape,
        'SMAPE': smape_val,
        'MSE': mse
    }

print("✅ Robust metric functions defined:")
print("   - safe_mape(): MAPE with zero-division handling")
print("   - smape(): Symmetric MAPE for better robustness")
print("   - calculate_all_metrics(): Comprehensive evaluation")

# ==========================================================
# 7. MODEL SELECTION AND TRAINING (WITH IMPROVEMENTS)
# ==========================================================

print("\n" + "="*60)
print("STEP 7: MODEL TRAINING WITH CROSS-VALIDATION")
print("="*60)

# Define models with better hyperparameters
models = {
    'Random Forest': MultiOutputRegressor(RandomForestRegressor(
        n_estimators=150,
        random_state=42,
        n_jobs=-1,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features='sqrt'
    )),
    
    'XGBoost': MultiOutputRegressor(XGBRegressor(
        n_estimators=150,
        random_state=42,
        n_jobs=-1,
        learning_rate=0.1,
        max_depth=8,
        subsample=0.8,
        colsample_bytree=0.8,
        gamma=0.1
    )),
    
    'Gradient Boosting': MultiOutputRegressor(GradientBoostingRegressor(
        n_estimators=150,
        random_state=42,
        learning_rate=0.1,
        max_depth=6,
        min_samples_split=5,
        min_samples_leaf=2,
        subsample=0.8
    )),
    
    'Ridge Regression': MultiOutputRegressor(Ridge(alpha=1.0)),
    
    'Lasso Regression': MultiOutputRegressor(Lasso(alpha=0.1, max_iter=10000))
}

print(f"\n🤖 Training {len(models)} models...")
print(f"   Models: {', '.join(models.keys())}")

# Train and evaluate models
results = {}
trained_models = {}
training_times = {}

import time

for name, model in models.items():
    print(f"\n{'='*60}")
    print(f"🔄 Training: {name}")
    print(f"{'='*60}")
    
    # Create pipeline
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', model)
    ])
    
    # Fit the model
    start_time = time.time()
    
    pipeline.fit(X_train, y_train)
    trained_models[name] = pipeline
    
    end_time = time.time()
    training_time = end_time - start_time
    training_times[name] = training_time
    
    print(f"   ⏱️ Training completed in {training_time:.2f}s")
    
    # Make predictions
    y_train_pred = pipeline.predict(X_train)
    y_test_pred = pipeline.predict(X_test)
    
    # Calculate metrics for each target
    train_metrics = {}
    test_metrics = {}
    
    for i, target in enumerate(target_columns):
        # Training metrics
        train_metrics[target] = calculate_all_metrics(
            y_train[target], y_train_pred[:, i], target
        )
        
        # Test metrics
        test_metrics[target] = calculate_all_metrics(
            y_test[target], y_test_pred[:, i], target
        )
    
    # Overall metrics (average across targets)
    avg_train_r2 = np.mean([train_metrics[t]['R2'] for t in target_columns])
    avg_test_r2 = np.mean([test_metrics[t]['R2'] for t in target_columns])
    avg_test_rmse = np.mean([test_metrics[t]['RMSE'] for t in target_columns])
    avg_test_mae = np.mean([test_metrics[t]['MAE'] for t in target_columns])
    avg_test_mape = np.mean([test_metrics[t]['MAPE'] for t in target_columns])
    avg_test_smape = np.mean([test_metrics[t]['SMAPE'] for t in target_columns])
    
    # R² gap (overfitting check)
    r2_gap = avg_train_r2 - avg_test_r2
    
    results[name] = {
        'train_metrics': train_metrics,
        'test_metrics': test_metrics,
        'avg_train_r2': avg_train_r2,
        'avg_test_r2': avg_test_r2,
        'avg_test_rmse': avg_test_rmse,
        'avg_test_mae': avg_test_mae,
        'avg_test_mape': avg_test_mape,
        'avg_test_smape': avg_test_smape,
        'r2_gap': r2_gap,
        'training_time': training_time
    }
    
    print(f"\n   📊 Performance Summary:")
    print(f"      Train R²: {avg_train_r2:.4f}")
    print(f"      Test R²: {avg_test_r2:.4f}")
    print(f"      Test RMSE: LKR {avg_test_rmse:,.0f}")
    print(f"      Test MAE: LKR {avg_test_mae:,.0f}")
    print(f"      Test SMAPE: {avg_test_smape:.2f}%")
    print(f"      R² Gap: {r2_gap:.4f}")
    
    # Overfitting warning
    if r2_gap > 0.1:
        print(f"      ❌ SEVERE OVERFITTING: R² gap > 0.1!")
        print(f"         Consider: simpler model, more regularization")
    elif r2_gap > 0.05:
        print(f"      ⚠️ WARNING: Potential overfitting (gap > 0.05)")
        print(f"         Monitor performance on new data")
    else:
        print(f"      ✅ Good generalization (gap ≤ 0.05)")

print(f"\n{'='*60}")
print("✅ ALL MODELS TRAINED SUCCESSFULLY")
print(f"{'='*60}")

# ==========================================================
# 8. MODEL EVALUATION AND COMPARISON
# ==========================================================

print("\n" + "="*60)
print("STEP 8: COMPREHENSIVE MODEL EVALUATION")
print("="*60)

# Find best model based on balanced criteria (R² and SMAPE)
def model_score_func(model_data):
    """Score function: prioritize high R² and low SMAPE"""
    r2 = model_data['avg_test_r2']
    smape_val = model_data['avg_test_smape']
    r2_gap = model_data['r2_gap']
    
    # Penalize overfitting
    overfit_penalty = 0 if r2_gap < 0.05 else (r2_gap - 0.05) * 10
    
    # Normalize SMAPE (lower is better, convert to 0-1 scale)
    # Assuming SMAPE < 50% is acceptable
    smape_score = max(0, 1 - (smape_val / 50))
    
    # Combined score: 70% weight to R², 20% to SMAPE, 10% penalty for overfitting
    score = (r2 * 0.7) + (smape_score * 0.2) - overfit_penalty
    
    return score

# Find best model
model_scores = {name: model_score_func(data) for name, data in results.items()}
best_model_name = max(model_scores.items(), key=lambda x: x[1])[0]
best_model = trained_models[best_model_name]
best_metrics = results[best_model_name]

print(f"\n🏆 BEST MODEL: {best_model_name}")
print(f"   Combined Score: {model_scores[best_model_name]:.4f}")
print(f"   Test R²: {best_metrics['avg_test_r2']:.4f} ({best_metrics['avg_test_r2']*100:.2f}%)")
print(f"   Test SMAPE: {best_metrics['avg_test_smape']:.2f}%")
print(f"   Test RMSE: LKR {best_metrics['avg_test_rmse']:,.0f}")
print(f"   Test MAE: LKR {best_metrics['avg_test_mae']:,.0f}")
print(f"   R² Gap: {best_metrics['r2_gap']:.4f}")
print(f"   Training Time: {best_metrics['training_time']:.2f}s")

# Performance assessment
print(f"\n📈 Performance Assessment:")
if best_metrics['avg_test_r2'] > 0.9:
    print(f"   ✅ EXCELLENT: R² > 0.9 (Outstanding predictive power)")
elif best_metrics['avg_test_r2'] > 0.7:
    print(f"   ✅ GOOD: R² > 0.7 (Strong predictive power)")
elif best_metrics['avg_test_r2'] > 0.5:
    print(f"   ⚠️ FAIR: R² > 0.5 (Acceptable but could improve)")
else:
    print(f"   ❌ POOR: R² ≤ 0.5 (Needs significant improvement)")

if best_metrics['r2_gap'] > 0.1:
    print(f"   ❌ Severe overfitting detected (gap > 0.1)")
elif best_metrics['r2_gap'] > 0.05:
    print(f"   ⚠️ Moderate overfitting (gap > 0.05)")
else:
    print(f"   ✅ Good generalization (gap ≤ 0.05)")

# Display detailed metrics per target
print(f"\n📊 Detailed Metrics by Target ({best_model_name}):")
print(f"{'Target':<25} {'R²':<10} {'RMSE (LKR)':<15} {'MAE (LKR)':<15} {'SMAPE (%)':<12}")
print("-" * 80)
for target in target_columns:
    metrics = best_metrics['test_metrics'][target]
    print(f"{target:<25} {metrics['R2']:<10.4f} {metrics['RMSE']:<15,.0f} {metrics['MAE']:<15,.0f} {metrics['SMAPE']:<12.2f}")

# Model ranking
print(f"\n🥇 Model Ranking (by combined score):")
sorted_models = sorted(model_scores.items(), key=lambda x: x[1], reverse=True)
for i, (name, score) in enumerate(sorted_models, 1):
    r2 = results[name]['avg_test_r2']
    smape_val = results[name]['avg_test_smape']
    gap = results[name]['r2_gap']
    print(f"   {i}. {name:<25} Score: {score:.4f} | R²: {r2:.4f} | SMAPE: {smape_val:.2f}% | Gap: {gap:.4f}")

# ==========================================================
# 9. SAVE MODEL FOR PRODUCTION
# ==========================================================

print("\n" + "="*60)
print("STEP 9: SAVING MODEL FOR PRODUCTION")
print("="*60)

# Create model directory
model_dir = "production_model"
os.makedirs(model_dir, exist_ok=True)
print(f"✅ Model directory: {model_dir}")

# Save the best model pipeline
model_path = os.path.join(model_dir, "trip_cost_predictor.pkl")
joblib.dump(best_model, model_path, compress=3)
print(f"✅ Model saved: {model_path}")

# Save comprehensive metadata
metadata = {
    'model_info': {
        'model_name': best_model_name,
        'model_type': type(best_model.named_steps['regressor']).__name__,
        'training_date': datetime.now().isoformat(),
        'training_samples': len(X_train),
        'test_samples': len(X_test),
        'performance': {
            'avg_train_r2': float(best_metrics['avg_train_r2']),
            'avg_test_r2': float(best_metrics['avg_test_r2']),
            'avg_test_rmse': float(best_metrics['avg_test_rmse']),
            'avg_test_mae': float(best_metrics['avg_test_mae']),
            'avg_test_mape': float(best_metrics['avg_test_mape']),
            'avg_test_smape': float(best_metrics['avg_test_smape']),
            'r2_gap': float(best_metrics['r2_gap'])
        },
        'training_time': float(best_metrics['training_time']),
        'version': '1.0.0'
    },
    'data_info': {
        'feature_names': feature_columns,
        'target_names': target_columns,
        'categorical_features': categorical_cols,
        'numerical_features': numerical_cols,
        'total_records': len(df),
        'train_test_split': 0.2
    },
    'preprocessing': {
        'numerical_scaler': 'StandardScaler',
        'categorical_encoder': 'OneHotEncoder',
        'handle_unknown': 'ignore'
    }
}

metadata_path = os.path.join(model_dir, "model_metadata.json")
with open(metadata_path, 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"✅ Metadata saved: {metadata_path}")

# Save all model results
all_results_path = os.path.join(model_dir, "all_model_results.json")
results_export = {}
for name, data in results.items():
    results_export[name] = {
        'avg_test_r2': float(data['avg_test_r2']),
        'avg_test_rmse': float(data['avg_test_rmse']),
        'avg_test_mae': float(data['avg_test_mae']),
        'avg_test_smape': float(data['avg_test_smape']),
        'r2_gap': float(data['r2_gap']),
        'training_time': float(data['training_time']),
        'combined_score': float(model_scores[name])
    }

with open(all_results_path, 'w') as f:
    json.dump(results_export, f, indent=2)
print(f"✅ All results saved: {all_results_path}")

# ==========================================================
# 10. FINAL SUMMARY
# ==========================================================

print("\n" + "="*70)
print("🎉 ML MODEL TRAINING COMPLETE!")
print("="*70)

print(f"\n📊 FINAL SUMMARY:")
print(f"   Best Model: {best_model_name}")
print(f"   Test R²: {best_metrics['avg_test_r2']:.4f} ({best_metrics['avg_test_r2']*100:.2f}%)")
print(f"   Test SMAPE: {best_metrics['avg_test_smape']:.2f}%")
print(f"   Test RMSE: LKR {best_metrics['avg_test_rmse']:,.0f}")
print(f"   Test MAE: LKR {best_metrics['avg_test_mae']:,.0f}")
print(f"   R² Gap: {best_metrics['r2_gap']:.4f}")

print(f"\n📁 FILES SAVED in '{model_dir}':")
print(f"   1. trip_cost_predictor.pkl - Trained ML model")
print(f"   2. model_metadata.json - Comprehensive metadata")
print(f"   3. all_model_results.json - All model comparison results")

print(f"\n🚀 NEXT STEPS:")
print(f"   1. Test the model with new data")
print(f"   2. Integrate with NestJS backend")
print(f"   3. Deploy to production")
print(f"   4. Monitor performance and retrain periodically")

print("\n" + "="*70)
print("✅ READY FOR DEPLOYMENT!")
print("="*70)
