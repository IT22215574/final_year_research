import pandas as pd

with open("dataset/fish_prices.csv", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    parts = line.strip().split(",")
    if len(parts) != 4:
        print(f"Line {i+1} has {len(parts)} columns: {line.strip()}")
