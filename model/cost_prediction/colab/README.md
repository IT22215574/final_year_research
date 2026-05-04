# FishAI Colab-Style Training Notebooks

These notebooks are written in Colab format (`.ipynb`) and run directly in VS Code Jupyter.

## Notebooks

- `common_global_model_training.ipynb`
- `boat_type_imui_training.ipynb`
- `boat_type_idat_training.ipynb`
- `boat_type_idat_medium_legacy_training.ipynb`
- `boat_type_mtrp_training.ipynb`
- `boat_type_ofrp_training.ipynb`

The canonical per-boat notebooks are named by boat code so they match the backend export and saved model paths. `boat_type_idat_medium_legacy_training.ipynb` is retained only as a legacy variant; use `boat_type_idat_training.ipynb` for the active IDAT workflow.

## What each notebook does

1. Load dataset from the project (`data/` or `trips_export.csv` fallback)
2. Clean and normalize schema
3. Preprocess numeric features
4. Train multiple models (`RandomForest`, `ExtraTrees`, `GradientBoosting`, `HistGradientBoosting`)
5. Auto-select best model by lowest MAPE
6. Save model artifact and metadata JSON

## Output paths

- Global model output:
  - `model/cost_prediction/models/fishtripcost/global/best_model/`
- Boat-type model output:
  - `model/cost_prediction/models/fishtripcost/boat_type/<boat_type_slug>/best_model/`

## VS Code internal run steps

1. Open the notebook file in VS Code.
2. Select Python kernel from your `.venv`.
3. Run all cells in order.

## Important note for per-boat notebooks

Per-boat notebooks require a `boatType` column in the training CSV.
If your selected CSV has no `boatType`, notebook will stop with a clear message.

Recommended training export for per-boat models:

- `model/cost_prediction/data/training_candidates_export.csv`
  with at least:
- `boatType`, `distanceKm`, `speed`, `engineHP` (or `engineHorsePower`), `fishingHours` (or `tripDurationHours`), `weatherSeverityIndex` (or `windSpeed`), and `fuelUsedLiters` (or `actualFuelLiters`).
