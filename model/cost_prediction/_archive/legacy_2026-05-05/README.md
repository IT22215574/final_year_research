# Archived legacy cost prediction files

Archived on 2026-05-05 by Codex after checking the active FastAPI flow.

These files were not on the current prediction path:

- Root DATCIE monolithic notebook
- Old root training scripts that write only models/fuel_model.pkl
- Synthetic/realistic legacy retraining scripts under scripts/

Current active flow kept in place:

- app.py / main.py
- services/
- training_data/
- colab/boat_type_*_training.ipynb and common_global_model_training.ipynb
- models/fishtripcost/**/best_model/fuel_model.pkl and metadata.json
- runtime JSON config/history files in models/

Moved files:
- DATCIE_Model_Training.ipynb
- train_fuel_model.py
- train_fuel5.py
- scripts\generate_realistic_training_data.py
- scripts\retrain_realistic_model.py
