import schedule
import time
import subprocess
import os
from datetime import datetime

BASE_DIR = os.path.dirname(__file__)

def run_automation():
    print("\n🕐 Starting weekly automation:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    try:
        # 1️⃣ Scrape latest prices
        print("📡 Fetching latest fish prices...")
        subprocess.run(["python", os.path.join(BASE_DIR, "fetch_prices.py")], check=True)

        # 2️⃣ Retrain model
        print("🤖 Training model with updated dataset...")
        subprocess.run(["python", os.path.join(BASE_DIR, "model_train.py")], check=True)

        print("✅ Weekly automation completed successfully!\n")

    except subprocess.CalledProcessError as e:
        print("❌ Error during automation process:", e)

# Schedule job (run every Monday at 08:00 AM)
schedule.every().monday.at("08:00").do(run_automation)

print("🔁 Weekly automation scheduler started (Every Monday 8:00 AM)")
print("Press Ctrl+C to stop.\n")

# Keep running
while True:
    schedule.run_pending()
    time.sleep(60)
