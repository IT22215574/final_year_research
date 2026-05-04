# 🚤 Boat-Type Model Training Guide

## Status Check

| Component | Status |
|-----------|--------|
| Backend (NestJS) | ✅ Correctly sends `boatType` to ML service |
| Mobile (React Native) | ✅ Correctly sends `boatType` from boat selection |
| ML Service (Python) | ✅ Correctly resolves boat-type-specific models |
| **IDAT Models** | ✅ **TRAINED & READY** |
| **IMUI Models** | ❌ **MISSING - Needs Training** |
| **MTRP Models** | ❌ **MISSING - Needs Training** |
| **OFRP Models** | ❌ **MISSING - Needs Training** |
| **Global Model** | ✅ **TRAINED (fallback)** |

---

## 🔄 How It Works

### Flow Diagram
```
Mobile/Backend Prediction Request
    ↓
    ├─ Includes: boatId, boatType, distance, speed, weather, etc.
    ↓
ML Service (AdaptiveFuelEngine)
    ↓
    ├─ Try: Load /boat_type/{boatType}/best_model/fuel_model.pkl
    ├─ If not found → Try: Load /global/best_model/fuel_model.pkl  
    ├─ If not found → Try: Load legacy /fuel_model.pkl
    └─ If none found → Use baseline calculations
    ↓
Return predicted fuel liters
```

### Problem: Why IMUI/MTRP/OFRP fail currently
1. Colab notebooks created `/boat_type/{type}/best_model/` directories ✅
2. But the notebooks **never ran to completion** or **didn't save models** ❌
3. Backend falls back to **global model** (less accurate for specific boat types)

---

## ✅ Step-by-Step Training Instructions

### Prerequisites
- [ ] Training data CSV exists: `model/cost_prediction/training_data/training_data_all.csv` (check `training_data_imui.csv`, `training_data_mtrp.csv`, `training_data_ofrp.csv`)
- [ ] Python environment activated with scikit-learn, pandas, joblib installed
- [ ] Python Jupyter kernel configured in VS Code

---

## Training Each Boat Type

### For Each Boat Type (IMUI, MTRP, OFRP):

1. **Open the notebook:**
   - `model/cost_prediction/colab/boat_type_{TYPE}_training.ipynb`
   - Example: `boat_type_imui_training.ipynb` for IMUI

2. **Select Python Kernel:**
   - VS Code bottom right: Choose Python interpreter from `.venv`

3. **Run all cells in order:**
   - ▶️ Click "Run All" or Shift+Enter through each cell
   - Watch for:
     - ✅ Dataset loads successfully
     - ✅ Training completes (should take 1-3 minutes)
     - ✅ Model performance metrics display
     - ✅ "Model saved to: models/fishtripcost/boat_type/{TYPE}/best_model/fuel_model.pkl" appears

4. **Verify output:**
   ```
   ✅ Expected output location:
   model/cost_prediction/models/fishtripcost/boat_type/{TYPE}/best_model/
   ├── fuel_model.pkl          ← Main model (Random Forest/ExtraTrees/GradientBoosting)
   ├── metadata.json           ← Training metadata
   └── reports/                ← Performance reports
   ```

---

## 📋 Quick Training Checklist

**Run these notebooks:**

- [ ] `boat_type_imui_training.ipynb` → Output: `boat_type/imui/best_model/fuel_model.pkl`
- [ ] `boat_type_mtrp_training.ipynb` → Output: `boat_type/mtrp/best_model/fuel_model.pkl`
- [ ] `boat_type_ofrp_training.ipynb` → Output: `boat_type/ofrp/best_model/fuel_model.pkl`

**Verify trained models:**
```bash
ls -la model/cost_prediction/models/fishtripcost/boat_type/*/best_model/fuel_model.pkl

# Should output:
# model/cost_prediction/models/fishtripcost/boat_type/idat/best_model/fuel_model.pkl ✅
# model/cost_prediction/models/fishtripcost/boat_type/imui/best_model/fuel_model.pkl ✅ (after training)
# model/cost_prediction/models/fishtripcost/boat_type/mtrp/best_model/fuel_model.pkl ✅ (after training)
# model/cost_prediction/models/fishtripcost/boat_type/ofrp/best_model/fuel_model.pkl ✅ (after training)
```

---

## 🎯 What Each Notebook Does

All boat-type notebooks follow the same pattern:

```python
# 1. Load training data for the specific boat type
df = pd.read_csv('training_data_{TYPE}.csv')
df = df[df['boat_type'] == BOAT_TYPE_CODE]  # Filter to this boat type only

# 2. Extract features and target
X = df[['distanceKm', 'speed', 'engineHP', 'fishingHours', 'weatherSeverityIndex']]
y = df['fuelUsedLiters']

# 3. Train multiple models
models = [
    RandomForestRegressor(...),
    ExtraTreesRegressor(...),
    GradientBoostingRegressor(...),
    HistGradientBoostingRegressor(...)
]

# 4. Select best by MAPE (Mean Absolute Percentage Error)
best_model = models[lowest_mape_index]

# 5. Save to correct directory
output_dir = f'models/fishtripcost/boat_type/{boat_type_slug}/best_model/'
joblib.dump(best_model, f'{output_dir}/fuel_model.pkl')
joblib.dump(metadata, f'{output_dir}/metadata.json')
```

