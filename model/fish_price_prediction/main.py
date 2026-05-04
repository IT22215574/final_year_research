"""
Main entry point for Fish Price Prediction System

This script provides easy access to all components:
- Training: Train new models
- Prediction: Make price predictions
- GUI: Interactive prediction interface
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fish_price_prediction.train import FishPriceModelTrainer
from fish_price_prediction.predict import FishPricePredictor
from fish_price_prediction.predict.gui import FishPricePredictorGUI
import tkinter as tk


def print_menu():
    """Print the main menu"""
    print("\n" + "="*60)
    print("🐟 FISH PRICE PREDICTION SYSTEM")
    print("="*60)
    print("\n1. Train Models")
    print("2. Predict Price (CLI)")
    print("3. GUI Interface")
    print("4. Exit")
    print("\n" + "="*60)


def train_models():
    """Train the models"""
    print("\n🔄 Starting model training...")
    trainer = FishPriceModelTrainer()
    trainer.run_training_pipeline()


def predict_cli():
    """Interactive prediction via CLI"""
    print("\n🎯 Price Prediction (CLI Mode)")
    print("-" * 60)
    
    predictor = FishPricePredictor()
    
    # Get available fish
    fish_list = predictor.get_fish_list()
    if not fish_list:
        print("❌ No fish species available!")
        return
    
    print(f"\n📌 Available fish species ({len(fish_list)}):")
    for i, fish in enumerate(fish_list, 1):
        common_name = predictor.get_fish_common_name(fish)
        print(f"   {i}. {fish} ({common_name})")
    
    # Get fish selection
    try:
        choice = int(input("\nSelect fish number: "))
        if 1 <= choice <= len(fish_list):
            selected_fish = fish_list[choice - 1]
        else:
            print("❌ Invalid choice!")
            return
    except:
        print("❌ Invalid input!")
        return
    
    # Get date
    date_str = input("Enter date (YYYY-MM-DD) or press Enter for today: ").strip()
    if date_str:
        from datetime import datetime
        try:
            date = datetime.fromisoformat(date_str).date()
        except:
            print("❌ Invalid date format!")
            return
    else:
        from datetime import date
        date = date.today()
    
    # Make prediction
    print(f"\n🔄 Predicting price for {selected_fish} on {date}...")
    pred = predictor.predict(selected_fish, date)
    
    if pred:
        print(f"\n✅ PREDICTION RESULT:")
        print(f"   Fish: {selected_fish}")
        print(f"   Date: {pred['date'].strftime('%Y-%m-%d')}")
        print(f"   Predicted Price: Rs. {pred['price']:.2f} per Kg")
        print(f"   (RF: {pred['rf_prediction']:.2f}, XGB: {pred['xgb_prediction']:.2f})")
    else:
        print("❌ Prediction failed!")


def gui_mode():
    """Launch GUI"""
    print("\n🚀 Launching GUI Interface...")
    root = tk.Tk()
    app = FishPricePredictorGUI(root)
    root.mainloop()


def main():
    """Main program loop"""
    while True:
        print_menu()
        choice = input("Select option (1-4): ").strip()
        
        if choice == "1":
            train_models()
        elif choice == "2":
            predict_cli()
        elif choice == "3":
            gui_mode()
        elif choice == "4":
            print("\n👋 Goodbye!")
            break
        else:
            print("❌ Invalid option! Please try again.")


if __name__ == "__main__":
    main()
