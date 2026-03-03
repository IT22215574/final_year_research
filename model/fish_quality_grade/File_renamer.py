import os
import shutil
from pathlib import Path

def rename_images(source_dir, output_dir, grade="A"):
    """
    Rename images with pattern: tuna_001_A_L, tuna_002_A_L, etc.
    
    Args:
        source_dir: Source directory containing images
        output_dir: Output directory for renamed images
        grade: Grade (A, B, C, etc.)
    """
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Supported image extensions
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tiff', '.webp'}
    
    # Get all image files from source directory
    image_files = []
    for file in os.listdir(source_dir):
        if Path(file).suffix.lower() in image_extensions:
            image_files.append(file)
    
    # Sort files to ensure consistent ordering
    image_files.sort()
    
    print(f"Found {len(image_files)} image files in source directory")
    
    # Rename and copy images
    for index, filename in enumerate(image_files, start=1):
        # Get file extension
        ext = Path(filename).suffix
        
        # Create new filename with format: tuna_001_A_L.ext
        new_filename = f"flyingfish_{index:03d}_{grade}_R{ext}"
        
        # Full paths
        source_path = os.path.join(source_dir, filename)
        dest_path = os.path.join(output_dir, new_filename)
        
        # Copy file to new location with new name
        shutil.copy2(source_path, dest_path)
        
        print(f"Copied: {filename} -> {new_filename}")
    
    print(f"\nRenaming complete! All files copied to: {output_dir}")
    print(f"Total files processed: {len(image_files)}")

# Your specific paths
source_directory = r"D:\Hirusha\Photos\FlyingFish\FFR"
output_directory = r"D:\Hirusha\Photos\FlyingFish\FFR\renamed_R_FF_A"

# Run the renaming function
rename_images(source_directory, output_directory, grade="A")