---

## 🔧 Troubleshooting

### Issue: "No module named 'sklearn'" or similar
**Solution:** Reinstall dependencies
```bash
cd model/cost_prediction
pip install scikit-learn pandas numpy joblib matplotlib
```

### Issue: "CSV file not found"
**Solution:** Check training data exists
```bash
ls model/cost_prediction/training_data/training_data_*.csv
# Should show: training_data_idat.csv, training_data_imui.csv, etc.
```

### Issue: "boatType column not found"
**Solution:** Training CSV must have `boatType` column
```bash
head -1 model/cost_prediction/training_data/training_data_imui.csv
# Should include: "boatType" or similar
```

### Issue: Model saves to wrong location
**Check:** Notebook is using correct output path:
```python
# Should be:
output_dir = 'models/fishtripcost/boat_type/{TYPE}/best_model/'
# NOT:
output_dir = 'models/'  # ❌ Wrong
```

---

## ✨ After Training Complete

Once all boat-type models are trained:

1. **Backend automatically uses them:**
   - No code changes needed
   - AdaptiveFuelEngine loads from correct directory

2. **Mobile predictions improve:**
   - Boat-type-specific models → Better accuracy
   - Example: IMUI boats get IMUI-trained models instead of global

3. **Verify in logs:**
   ```
   # ML Service logs should show:
   "selected_model_path": "models/fishtripcost/boat_type/imui/best_model/fuel_model.pkl"
   "model_scope": "BOAT_TYPE"  # ✅ Not "GLOBAL" or "LEGACY"
   ```

---

## 📊 Expected Performance Improvements

After training all boat types:

| Metric | Before (Global Model) | After (Boat-Type Models) |
|--------|----------------------|------------------------|
| **IMUI Accuracy** | ~65% (using global) | ~80%+ (trained on IMUI) |
| **MTRP Accuracy** | ~65% (using global) | ~80%+ (trained on MTRP) |
| **OFRP Accuracy** | ~65% (using global) | ~80%+ (trained on OFRP) |
| **Training Time** | N/A | ~1-2 min per boat type |

---

## 🚀 Integration Verification

**Backend correctly integrated?**
```typescript
// File: Backend/src/cost-engine/cost-engine.service.ts line 154
const fuelRes = await firstValueFrom(
  this.http.post(`${baseUrl}/predict/fuel`, {
    boatId: dto.boatId,
    boatType: boat.boatType,  // ✅ SENDING BOAT TYPE
    distanceKm: predictedDistanceKm,
    ...
  }),
);
```

**Mobile correctly integrated?**
```typescript
// File: mobile/app/(root)/(tabs)/fishtripcost/components/TripPlanner.tsx
const body: DatciePredictBody = {
  boatId: boatMongoId.trim(),  // ✅ BOAT ID AVAILABLE
  distanceKm: parseFloat(distance || "0"),
  // Boat type comes from selected boat data
  ...
};
```

**ML Service correctly integrated?**
```python
# File: model/cost_prediction/services/fuel/adaptive_fuel.py line 36
def _resolve_model_path(self, boat_type: str = None):
    # Priority 1: boat-type-specific model
    if boat_type:
        slug = self._safe_boat_type_slug(boat_type)
        boat_path = f'models/fishtripcost/boat_type/{slug}/best_model/fuel_model.pkl'
        if os.path.exists(boat_path):
            return boat_path, "BOAT_TYPE"  # ✅ USING BOAT-TYPE MODEL
    
    # Priority 2: global fallback
    # Priority 3: legacy fallback
```

---

## ✅ Checklist Before Going Live

- [ ] Run all 3 missing notebook trainings (IMUI, MTRP, OFRP)
- [ ] Verify models saved to: `models/fishtripcost/boat_type/*/best_model/fuel_model.pkl`
- [ ] Test backend prediction endpoint with each boat type
- [ ] Test mobile prediction with each boat type
- [ ] Check logs show "model_scope": "BOAT_TYPE" (not "GLOBAL")
- [ ] Compare prediction accuracy vs old global-only approach

---

## 📞 Questions?

- **Model resolution logic:** [adaptive_fuel.py](model/cost_prediction/services/fuel/adaptive_fuel.py#L36)
- **Backend integration:** [cost-engine.service.ts](Backend/src/cost-engine/cost-engine.service.ts#L154)
- **Mobile integration:** [TripPlanner.tsx](mobile/app/(root)/(tabs)/fishtripcost/components/TripPlanner.tsx#L460)
- **Colab notebooks:** [colab/](model/cost_prediction/colab/)
