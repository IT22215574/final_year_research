import os
import pandas as pd
from pathlib import Path

def convert_xl_to_csv():
    """
    Convert Excel files from dataset/xl to CSV files in dataset/csv.
    Skips files that have already been converted.
    """
    # Get the script's directory and navigate to project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent  # Go up two levels from scripts/
    
    # Define folder paths relative to project root
    xl_folder = project_root / "backend" / "dataset" / "raw" / "xl"
    csv_folder = project_root / "backend" / "dataset" / "raw" / "csv"
    
    # Create csv folder if it doesn't exist
    csv_folder.mkdir(parents=True, exist_ok=True)
    
    # Check if xl folder exists
    if not xl_folder.exists():
        print(f"Error: Excel folder '{xl_folder}' does not exist!")
        print(f"Project root: {project_root}")
        print(f"Please create the folder and add Excel files to convert.")
        return
    
    # Get all Excel files from xl folder
    xl_extensions = ['*.xlsx', '*.xls', '*.xlsm', '*.xlsb']
    xl_files = []
    for ext in xl_extensions:
        xl_files.extend(xl_folder.glob(ext))
    
    if not xl_files:
        print(f"No Excel files found in '{xl_folder}'")
        return
    
    print(f"Found {len(xl_files)} Excel file(s) in '{xl_folder}'")
    print("-" * 60)
    
    converted_count = 0
    skipped_count = 0
    error_count = 0
    
    # Process each Excel file
    for xl_file in xl_files:
        # Generate corresponding CSV filename
        csv_filename = xl_file.stem + ".csv"
        csv_filepath = csv_folder / csv_filename
        
        # Check if CSV already exists
        if csv_filepath.exists():
            print(f"⏭️  SKIPPED: '{xl_file.name}' (already converted)")
            skipped_count += 1
            continue
        
        # Convert Excel to CSV
        try:
            print(f"🔄 Converting: '{xl_file.name}'...", end=" ")
            
            # Read Excel file
            df = pd.read_excel(xl_file)
            
            # Save as CSV
            df.to_csv(csv_filepath, index=False, encoding='utf-8-sig')
            
            print(f"✅ SUCCESS")
            converted_count += 1
            
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            error_count += 1
    
    # Print summary
    print("-" * 60)
    print(f"\n📊 CONVERSION SUMMARY:")
    print(f"   ✅ Converted: {converted_count} file(s)")
    print(f"   ⏭️  Skipped: {skipped_count} file(s)")
    print(f"   ❌ Errors: {error_count} file(s)")
    print(f"   📁 Total processed: {len(xl_files)} file(s)")

if __name__ == "__main__":
    print("=" * 60)
    print("Excel to CSV Converter")
    print("=" * 60)
    convert_xl_to_csv()
    print("\nDone!")
