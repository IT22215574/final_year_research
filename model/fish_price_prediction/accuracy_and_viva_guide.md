# 🎯 Model Accuracy Calculation & Viva Q&A Guide
### Fish Price Prediction — Step-by-Step Explanation

---

## PART 1: HOW ACCURACY IS CALCULATED — STEP BY STEP

---

### STEP 1 — Data is Split (80% Train / 20% Test)

**Code in `model_trainer.py` (line 170–172):**
```python
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
```

**What this means:**
- Suppose the dataset has **1000 rows** (1000 fish price records)
- `X_train` = 800 rows → model **learns** from this
- `X_test`  = 200 rows → model **never sees** this during training
- `y_test`  = the **real actual prices** for those 200 test rows
- `random_state=42` ensures the same split every time (reproducible)

> [!IMPORTANT]
> The test set is **completely hidden** from the model during training. This is how we measure honest accuracy — the model predicts prices it has never seen before.

---

### STEP 2 — Model Makes Predictions on Test Set

**Code (lines 182–184 for RF, 191–193 for XGB):**
```python
# Random Forest predicts on 200 unseen test rows
rf_pred = self.rf_model.predict(X_test)

# XGBoost predicts on the same 200 unseen test rows
xgb_pred = self.xgb_model.predict(X_test)
```

**Example (simplified):**
| Row | Actual Price (y_test) | RF Predicted | XGB Predicted |
|-----|----------------------|-------------|--------------|
| 1   | Rs. 850              | Rs. 820     | Rs. 840      |
| 2   | Rs. 1200             | Rs. 1180    | Rs. 1210     |
| 3   | Rs. 600              | Rs. 640     | Rs. 610      |
| ... | ...                  | ...         | ...          |

---

### STEP 3 — MAE (Mean Absolute Error) is Calculated

**Code:**
```python
rf_mae  = mean_absolute_error(y_test, rf_pred)
xgb_mae = mean_absolute_error(y_test, xgb_pred)
```

**Formula:**
```
MAE = (1/n) × Σ | actual_price - predicted_price |
```

**Example calculation:**
```
Row 1: |850 - 820| = 30
Row 2: |1200 - 1180| = 20
Row 3: |600 - 640|  = 40

MAE = (30 + 20 + 40) / 3 = Rs. 30.00
```

**What MAE means:**
- If MAE = Rs. 45.00, the model is **wrong by Rs. 45 on average**
- Lower MAE = better model
- MAE is in the **same unit as the prediction** (Rupees), so it is easy to explain

---

### STEP 4 — R² Score (R-squared) is Calculated

**Code:**
```python
rf_r2  = r2_score(y_test, rf_pred)
xgb_r2 = r2_score(y_test, xgb_pred)
```

**Formula:**
```
R² = 1 - (SS_residual / SS_total)

SS_residual = Σ (actual - predicted)²      ← model's errors
SS_total    = Σ (actual - mean_actual)²    ← baseline variance
```

**Interpretation table:**

| R² Value | Meaning |
|----------|---------|
| 1.00 | Perfect — model predicts exactly |
| 0.90+ | Excellent |
| 0.75–0.90 | Good |
| 0.50–0.75 | Moderate |
| < 0.50 | Poor |
| 0.00 | Model is no better than always predicting the mean |
| < 0 | Model is worse than just using the average |

**Simple explanation for viva:**
> "R² of 0.85 means our model explains 85% of the variation in fish prices. Only 15% of the price variation is not captured by our features."

---

### STEP 5 — 5-Fold Cross Validation (CV)

**Code (lines 197–201):**
```python
rf_cv  = cross_val_score(self.rf_model, X, y, cv=5, scoring='r2')
xgb_cv = cross_val_score(self.xgb_model, X, y, cv=5, scoring='r2')

print(f"RF CV R²:  {rf_cv.mean():.4f} (+/- {rf_cv.std():.4f})")
print(f"XGB CV R²: {xgb_cv.mean():.4f} (+/- {xgb_cv.std():.4f})")
```

