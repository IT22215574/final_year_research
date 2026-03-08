"""
Read and analyze Sea Surface Temperature (SST) data from NetCDF file.
Extracts the analysed_sst variable, calculates regional averages,
and visualizes as a heatmap.
"""

import xarray as xr
import numpy as np
import matplotlib.pyplot as plt

# NetCDF file path (output from fetch_sst_data.py)
NETCDF_FILE = "sri_lanka_sst_latest.nc"


def main() -> None:
    print(f"Reading NetCDF file: {NETCDF_FILE}")
    
    # Open the dataset
    ds = xr.open_dataset(NETCDF_FILE)
    
    print("\n--- Dataset Information ---")
    print(ds)
    
    # Extract the analysed_sst variable
    sst = ds['analysed_sst']
    
    print("\n--- SST Variable Info ---")
    print(sst)
    
    # Convert from Kelvin to Celsius
    sst_celsius = sst - 273.15
    
    # Calculate statistics
    mean_sst = float(sst_celsius.mean().values)
    min_sst = float(sst_celsius.min().values)
    max_sst = float(sst_celsius.max().values)
    std_sst = float(sst_celsius.std().values)
    
    print("\n--- Sea Surface Temperature Statistics (°C) ---")
    print(f"Mean SST    : {mean_sst:.2f} °C")
    print(f"Min SST     : {min_sst:.2f} °C")
    print(f"Max SST     : {max_sst:.2f} °C")
    print(f"Std Dev     : {std_sst:.2f} °C")
    
    # Get the first time step for visualization (if multiple time steps exist)
    if 'time' in sst_celsius.dims:
        sst_plot = sst_celsius.isel(time=0)
        time_value = ds.time.isel(time=0).values
        print(f"\nVisualizing data for time: {time_value}")
    else:
        sst_plot = sst_celsius
    
    # Create heatmap
    fig, ax = plt.subplots(figsize=(12, 8))
    
    im = sst_plot.plot(
        ax=ax,
        cmap='RdYlBu_r',  # Red-Yellow-Blue reversed (hot to cold)
        cbar_kwargs={
            'label': 'Sea Surface Temperature (°C)',
            'shrink': 0.8
        }
    )
    
    ax.set_title(
        'Sea Surface Temperature - Sri Lanka Region',
        fontsize=14,
        fontweight='bold',
        pad=20
    )
    ax.set_xlabel('Longitude (°E)', fontsize=12)
    ax.set_ylabel('Latitude (°N)', fontsize=12)
    ax.grid(True, linestyle='--', alpha=0.5)
    
    # Add statistics as text box
    stats_text = (
        f'Mean: {mean_sst:.2f}°C\n'
        f'Min: {min_sst:.2f}°C\n'
        f'Max: {max_sst:.2f}°C'
    )
    ax.text(
        0.02, 0.98, stats_text,
        transform=ax.transAxes,
        fontsize=10,
        verticalalignment='top',
        bbox=dict(boxstyle='round', facecolor='white', alpha=0.8)
    )
    
    plt.tight_layout()
    
    # Save the figure
    output_file = 'sst_heatmap.png'
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    print(f"\nHeatmap saved to: {output_file}")
    
    # Display the plot
    plt.show()
    
    # Close the dataset
    ds.close()


if __name__ == "__main__":
    main()
