"""
Read and analyze Ocean Current data from NetCDF file.
Extracts the uo (eastward) and vo (northward) velocity variables,
calculates statistics, and visualizes as vector field and magnitude maps.
"""

import xarray as xr
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# NetCDF file path (output from fetch_ocean_currents.py)
NETCDF_FILE = "ocean_currents_latest.nc"


def main() -> None:
    print(f"Reading NetCDF file: {NETCDF_FILE}")
    
    # Open the dataset
    ds = xr.open_dataset(NETCDF_FILE)
    
    print("\n--- Dataset Information ---")
    print(ds)
    
    # Extract the velocity variables
    uo = ds['uo']  # Eastward velocity
    vo = ds['vo']  # Northward velocity
    
    print("\n--- Ocean Current Variables Info ---")
    print("Eastward velocity (uo):")
    print(uo)
    print("\nNorthward velocity (vo):")
    print(vo)
    
    # Get the first time step and surface level for visualization
    if 'time' in uo.dims:
        uo_plot = uo.isel(time=0)
        vo_plot = vo.isel(time=0)
        time_value = ds.time.isel(time=0).values
        print(f"\nVisualizing data for time: {time_value}")
    else:
        uo_plot = uo
        vo_plot = vo
    
    # If depth dimension exists, select surface level
    if 'depth' in uo_plot.dims:
        uo_plot = uo_plot.isel(depth=0)
        vo_plot = vo_plot.isel(depth=0)
        print("Using surface level (depth=0)")
    
    # Calculate current speed (magnitude)
    speed = np.sqrt(uo_plot**2 + vo_plot**2)
    
    # Calculate statistics
    mean_speed = float(speed.mean().values)
    max_speed = float(speed.max().values)
    mean_uo = float(uo_plot.mean().values)
    mean_vo = float(vo_plot.mean().values)
    
    print("\n--- Ocean Current Statistics ---")
    print(f"Mean Speed       : {mean_speed:.4f} m/s ({mean_speed*100:.2f} cm/s)")
    print(f"Max Speed        : {max_speed:.4f} m/s ({max_speed*100:.2f} cm/s)")
    print(f"Mean Eastward    : {mean_uo:.4f} m/s")
    print(f"Mean Northward   : {mean_vo:.4f} m/s")
    
    # Create figure with two subplots
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))
    
    # --- Subplot 1: Current Speed (Magnitude) ---
    im1 = speed.plot(
        ax=ax1,
        cmap='viridis',
        cbar_kwargs={
            'label': 'Current Speed (m/s)',
            'shrink': 0.8
        }
    )
    
    ax1.set_title(
        'Ocean Current Speed - Sri Lanka Region',
        fontsize=14,
        fontweight='bold',
        pad=20
    )
    ax1.set_xlabel('Longitude (°E)', fontsize=11)
    ax1.set_ylabel('Latitude (°N)', fontsize=11)
    ax1.grid(True, linestyle='--', alpha=0.4)
    
    # Add statistics text box
    stats_text = (
        f'Mean: {mean_speed:.4f} m/s\n'
        f'Max: {max_speed:.4f} m/s'
    )
    ax1.text(
        0.02, 0.98, stats_text,
        transform=ax1.transAxes,
        fontsize=10,
        verticalalignment='top',
        bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8)
    )
    
    # --- Subplot 2: Vector Field (Quiver Plot) ---
    # Subsample the data for clearer arrows (every nth point)
    skip = max(1, len(uo_plot.longitude) // 15)
    
    Q = ax2.quiver(
        uo_plot.longitude[::skip],
        uo_plot.latitude[::skip],
        uo_plot.values[::skip, ::skip],
        vo_plot.values[::skip, ::skip],
        speed.values[::skip, ::skip],
        cmap='plasma',
        scale=2,
        scale_units='inches',
        width=0.003
    )
    
    # Add colorbar for vectors
    cbar2 = plt.colorbar(Q, ax=ax2, shrink=0.8)
    cbar2.set_label('Current Speed (m/s)', fontsize=10)
    
    # Add quiver key (reference arrow)
    ax2.quiverkey(
        Q, 0.9, 0.95, 0.1,
        '0.1 m/s',
        labelpos='E',
        coordinates='axes'
    )
    
    ax2.set_title(
        'Ocean Current Direction & Magnitude - Sri Lanka Region',
        fontsize=14,
        fontweight='bold',
        pad=20
    )
    ax2.set_xlabel('Longitude (°E)', fontsize=11)
    ax2.set_ylabel('Latitude (°N)', fontsize=11)
    ax2.grid(True, linestyle='--', alpha=0.4)
    ax2.set_aspect('equal')
    
    # Adjust layout and save
    plt.tight_layout()
    
    output_file = 'ocean_currents_visualization.png'
    plt.savefig(output_file, dpi=150, bbox_inches='tight')
    print(f"\n✓ Visualization saved to: {output_file}")
    
    # Show plot
    # plt.show()  # Uncomment if running interactively
    
    # Close dataset
    ds.close()
    print("\n✓ Analysis completed successfully")


if __name__ == "__main__":
    main()