**How 5-Fold CV works — visually:**
```
Full Dataset (1000 rows)
│
├── Fold 1: [TEST: rows 1-200]   [TRAIN: rows 201-1000]  → R²₁
├── Fold 2: [TRAIN: 1-200]  [TEST: rows 201-400]  [TRAIN: 401-1000] → R²₂
├── Fold 3: [TRAIN: 1-400]  [TEST: rows 401-600]  [TRAIN: 601-1000] → R²₃
├── Fold 4: [TRAIN: 1-600]  [TEST: rows 601-800]  [TRAIN: 801-1000] → R²₄
└── Fold 5: [TRAIN: 1-800]  [TEST: rows 801-1000] → R²₅

Final CV R² = mean(R²₁, R²₂, R²₃, R²₄, R²₅)
Std Dev     = std(R²₁, R²₂, R²₃, R²₄, R²₅)
```

**What the output looks like:**
```
RF CV R² Score:  0.8412 (+/- 0.0231)
XGB CV R² Score: 0.8654 (+/- 0.0198)
```

**Why CV is better than a single train/test split:**
- A single split might get lucky or unlucky with which rows end up in test
- CV tests the model **5 different times** on 5 different subsets
- The **average R²** is a much more reliable accuracy measure
- Small **std dev (+/-)** means the model is **consistent** — not lucky

---

### STEP 6 — Metrics Imported (from sklearn)

**Code (line 16):**
```python
from sklearn.metrics import (
    mean_absolute_error,       # MAE
    mean_squared_error,        # MSE (for RMSE)
    r2_score,                  # R²
    mean_absolute_percentage_error  # MAPE
)
```

**All four metrics defined in `config.py`:**
```python
METRICS = ["MAE", "RMSE", "R2", "MAPE"]
```

| Metric | Full Name | Formula | Unit |
|--------|-----------|---------|------|
| MAE  | Mean Absolute Error | mean(\|actual - pred\|) | Rupees |
| RMSE | Root Mean Squared Error | sqrt(mean((actual-pred)²)) | Rupees |
| R²   | R-squared / Coefficient of Determination | 1 - SS_res/SS_tot | 0 to 1 |
| MAPE | Mean Absolute Percentage Error | mean(\|actual-pred\|/actual)×100 | % |

> [!NOTE]
> RMSE **penalizes large errors more** than MAE because errors are squared. If RMSE >> MAE, it means the model has a few very bad predictions (outliers).

---

### STEP 7 — Final Output Printed

When training completes, the console prints:
```
✅ RF  - MAE: 48.23, R²: 0.8612
✅ XGB - MAE: 41.97, R²: 0.8891
RF  CV R² Score: 0.8412 (+/- 0.0231)
XGB CV R² Score: 0.8654 (+/- 0.0198)
```

**How to read this:**
- RF MAE of 48 means Random Forest is on average Rs. 48 off from the real price
- XGB R² of 0.89 means XGBoost explains 89% of price variation
- XGBoost performs better here — it has lower MAE and higher R²
- The ensemble averages both to get a balanced final prediction

---

## PART 2: COMPLETE VIVA QUESTIONS & ANSWERS

---

### 🔵 CATEGORY A — Basic ML Questions

**Q1: What type of ML problem is this — Classification or Regression?**

> **Answer:** This is a **Regression** problem. We are predicting a **continuous numeric value** (fish price in Rupees). Classification would be used if we were predicting a category like "High / Medium / Low" price.

---

**Q2: Why did you choose Random Forest and XGBoost specifically?**

> **Answer:** Both are **ensemble tree-based** algorithms well-suited for structured/tabular data like ours.
> - **Random Forest** builds 100 trees in **parallel** (bagging) and averages them — it's stable and resistant to outliers.
> - **XGBoost** builds trees **sequentially**, each correcting the previous one's errors (boosting) — it captures complex nonlinear patterns better.
> - Together as an **ensemble average**, they balance each other's weaknesses: RF handles outliers better, XGB achieves lower error.

---

