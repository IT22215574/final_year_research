"""
GUI module for Fish Price Predictor

Provides an interactive Tkinter GUI for fish price prediction.
"""

import tkinter as tk
from tkinter import ttk, messagebox
from tkcalendar import DateEntry
from datetime import datetime, timedelta
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure

from .price_predictor import FishPricePredictor
from ..config import (
    GUI_TITLE, GUI_GEOMETRY, PREDICTION_DAYS,
    COLOR_PRIMARY, COLOR_SUCCESS, COLOR_ERROR, COLOR_WARNING, COLOR_INFO
)


class FishPricePredictorGUI:
    """Interactive GUI for fish price prediction"""
    
    def __init__(self, root):
        """Initialize GUI"""
        self.root = root
        self.root.title(GUI_TITLE)
        self.root.geometry(GUI_GEOMETRY)
        self.root.resizable(True, True)
        
        # Initialize predictor
        self.predictor = FishPricePredictor()
        
        # Load models and initialize
        if not self.initialize():
            self.root.destroy()
            return
        
        # Setup GUI
        self.setup_gui()
    
    def initialize(self):
        """Initialize predictor and load data"""
        try:
            # Get fish list
            self.fish_list = self.predictor.get_fish_list()
            if not self.fish_list:
                messagebox.showerror("Error", "No fish species found in database!\nPlease run model training first.")
                return False
            
            print(f"✅ Loaded {len(self.fish_list)} fish species")
            return True
            
        except Exception as e:
            messagebox.showerror("Error", f"Initialization failed:\n{str(e)}")
            return False
    
    def setup_gui(self):
        """Setup GUI components"""
        # Title frame
        title_frame = tk.Frame(self.root, bg=COLOR_PRIMARY, height=80)
        title_frame.pack(fill="x")
        title_frame.pack_propagate(False)
        
        title_label = tk.Label(
            title_frame,
            text="🐟 Fish Price Predictor",
            font=("Arial", 24, "bold"),
            bg=COLOR_PRIMARY,
            fg="white"
        )
        title_label.pack(pady=20)
        
        # Main frame
        main_frame = tk.Frame(self.root, padx=20, pady=20)
        main_frame.pack(fill="both", expand=True)
        
        # Left panel for inputs
        left_panel = tk.Frame(main_frame)
        left_panel.pack(side="left", fill="both", padx=10)
        
        # ──────────────────────────────────────────────────────────────
        # Date Selection
        # ──────────────────────────────────────────────────────────────
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
            date_pattern='dd/mm/yyyy'
        )
        self.date_entry.pack(anchor="w", pady=5, padx=5)
        
        # Spacer
        tk.Label(left_panel, text="").pack(pady=10)
        
        # ──────────────────────────────────────────────────────────────
        # Fish Selection
        # ──────────────────────────────────────────────────────────────
        fish_label = tk.Label(
            left_panel,
            text="Select Fish (Sinhala):",
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
        
        # Common name label
        self.common_name_label = tk.Label(
            left_panel,
            text="",
            font=("Arial", 9),
            fg="#666"
        )
        self.common_name_label.pack(anchor="w", pady=2, padx=5)
        
        self.fish_combobox.bind("<<ComboboxSelected>>", self.update_fish_info)
        self.update_fish_info()
        
        # Spacer
        tk.Label(left_panel, text="").pack(pady=10)
        
        # ──────────────────────────────────────────────────────────────
        # Prediction Button
        # ──────────────────────────────────────────────────────────────
        submit_btn = tk.Button(
            left_panel,
            text="Predict Price",
            font=("Arial", 12, "bold"),
            bg=COLOR_SUCCESS,
            fg="white",
            activebackground="#229954",
            cursor="hand2",
            width=20,
            height=2,
            command=self.predict_price
        )
        submit_btn.pack(anchor="w", pady=10, padx=5)
        
        # ──────────────────────────────────────────────────────────────
        # Result Frame
        # ──────────────────────────────────────────────────────────────
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
        
        # ──────────────────────────────────────────────────────────────
        # Right panel for chart
        # ──────────────────────────────────────────────────────────────
        right_panel = tk.Frame(main_frame)
        right_panel.pack(side="right", fill="both", expand=True, padx=10)
        
        self.chart_frame = tk.LabelFrame(
            right_panel,
            text=f"Price Trend (±{PREDICTION_DAYS // 2} Days)",
            font=("Arial", 10, "bold"),
            padx=10,
            pady=10
        )
        self.chart_frame.pack(fill="both", expand=True)
    
    def update_fish_info(self, event=None):
        """Update fish information when selection changes"""
        selected_fish = self.fish_combobox.get()
        if selected_fish:
            common_name = self.predictor.get_fish_common_name(selected_fish)
            self.common_name_label.config(text=f"English: {common_name}")
    
    def predict_price(self):
        """Make price prediction and show trend"""
        selected_date = self.date_entry.get_date()
        selected_fish = self.fish_combobox.get()
        
        if not selected_fish:
            messagebox.showwarning("Warning", "Please select a fish!")
            return
        
        try:
            # Generate predictions for range
            predictions = self.predictor.predict_range(
                selected_fish,
                selected_date,
                days_before=PREDICTION_DAYS // 2,
                days_after=PREDICTION_DAYS // 2
            )
            
            if not predictions:
                messagebox.showerror("Error", "Prediction failed!")
                return
            
            # Extract data for display
            dates = [p['date'] for p in predictions]
            prices = [p['price'] for p in predictions]
            
            # Current date is in the middle
            current_idx = len(predictions) // 2
            current_pred = prices[current_idx]
            
            # Display result
            date_str = selected_date.strftime("%d %B %Y")
            self.result_label.config(
                text=f"Rs. {current_pred:.2f} per Kg",
                font=("Arial", 16, "bold"),
                fg=COLOR_SUCCESS
            )
            
            # Update info
            day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            day_of_week = selected_date.weekday()
            info_text = f"Fish: {selected_fish}\n"
            info_text += f"Date: {date_str} ({day_names[day_of_week]})"
            self.date_info_label.config(text=info_text, fg=COLOR_PRIMARY)
            
            # Plot trend
            self.plot_trend(dates, prices, current_pred, selected_date, selected_fish)
            
            print(f"✅ Prediction: {selected_fish} on {date_str} = Rs. {current_pred:.2f}")
            
        except Exception as e:
            messagebox.showerror("Error", f"Prediction failed:\n{str(e)}")
            print(f"❌ Error: {str(e)}")
    
    def plot_trend(self, dates, prices, current_price, selected_date, fish_name):
        """Plot price trend over range"""
        # Clear previous chart
        for widget in self.chart_frame.winfo_children():
            widget.destroy()
        
        # Create figure
        fig = Figure(figsize=(6, 4), dpi=100)
        ax = fig.add_subplot(111)
        
        # Plot line
        ax.plot(dates, prices, linewidth=2, color=COLOR_SUCCESS, marker='o', markersize=4)
        
        # Highlight current date
        current_idx = len(dates) // 2
        ax.plot(dates[current_idx], prices[current_idx], 'o', markersize=10,
                color=COLOR_ERROR, label='Selected Date', zorder=5)
        ax.axvline(x=dates[current_idx], color=COLOR_ERROR, linestyle='--', alpha=0.5)
        
        # Formatting
        ax.set_xlabel('Date', fontsize=10)
        ax.set_ylabel('Price (Rs/Kg)', fontsize=10)
        ax.set_title(f'{fish_name} - Price Trend (±{PREDICTION_DAYS // 2} Days)', fontsize=11, fontweight='bold')
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
    """Main entry point for GUI"""
    root = tk.Tk()
    app = FishPricePredictorGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
