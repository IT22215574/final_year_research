"""
Pipeline entry point for model training.
Called by run_excel_pipeline.py as a standalone script.
"""
import sys
from pathlib import Path

# Add model root to path so fish_price_prediction package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from fish_price_prediction.train.model_trainer import FishPriceModelTrainer

if __name__ == "__main__":
    trainer = FishPriceModelTrainer()
    success = trainer.run_training_pipeline()
    sys.exit(0 if success else 1)
