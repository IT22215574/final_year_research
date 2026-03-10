#!/usr/bin/env python3
import pandas as pd
import numpy as np
from pathlib import Path

# Load predictions
csv_path = Path(__file__).parent / 'fish_zone_predictions' / 'fish_zones_2026-03-10.csv'
df = pd.read_csv(csv_path)

# Filter for fish zones (fish_zone=1)
fish_zones = df[df['fish_zone'] == 1]

print('=== NEW MODEL WITH DEPTH FEATURE ===\n')
print(f'Total fish zones predicted: {len(fish_zones)}')
print(f'\nDepth Statistics for Fish Zones:')
print(f'  Mean depth: {fish_zones["depth"].mean():.1f}m')
print(f'  Median depth: {fish_zones["depth"].median():.1f}m')
print(f'  Min depth: {fish_zones["depth"].min():.1f}m')
print(f'  Max depth: {fish_zones["depth"].max():.1f}m')

# High probability zones
high_prob = fish_zones[fish_zones['fish_probability'] > 0.7]
print(f'\n=== High Probability Zones (>70%) ===')
print(f'Count: {len(high_prob)}')
print(f'Depth range: {high_prob["depth"].min():.1f}m to {high_prob["depth"].max():.1f}m')
print(f'Mean depth: {high_prob["depth"].mean():.1f}m')

# Depth distribution by probability ranges
print(f'\n=== Depth by Probability Ranges ===')
for min_prob, max_prob in [(0.3, 0.5), (0.5, 0.7), (0.7, 0.9), (0.9, 1.0)]:
    subset = fish_zones[(fish_zones['fish_probability'] >= min_prob) & (fish_zones['fish_probability'] < max_prob)]
    if len(subset) > 0:
        print(f'{int(min_prob*100)}-{int(max_prob*100)}%: Avg depth {subset["depth"].mean():.1f}m, Count: {len(subset)}')

# Show some high probability examples
print(f'\n=== Top 10 High Probability Zones ===')
top_zones = fish_zones.nlargest(10, 'fish_probability')[['lat', 'lon', 'depth', 'fish_probability', 'sst', 'chlor_a']]
for idx, row in top_zones.iterrows():
    print(f'  Prob: {row["fish_probability"]*100:.1f}%, Depth: {row["depth"]:.1f}m, SST: {row["sst"]:.1f}°C, Chlor: {row["chlor_a"]:.3f}, Loc: ({row["lat"]:.2f}, {row["lon"]:.2f})')

print(f'\n=== Correlation Analysis ===')
# Calculate correlation between depth and fish probability
corr = fish_zones[['depth', 'fish_probability', 'sst', 'chlor_a']].corr()
print(f'Correlation with fish_probability:')
print(f'  Depth: {corr.loc["depth", "fish_probability"]:.3f}')
print(f'  SST: {corr.loc["sst", "fish_probability"]:.3f}')
print(f'  Chlorophyll: {corr.loc["chlor_a", "fish_probability"]:.3f}')

# Depth preference analysis
print(f'\n=== Fish Zone Distribution By Depth ===')
depth_ranges = [
    (0, 50, "0-50m (Shallow)"),
    (50, 200, "50-200m (Medium)"),
    (200, 1000, "200-1000m (Deep)"),
    (1000, 6000, ">1000m (Very Deep)")
]

for min_d, max_d, label in depth_ranges:
    subset = fish_zones[(fish_zones['depth'] >= min_d) & (fish_zones['depth'] < max_d)]
    if len(subset) > 0:
        avg_prob = subset['fish_probability'].mean()
        print(f'{label:20s}: {len(subset):3d} zones, Avg Prob: {avg_prob*100:.1f}%')
