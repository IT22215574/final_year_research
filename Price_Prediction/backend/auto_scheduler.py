# auto_scheduler.py
import os
import schedule
import time
import subprocess
import threading
import sys
from datetime import datetime

BASE_DIR = os.path.dirname(__file__)
FETCH_SCRIPT = os.path.join(BASE_DIR, "fetch_prices.py")
TRAIN_SCRIPT = os.path.join(BASE_DIR, "model_train.py")

def run_script(script_path):
    print(f"🔁 Running script: {script_path} at {datetime.now()}")
    try:
        subprocess.run([sys.executable, script_path], check=True)
        print(f"✅ Finished: {script_path}")
    except subprocess.CalledProcessError as e:
        print(f"❌ Script failed: {script_path} -> {e}")

def job():
    # run fetch then train sequentially
    run_script(FETCH_SCRIPT)
    run_script(TRAIN_SCRIPT)

# Schedule: every Monday at 08:00 local time
schedule.every().monday.at("08:00").do(job)
print("🔔 Scheduler started: every Monday at 08:00 (local)")

try:
    while True:
        schedule.run_pending()
        time.sleep(60)  # check once per minute
except KeyboardInterrupt:
    print("Scheduler stopped by user.")
