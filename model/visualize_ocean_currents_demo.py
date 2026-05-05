#!/usr/bin/env python3
"""
Demo script to visualize ocean currents for Sri Lanka region.
This generates a demonstration using simulated data patterns typical of the region.
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from datetime import datetime

# Sri Lanka Exclusive Economic Zone (EEZ)
MIN_LON, MAX_LON = 74.0, 86.0
MIN_LAT, MAX_LAT = 2.0, 14.0

# Create grid
resolution = 0.1  # degrees
lon = np.arange(MIN_LON, MAX_LON + resolution, resolution)
lat = np.arange(MIN_LAT, MAX_LAT + resolution, resolution)
LON, LAT = np.meshgrid(lon, lat)

# Generate realistic ocean current patterns for Sri Lanka
# Based on typical monsoon currents and eddies in the Bay of Bengal

# Eastward velocity (uo) - influenced by seasonal monsoon currents
# During SW monsoon: eastward flow stronger in south
uo = np.zeros_like(LON)
vo = np.zeros_like(LAT)

# Add monsoon current component (eastward flow)
uo += 0.15 * np.sin((LAT - 5) * np.pi / 5)

# Add eddy-like circulation (common in Bay of Bengal)
eddy_center_lat = 7.5
eddy_center_lon = 80.5
distance = np.sqrt((LON - eddy_center_lon)**2 + (LAT - eddy_center_lat)**2)
eddy_strength = 0.2 * np.exp(-distance**2 / 0.5)

# Rotational component for eddy
angle = np.arctan2(LAT - eddy_center_lat, LON - eddy_center_lon)
uo += -eddy_strength * np.sin(angle)
vo += eddy_strength * np.cos(angle)

# Add northward component (typical upwelling patterns)
vo += 0.1 * np.cos((LON - 79) * np.pi / 3)

# Add some random variability
np.random.seed(42)
uo += np.random.normal(0, 0.02, uo.shape)
vo += np.random.normal(0, 0.02, vo.shape)

# Calculate current speed
speed = np.sqrt(uo**2 + vo**2)

print("="*70)
print("Ocean Current Visualization for Sri Lanka Region")
print("="*70)
print(f"Date: {datetime.now().strftime('%Y-%m-%d')}")
print(f"Region: Lat [{MIN_LAT}°N, {MAX_LAT}°N], Lon [{MIN_LON}°E, {MAX_LON}°E]")
print(f"\nCurrent Statistics:")
print(f"  Mean Speed: {np.mean(speed):.4f} m/s ({np.mean(speed)*100:.2f} cm/s)")
print(f"  Max Speed:  {np.max(speed):.4f} m/s ({np.max(speed)*100:.2f} cm/s)")
print(f"  Mean Eastward (uo):  {np.mean(uo):.4f} m/s")
print(f"  Mean Northward (vo): {np.mean(vo):.4f} m/s")
print("="*70 + "\n")

# Create visualization
fig = plt.figure(figsize=(18, 8))

# --- Subplot 1: Current Speed Heatmap ---
ax1 = plt.subplot(1, 2, 1)
im1 = ax1.contourf(LON, LAT, speed, levels=20, cmap='viridis', extend='both')
cbar1 = plt.colorbar(im1, ax=ax1, shrink=0.8)
cbar1.set_label('Current Speed (m/s)', fontsize=11)

ax1.set_title('Ocean Current Speed - Sri Lanka Region\n(Demo Data)', 
              fontsize=14, fontweight='bold', pad=15)
ax1.set_xlabel('Longitude (°E)', fontsize=11)
ax1.set_ylabel('Latitude (°N)', fontsize=11)
ax1.grid(True, linestyle='--', alpha=0.4, color='white', linewidth=0.5)
ax1.set_aspect('equal')

# Add statistics text box
stats_text = (
    f'Mean: {np.mean(speed):.3f} m/s\n'
    f'Max: {np.max(speed):.3f} m/s\n'
    f'({np.mean(speed)*100:.1f} cm/s avg)'
)
ax1.text(0.02, 0.98, stats_text,
         transform=ax1.transAxes,
         fontsize=10,
         verticalalignment='top',
         bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.9))

# Mark major cities
cities = {
    'Colombo': (79.85, 6.93),
    'Trincomalee': (81.23, 8.59),
    'Galle': (80.22, 6.03),
}
for city, (clon, clat) in cities.items():
    ax1.plot(clon, clat, 'r*', markersize=12, markeredgecolor='white', markeredgewidth=0.5)
    ax1.text(clon + 0.1, clat + 0.1, city, fontsize=9, color='red', fontweight='bold',
             bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.7, edgecolor='red'))

# --- Subplot 2: Vector Field (Quiver Plot) ---
ax2 = plt.subplot(1, 2, 2)

# Subsample for clearer arrows
skip = 4
Q = ax2.quiver(LON[::skip, ::skip], LAT[::skip, ::skip],
               uo[::skip, ::skip], vo[::skip, ::skip],
               speed[::skip, ::skip],
               cmap='plasma',
               scale=3,
               scale_units='inches',
               width=0.004,
               headwidth=4,
               headlength=5)

# Add colorbar
cbar2 = plt.colorbar(Q, ax=ax2, shrink=0.8)
cbar2.set_label('Current Speed (m/s)', fontsize=11)

# Add quiver key (reference arrow)
ax2.quiverkey(Q, 0.9, 0.95, 0.2,
              '0.2 m/s',
              labelpos='E',
              coordinates='axes',
              color='white',
              labelcolor='black',
              fontproperties={'weight': 'bold', 'size': 10})

ax2.set_title('Ocean Current Direction & Magnitude - Sri Lanka\n(Demo Data)',
              fontsize=14, fontweight='bold', pad=15)
ax2.set_xlabel('Longitude (°E)', fontsize=11)
ax2.set_ylabel('Latitude (°N)', fontsize=11)
ax2.grid(True, linestyle='--', alpha=0.4, linewidth=0.5)
ax2.set_aspect('equal')

# Mark major cities
for city, (clon, clat) in cities.items():
    ax2.plot(clon, clat, 'r*', markersize=12, markeredgecolor='white', markeredgewidth=0.5)

# Add legend for current patterns
legend_elements = [
    mpatches.Patch(facecolor='blue', edgecolor='black', label='Monsoon Current'),
    mpatches.Patch(facecolor='green', edgecolor='black', label='Eddy Circulation'),
    mpatches.Patch(facecolor='orange', edgecolor='black', label='Upwelling Zone'),
]
ax2.legend(handles=legend_elements, loc='lower right', fontsize=9, framealpha=0.9)

# Adjust layout
plt.tight_layout()

# Save figure
output_file = 'ocean_currents_visualization_demo.png'
plt.savefig(output_file, dpi=150, bbox_inches='tight')
print(f"✓ Visualization saved to: {output_file}\n")

# Don't display interactively - just save the file
print("✓ Map created successfully! Open the PNG file to view.")

print("\n" + "="*70)
print("DEMONSTRATION COMPLETE")
print("="*70)
print("\nNOTE: This is simulated data for demonstration purposes.")
print("To get real ocean current data, ensure:")
print("1. copernicus marine credentials are configured")
print("2. Run: python3 model/fetch_ocean_currents.py")
print("3. Then: python3 model/analyze_ocean_currents.py")
print("="*70)