**Q3: What is overfitting? How did you prevent it?**

> **Answer:** Overfitting is when a model **memorizes the training data** and performs well on training but poorly on new/unseen data.
>
> Prevention techniques used in this project:
> 1. **`max_depth=10`** for RF — limits how deep each tree can grow
> 2. **`min_samples_leaf=2`** — each leaf needs at least 2 data points
> 3. **`subsample=0.8`** in XGBoost — each tree only sees 80% of data
> 4. **80/20 train-test split** — model never trained on test data
> 5. **5-Fold Cross Validation** — confirms the model generalizes well

---

**Q4: What is the target variable (y) in your model?**

> **Answer:** The target variable is **`wholesale_price`** — the weekly wholesale price of fish in Sri Lankan Rupees (LKR) per kilogram, collected from the Colombo fish market weekly price sheets.

---

**Q5: How many features (X) does your model use?**

> **Answer:** The model uses all **numeric columns** in `features_dataset.csv` except `date`, `sinhala_name`, `common_name`, and `wholesale_price`. This includes:
> - Time features: `day_of_week`, `month`, `year`, `week_of_year`, `month_sin`, `month_cos`
> - Season features: `fishing_season`, `is_waragam_west`, `is_waragam_east`, `is_awaragam`, `is_rough_sea_season`
> - Special day features: `is_weekend`, `is_festival_day`, `is_poya`, `days_to_festival`, `before_festival_window`
> - Fuel features: `lk_price`, `lk_price_lag1`, `lk_price_lag2`, `lk_price_change`
> - Weather: `weather_effect`, `rainfall_sum`, `temp_c_mean`, `wind_speed_max`
> - Fish identity: `fish_encoded`
> - Composite: `price_behavior_signal`

---

### 🟠 CATEGORY B — Accuracy & Metrics Questions

**Q6: What is R² and what value did your model get?**

> **Answer:** R² (R-squared) measures what **percentage of the price variation** the model explains.
> - Formula: `R² = 1 - (sum of squared errors / total variance)`
> - A value of **0.85** means the model explains **85% of fish price variation**.
> - The remaining 15% is due to factors not in our data (e.g., individual market negotiations, sudden events).

---

**Q7: What is MAE and why is it preferred over Accuracy % for this problem?**

> **Answer:** MAE (Mean Absolute Error) = average of `|actual price - predicted price|`.
> - For **regression**, there is no simple "accuracy %" because predictions are continuous numbers.
> - MAE gives a **practical, understandable error**: "on average, our prediction is Rs. X away from the real price."
> - A grocery shopper, fisherman, or buyer can immediately understand "model is off by Rs. 40" — unlike a percentage-based accuracy metric.

---

**Q8: What is the difference between MAE and RMSE?**

> **Answer:**
> - **MAE** = `mean(|errors|)` — treats all errors equally
> - **RMSE** = `sqrt(mean(errors²))` — **squares each error first**, so large errors are punished more
> - If RMSE is much larger than MAE, it signals the model has **a few very large prediction errors** (outliers)
> - Example: MAE=50, RMSE=120 → some predictions are severely wrong even though the average is 50

---

**Q9: Why did you use 5-fold Cross Validation?**

> **Answer:** A single train/test split can be misleading — it depends on which rows happened to fall in test by chance. 5-fold CV:
> 1. Splits data into 5 equal parts
> 2. Trains 5 times, each time using a different part as the test set
> 3. Reports the **average R² across all 5 tests**
> This gives a **statistically reliable estimate** of how the model performs on unseen data, reducing luck/bias of a single split.

---

**Q10: What does the `+/- std deviation` mean in your CV result?**

> **Answer:** The `+/-` value shows **consistency** of the model across different data splits.
> - `RF CV R²: 0.84 (+/- 0.02)` → across 5 folds, R² ranged from about 0.82 to 0.86
> - **Small std dev** = model is consistent and stable — not just performing well on easy test splits
> - **Large std dev** = model is unstable, possibly overfitting on some splits

---

### 🟢 CATEGORY C — Feature Engineering Questions

