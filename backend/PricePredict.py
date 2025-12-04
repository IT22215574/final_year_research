import tkinter as tk
from tkinter import ttk, messagebox
from tkcalendar import DateEntry
import pickle
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime

class FishPricePredictorGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Fish Price Predictor")
        self.root.geometry("600x500")
        self.root.resizable(False, False)
        
        # Load models and encoders
        self.load_models()
        
        # Setup GUI
        self.setup_gui()
    
    def load_models(self):
        """Load trained models and encoders"""
        try:
            # Get script directory and navigate to backend/models
            script_dir = Path(__file__).parent
            models_folder = script_dir / "models"
            
            # Load models
            with open(models_folder / "rf_model.pkl", "rb") as f:
                self.rf_model = pickle.load(f)
            
            with open(models_folder / "gb_model.pkl", "rb") as f:
                self.gb_model = pickle.load(f)
            
            # Load encoders
            with open(models_folder / "le_sinhala.pkl", "rb") as f:
                self.le_sinhala = pickle.load(f)
            
            with open(models_folder / "le_common.pkl", "rb") as f:
                self.le_common = pickle.load(f)
            
            # Load fish names
            self.fish_names_df = pd.read_csv(models_folder / "fish_names.csv")
            self.fish_list = sorted(self.fish_names_df['sinhala_name'].unique().tolist())
            
            print("✅ Models loaded successfully!")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load models:\n{str(e)}\n\nPlease run model_train.py first!")
            self.root.destroy()
    
    def setup_gui(self):
        """Setup the GUI components"""
        # Title
        title_frame = tk.Frame(self.root, bg="#2c3e50", height=80)
        title_frame.pack(fill="x")
        title_frame.pack_propagate(False)
        
        title_label = tk.Label(
            title_frame,
            text="🐟 Fish Price Predictor",
            font=("Arial", 24, "bold"),
            bg="#2c3e50",
            fg="white"
        )
        title_label.pack(pady=20)
        
        # Main frame
        main_frame = tk.Frame(self.root, padx=40, pady=30)
        main_frame.pack(fill="both", expand=True)
        
        # Date selection
        date_label = tk.Label(
            main_frame,
            text="Select Date:",
            font=("Arial", 12, "bold")
        )
        date_label.grid(row=0, column=0, sticky="w", pady=10)
        
        self.date_entry = DateEntry(
            main_frame,
            font=("Arial", 11),
            width=30,
            background='darkblue',
            foreground='white',
            borderwidth=2,
            date_pattern='dd/mm/yyyy',
            mindate=datetime(2024, 1, 1),
            maxdate=datetime(2030, 12, 31)
        )
        self.date_entry.grid(row=0, column=1, pady=10, padx=10)
        
        # Fish selection
        fish_label = tk.Label(
            main_frame,
            text="Select Fish:",
            font=("Arial", 12, "bold")
        )
        fish_label.grid(row=1, column=0, sticky="w", pady=10)
        
        self.fish_combobox = ttk.Combobox(
            main_frame,
            values=self.fish_list,
            font=("Arial", 11),
            width=28,
            state="readonly"
        )
        self.fish_combobox.grid(row=1, column=1, pady=10, padx=10)
        self.fish_combobox.set("Select a fish...")
        
        # Submit button
        submit_btn = tk.Button(
            main_frame,
            text="Predict Price",
            font=("Arial", 13, "bold"),
            bg="#27ae60",
            fg="white",
            activebackground="#229954",
            activeforeground="white",
            cursor="hand2",
            width=20,
            height=2,
            command=self.predict_price
        )
        submit_btn.grid(row=2, column=0, columnspan=2, pady=30)
        
        # Result frame
        result_frame = tk.LabelFrame(
            main_frame,
            text="Prediction Result",
            font=("Arial", 11, "bold"),
            padx=20,
            pady=20
        )
        result_frame.grid(row=3, column=0, columnspan=2, sticky="ew", pady=10)
        
        self.result_label = tk.Label(
            result_frame,
            text="No prediction yet",
            font=("Arial", 14),
            fg="#555"
        )
        self.result_label.pack()
        
        # Fish info label
        self.fish_info_label = tk.Label(
            main_frame,
            text="",
            font=("Arial", 9),
            fg="#888"
        )
        self.fish_info_label.grid(row=4, column=0, columnspan=2, pady=5)
        
        # Update fish info when selection changes
        self.fish_combobox.bind("<<ComboboxSelected>>", self.update_fish_info)
    
    def update_fish_info(self, event=None):
        """Display common name when fish is selected"""
        selected_fish = self.fish_combobox.get()
        if selected_fish and selected_fish != "Select a fish...":
            common_name = self.fish_names_df[
                self.fish_names_df['sinhala_name'] == selected_fish
            ]['common_name'].iloc[0]
            self.fish_info_label.config(text=f"Common Name: {common_name}")
        else:
            self.fish_info_label.config(text="")
    
    def get_week_of_month(self, date):
        """Get the week number of the month (1-4)"""
        day = date.day
        if day <= 7:
            return 1
        elif day <= 14:
            return 2
        elif day <= 21:
            return 3
        else:
            return 4
    
    def predict_price(self):
        """Make price prediction"""
        # Get selected fish
        selected_fish = self.fish_combobox.get()
        if not selected_fish or selected_fish == "Select a fish...":
            messagebox.showwarning("Warning", "Please select a fish!")
            return
        
        # Get selected date
        selected_date = self.date_entry.get_date()
        year = selected_date.year
        month = selected_date.month
        week = self.get_week_of_month(selected_date)
        
        try:
            # Get common name
            common_name = self.fish_names_df[
                self.fish_names_df['sinhala_name'] == selected_fish
            ]['common_name'].iloc[0]
            
            # Encode fish names
            sinhala_encoded = self.le_sinhala.transform([selected_fish])[0]
            common_encoded = self.le_common.transform([common_name])[0]
            
            # Create features
            month_sin = np.sin(2 * np.pi * month / 12)
            month_cos = np.cos(2 * np.pi * month / 12)
            week_sin = np.sin(2 * np.pi * week / 4)
            week_cos = np.cos(2 * np.pi * week / 4)
            
            # Season
            if month in [12, 1, 2]:
                season = 1
            elif month in [3, 4, 5]:
                season = 2
            elif month in [6, 7, 8]:
                season = 3
            else:
                season = 4
            
            # Create feature vector with column names to avoid sklearn warning
            feature_cols = [
                'year','month','week','sinhala_encoded','common_encoded',
                'month_sin','month_cos','week_sin','week_cos','season'
            ]
            features = pd.DataFrame([[
                year, month, week, sinhala_encoded, common_encoded,
                month_sin, month_cos, week_sin, week_cos, season
            ]], columns=feature_cols)
            
            # Make predictions with both models
            rf_pred = self.rf_model.predict(features)[0]
            gb_pred = self.gb_model.predict(features)[0]
            
            # Ensemble prediction
            predicted_price = (rf_pred + gb_pred) / 2
            
            # Display result
            date_str = selected_date.strftime("%d %B %Y")
            self.result_label.config(
                text=f"Rs. {predicted_price:.2f} per Kg",
                font=("Arial", 18, "bold"),
                fg="#27ae60"
            )
            
            # Update info
            week_names = {1: "1st", 2: "2nd", 3: "3rd", 4: "4th"}
            info_text = f"Fish: {selected_fish} ({common_name})\n"
            info_text += f"Date: {date_str} (Week {week_names[week]} of {selected_date.strftime('%B')})"
            self.fish_info_label.config(text=info_text, fg="#2c3e50")
            
            print(f"✅ Prediction: {selected_fish} on {date_str} = Rs. {predicted_price:.2f}")
            
        except Exception as e:
            messagebox.showerror("Error", f"Prediction failed:\n{str(e)}")
            print(f"❌ Error: {str(e)}")

def main():
    root = tk.Tk()
    app = FishPricePredictorGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
