import tkinter as tk
from tkinter import ttk, messagebox
from tkcalendar import DateEntry
import pickle
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure

class FishPricePredictorGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Fish Price Predictor")
        self.root.geometry("900x700")
        self.root.resizable(True, True)
        
        # Load models and fish data first
        if not self.load_models():
            self.root.destroy()
            return
        
        # Setup GUI
        self.setup_gui()
    
    def load_models(self):
        """Load trained models, fish data and encoders"""
        try:
            script_dir = Path(__file__).parent
            models_folder = script_dir / "models"
            processed_dir = script_dir / "dataset" / "processed"
            
            if not models_folder.exists():
                messagebox.showerror("Error", f"Models folder not found:\n{models_folder}\n\nPlease run model_train.py first!")
                return False
            
            # Load models
            with open(models_folder / "rf_model.pkl", "rb") as f:
                self.rf_model = pickle.load(f)
            
            with open(models_folder / "gb_model.pkl", "rb") as f:
                self.gb_model = pickle.load(f)
            
            # Load feature names
            with open(models_folder / "feature_names.pkl", "rb") as f:
                self.feature_names = pickle.load(f)
            
            # Load fish names from CSV
            fish_names_path = processed_dir / "fish_names.csv"
            if fish_names_path.exists():
                self.fish_names_df = pd.read_csv(fish_names_path)
                # Create list of Sinhala names for display
                self.fish_list = self.fish_names_df['sinhala_name'].tolist()
                print(f"✅ Loaded {len(self.fish_list)} fish species from fish_names.csv")
            else:
                messagebox.showerror("Error", f"Fish names file not found:\n{fish_names_path}")
                return False
            
            # Load fish encoder
            le_sinhala_path = models_folder / "le_sinhala.pkl"
            if le_sinhala_path.exists():
                with open(le_sinhala_path, "rb") as f:
                    self.le_sinhala = pickle.load(f)
                print("✅ Loaded fish encoder")
            else:
                self.le_sinhala = None
                print("⚠ Fish encoder not found")
            
            print("✅ Models loaded successfully!")
            return True
            
        except FileNotFoundError as e:
            messagebox.showerror("Error", f"Model file not found:\n{str(e)}\n\nPlease run model_train.py first!")
            return False
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load models:\n{str(e)}")
            return False
    
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
        main_frame = tk.Frame(self.root, padx=20, pady=20)
        main_frame.pack(fill="both", expand=True)
        
        # Left panel for inputs
        left_panel = tk.Frame(main_frame)
        left_panel.pack(side="left", fill="both", padx=10)
        
        # Date selection
        date_label = tk.Label(
            left_panel,
            text="Select Date:",
            font=("Arial", 11, "bold")
        )
        date_label.pack(anchor="w", pady=5)
        
        self.date_entry = DateEntry(
            left_panel,
            font=("Arial", 10),
            width=28,
            background='darkblue',
            foreground='white',
            borderwidth=2,
            date_pattern='dd/mm/yyyy',
            mindate=datetime(2024, 1, 1),
            maxdate=datetime(2030, 12, 31)
        )
        self.date_entry.pack(anchor="w", pady=5, padx=5)
        
        # Spacer
        tk.Label(left_panel, text="").pack(pady=10)
        
        # Fish selection
        fish_label = tk.Label(
            left_panel,
            text="Select Fish (Sinhala Name):",
            font=("Arial", 11, "bold")
        )
        fish_label.pack(anchor="w", pady=5)
        
        self.fish_combobox = ttk.Combobox(
            left_panel,
            values=self.fish_list,
            font=("Arial", 10),
            width=28,
            state="readonly"
        )
        self.fish_combobox.pack(anchor="w", pady=5, padx=5)
        
        if len(self.fish_list) > 0:
            self.fish_combobox.set(self.fish_list[0])
        
        # Fish common name label
        self.common_name_label = tk.Label(
            left_panel,
            text="",
            font=("Arial", 9),
            fg="#666"
        )
        self.common_name_label.pack(anchor="w", pady=2, padx=5)
        
        self.fish_combobox.bind("<<ComboboxSelected>>", self.update_fish_info)
        
        # Spacer
        tk.Label(left_panel, text="").pack(pady=10)
        
        # Submit button
        submit_btn = tk.Button(
            left_panel,
            text="Predict Price",
            font=("Arial", 12, "bold"),
            bg="#27ae60",
            fg="white",
            activebackground="#229954",
            cursor="hand2",
            width=20,
            height=2,
            command=self.predict_price
        )
        submit_btn.pack(anchor="w", pady=10, padx=5)
        
        # Result frame
        result_frame = tk.LabelFrame(
            left_panel,
            text="Price Prediction",
            font=("Arial", 10, "bold"),
            padx=15,
            pady=15
        )
        result_frame.pack(anchor="w", pady=10, fill="x")
        
        self.result_label = tk.Label(
            result_frame,
            text="No prediction yet",
            font=("Arial", 14, "bold"),
            fg="#555"
        )
        self.result_label.pack()
        
        self.date_info_label = tk.Label(
            left_panel,
            text="",
            font=("Arial", 9),
            fg="#888",
            justify="left"
        )
        self.date_info_label.pack(anchor="w", pady=5)
        
        # Right panel for chart
        right_panel = tk.Frame(main_frame)
        right_panel.pack(side="right", fill="both", expand=True, padx=10)
        
        self.chart_frame = tk.LabelFrame(
            right_panel,
            text="Price Trend (30 Days)",
            font=("Arial", 10, "bold"),
            padx=10,
            pady=10
        )
        self.chart_frame.pack(fill="both", expand=True)
    
    def update_fish_info(self, event=None):
        """Display common name when fish is selected"""
        selected_fish = self.fish_combobox.get()
        if selected_fish:
            try:
                common_name = self.fish_names_df[
                    self.fish_names_df['sinhala_name'] == selected_fish
                ]['common_name'].iloc[0]
                self.common_name_label.config(text=f"English: {common_name}")
            except:
                self.common_name_label.config(text="")
    
    def predict_price(self):
        """Make price prediction and show trend"""
        selected_date = self.date_entry.get_date()
        selected_fish = self.fish_combobox.get()
        
        if not selected_fish:
            messagebox.showwarning("Warning", "Please select a fish!")
            return
        
        try:
            # Encode fish name
            if self.le_sinhala is not None:
                try:
                    fish_encoded = self.le_sinhala.transform([selected_fish])[0]
                except:
                    fish_encoded = 0
            else:
                fish_encoded = 0
            
            # Generate predictions for 30 days
            dates = []
            prices = []
            
            for day_offset in range(-15, 16):
                pred_date = selected_date + timedelta(days=day_offset)
                year = pred_date.year
                month = pred_date.month
                day_of_week = pred_date.weekday()
                week_of_year = pred_date.isocalendar()[1]
                
                # Season
                if month in [12, 1, 2]:
                    season = 1
                elif month in [3, 4, 5]:
                    season = 2
                elif month in [6, 7, 8]:
                    season = 3
                else:
                    season = 4
                
                is_weekend = 1 if day_of_week >= 5 else 0
                
                # Create feature vector (ADD FISH_ENCODED)
                features_dict = {
                    'fish_encoded': fish_encoded,
                    'day_of_week': day_of_week,
                    'month': month,
                    'year': year,
                    'week_of_year': week_of_year,
                    'month_sin': np.sin(2 * np.pi * month / 12),
                    'month_cos': np.cos(2 * np.pi * month / 12),
                    'season': season,
                    'is_weekend': is_weekend,
                    'is_festival_day': 0,
                    'before_festival_window': 0,
                    'days_to_festival': 999,
                    'weather_effect': 0,
                    'poya_effect': 0,
                    'festival_effect': 0
                }
                
                # Ensure every trained feature exists; fill unseen ones with 0
                feature_row = {name: features_dict.get(name, 0) for name in self.feature_names}
                features = pd.DataFrame([feature_row])
                
                # Make predictions
                rf_pred = self.rf_model.predict(features)[0]
                gb_pred = self.gb_model.predict(features)[0]
                ensemble_pred = (rf_pred + gb_pred) / 2
                
                dates.append(pred_date)
                prices.append(ensemble_pred)
            
            # Find current day prediction (middle of range)
            current_pred = prices[15]
            
            # Display result
            date_str = selected_date.strftime("%d %B %Y")
            self.result_label.config(
                text=f"Rs. {current_pred:.2f} per Kg",
                font=("Arial", 16, "bold"),
                fg="#27ae60"
            )
            
            # Update info
            day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            day_of_week = selected_date.weekday()
            info_text = f"Fish: {selected_fish}\n"
            info_text += f"Date: {date_str} ({day_names[day_of_week]})"
            self.date_info_label.config(text=info_text, fg="#2c3e50")
            
            # Plot trend
            self.plot_trend(dates, prices, current_pred, selected_date, selected_fish)
            
            print(f"✅ Prediction: {selected_fish} on {date_str} = Rs. {current_pred:.2f}")
            
        except Exception as e:
            messagebox.showerror("Error", f"Prediction failed:\n{str(e)}")
            print(f"❌ Error: {str(e)}")
    
    def plot_trend(self, dates, prices, current_price, selected_date, fish_name):
        """Plot price trend over 30 days"""
        # Clear previous chart
        for widget in self.chart_frame.winfo_children():
            widget.destroy()
        
        # Create figure
        fig = Figure(figsize=(6, 4), dpi=100)
        ax = fig.add_subplot(111)
        
        # Plot line
        ax.plot(dates, prices, linewidth=2, color='#27ae60', marker='o', markersize=4)
        
        # Highlight current date
        current_idx = 15
        ax.plot(dates[current_idx], prices[current_idx], 'o', markersize=10, 
                color='#e74c3c', label='Selected Date', zorder=5)
        ax.axvline(x=dates[current_idx], color='#e74c3c', linestyle='--', alpha=0.5)
        
        # Formatting
        ax.set_xlabel('Date', fontsize=10)
        ax.set_ylabel('Price (Rs/Kg)', fontsize=10)
        ax.set_title(f'{fish_name} - Price Trend (±15 Days)', fontsize=11, fontweight='bold')
        ax.grid(True, alpha=0.3)
        ax.legend()
        
        # Rotate x-axis labels
        fig.autofmt_xdate(rotation=45)
        fig.tight_layout()
        
        # Embed in tkinter
        canvas = FigureCanvasTkAgg(fig, master=self.chart_frame)
        canvas.draw()
        canvas.get_tk_widget().pack(fill="both", expand=True)

def main():
    root = tk.Tk()
    app = FishPricePredictorGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