**Q11: Why did you encode months as sin and cos instead of using the number 1–12?**

> **Answer:** If we use month numbers 1–12, the model "thinks" December (12) and January (1) are 11 months apart — but they are actually adjacent (just 1 month apart in a cyclic year).
>
> Sine/cosine encoding wraps months onto a **circle**:
> ```
> month_sin = sin(2π × month / 12)
> month_cos = cos(2π × month / 12)
> ```
> Now December and January have very similar sin/cos values, correctly representing seasonal continuity.

---

**Q12: Why is `fish_encoded` used instead of the actual fish name?**

> **Answer:** ML algorithms work with **numbers only**, not text strings. We use `sklearn.LabelEncoder` to map each fish's Sinhala name to a unique integer:
> - `කට්ටලෝව` → 0, `ලේන්` → 1, `හීරා` → 2, etc.
> - The mapping is **saved as `le_sinhala.pkl`** so the same encoding is used during prediction
> - This ensures the model sees a consistent numeric identity for each fish species

---

**Q13: What is `price_behavior_signal`?**

> **Answer:** It is a **composite feature** that combines three disruption signals into one number:
> ```
> price_behavior_signal = weather_effect + poya_effect + festival_effect
> ```
> - Value 0 = Normal day (no disruptions)
> - Value 1 = One disruption (e.g., only bad weather)
> - Value 2 = Two disruptions (e.g., Poya day + bad weather)
> - Value 3 = Maximum disruption (bad weather + Poya + major festival)
>
> Higher values strongly correlate with higher fish prices because supply is reduced or demand spikes.

---

**Q14: What are Waragam and Awaragam seasons?**

> **Answer:** These are Sri Lankan traditional fishing seasons based on monsoon patterns:
> - **Waragam-West** (May–Sep): South-West monsoon → rough seas on the West coast → less fishing → prices rise
> - **Waragam-East** (Oct–Jan): North-East monsoon → rough seas on the East coast → less fishing → prices rise
> - **Awaragam** (Feb–Apr): Calm season → both coasts are accessible → abundant supply → prices drop
>
> These are **critical domain features** that directly capture the **supply-side disruptions** that drive price changes in Sri Lanka.

---

**Q15: Why are fuel price LAG features included?**

> **Answer:** A kerosene price increase today doesn't immediately lower supply — fishermen might still go out for a day or two before reducing trips. The **lag features** (`lk_price_lag1`, `lk_price_lag2`) capture this **delayed economic effect**:
> - If kerosene rose 3 days ago, fishermen may now be reducing trips
> - The model learns this time-delayed pattern and adjusts price predictions accordingly

---

### 🔴 CATEGORY D — System Design Questions

**Q16: Why did you use an ensemble (average) of RF and XGB instead of just one model?**

> **Answer:** Each model has strengths and weaknesses:
> - RF can have **high bias** (slight underfitting) but is very stable
> - XGB can have **high variance** (slight overfitting) but captures complex patterns
>
> Averaging them:
> 1. Reduces XGB's overfitting tendency
> 2. Reduces RF's underfitting tendency
> 3. The combined prediction is **more stable and more accurate** than either alone
>
> This is the principle of **ensemble learning** — "wisdom of the crowd" for models.

---

**Q17: How does the system handle missing weather data?**

> **Answer:** In `run_excel_pipeline.py`, all steps use `critical=False`:
> ```python
> run_python(weather_fetcher, critical=False)
> ```
> If weather data is unavailable (no internet), the script skips that step and continues. During merge, weather columns simply remain as `NaN`. In `feature_engineering.py`:
> ```python
> df["weather_effect"] = 0  # default if no rainfall column found
> ```
> Missing numeric features are filled with column means (`X.fillna(X.mean())`). The model still predicts using the remaining features.

---

**Q18: How does the model predict for a future date it has never seen?**

> **Answer:** The model is trained on **feature patterns**, not specific dates. For any future date, we compute the exact same features:
> - What month is it? → seasonal pattern
> - Is it a Poya day? → demand drop
> - What is the forecasted weather? → supply disruption
> - What is the current fuel price? → operational cost
>
> These features work the same way for past and future dates. The model learned **rules** like "when it's Waragam season + Poya day → price tends to be higher" — and applies these rules to any date.

---

**Q19: How do you know your model isn't just memorizing the training data?**

> **Answer:** Three layers of verification:
> 1. **Train/test split**: 20% of data held out — model never trained on it
> 2. **5-fold cross validation**: Model tested 5 times on different unseen subsets — consistent performance confirms no memorization
> 3. **Hyperparameter limits**: `max_depth=10` and `min_samples_leaf=2` structurally prevent decision trees from growing complex enough to memorize individual data points

---

**Q20: What are the limitations of your model?**

> **Answer:** Honest limitations:
> 1. **Weekly data granularity**: Raw price data is collected weekly, so the model cannot predict daily fluctuations within a week
> 2. **No real-time price feedback**: The model cannot learn from prices after deployment without retraining
> 3. **External shocks**: Sudden events (economic crisis, natural disaster, disease outbreak) are not in the training data and cannot be predicted
> 4. **Unseen fish species**: If a new species appears that wasn't in training data, it gets encoded as `0` (default), reducing accuracy
> 5. **Fuel price assumptions**: For future predictions, fuel price is forward-filled from the last known value, which may not reflect actual future prices

---

**Q21: How would you improve the model in the future?**

> **Answer:**
> 1. **Add more data**: More years of historical price data → better seasonal patterns
> 2. **Daily price data**: Move from weekly to daily collection for finer granularity
> 3. **LSTM / Time Series models**: Use deep learning (LSTM/GRU) to capture sequential price trends
> 4. **Market supply data**: Add fish landing quantity data from fisheries department
> 5. **Hyperparameter tuning**: Use `GridSearchCV` or `Optuna` to optimize RF/XGB parameters
> 6. **Online learning**: Periodically retrain the model with new price data to stay current

---

### 🟣 CATEGORY E — Quick-Fire Technical Questions

| Question | Short Answer |
|----------|-------------|
| What library is used for ML? | `scikit-learn` (sklearn) + `xgboost` |
| How are models saved? | `pickle.dump()` → `.pkl` files |
| What is `random_state=42`? | Fixed seed for reproducibility — same split every run |
| What does `n_jobs=-1` do? | Uses ALL available CPU cores for parallel training |
| What is LabelEncoder? | Converts text categories (fish names) to integer numbers |
| What is `test_size=0.2`? | 20% of data used for testing, 80% for training |
| Where are models stored? | `fish_price_prediction/models/` folder |
| What file triggers training? | `train/_run_training.py` (called by `run_excel_pipeline.py`) |
| What is the prediction output? | `future_price_predictions.csv` with date + fish + predicted_price |
| What API is used for weather? | Open-Meteo (free, no API key required) |
| What API is used for festivals? | Calendarific.com (optional, backup to hardcoded dates) |
| What is `learning_rate=0.1` in XGB? | Controls how much each new tree corrects previous errors |
| What is `subsample=0.8` in XGB? | Each tree uses 80% of training data (reduces overfitting) |

---

## SUMMARY — Key Numbers to Remember for Viva

| Parameter | Value | Why |
|-----------|-------|-----|
| Train/Test Split | 80% / 20% | Standard ML practice |
| CV Folds | 5 | Balance between reliability and speed |
| RF n_estimators | 100 trees | Enough for stability without excess compute |
| RF max_depth | 10 | Prevents memorization |
| XGB learning_rate | 0.1 | Small steps = less overfitting |
| XGB subsample | 0.8 | Random sampling per tree |
| Ensemble method | Average (50/50) | Equal weight to both models |
| Evaluation metrics | MAE, RMSE, R², MAPE | All standard regression metrics |
| Primary accuracy metric | R² + MAE | R² for variance explained, MAE for practical error |

---

*Accuracy & Viva Guide — Fish Price Prediction Model*
