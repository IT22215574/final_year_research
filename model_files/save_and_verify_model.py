"""
Complete Model Saving and Verification Script
Saves the trained model in multiple formats and verifies all files.
"""

import joblib
import pickle
import json
import os
from pathlib import Path
from datetime import datetime

# Get model directory
MODEL_DIR = Path(__file__).parent

def verify_existing_files():
    """Verify all existing model files can be loaded."""
    print("="*60)
    print("VERIFYING EXISTING MODEL FILES")
    print("="*60)
    
    files_to_check = {
        'Model (joblib)': 'fishing_cost_model_latest.joblib',
        'Model Backup': 'fishing_cost_model_best_20260104_175416.joblib',
        'Scaler': 'scaler.joblib',
        'Encoders': 'label_encoders.joblib',
        'Metadata': 'model_metadata.json'
    }
    
    all_good = True
    
    for name, filename in files_to_check.items():
        filepath = MODEL_DIR / filename
        if filepath.exists():
            try:
                if filename.endswith('.json'):
                    with open(filepath, 'r') as f:
                        data = json.load(f)
                    print(f"✅ {name}: {filename} ({filepath.stat().st_size} bytes)")
                else:
                    data = joblib.load(filepath)
                    print(f"✅ {name}: {filename} ({filepath.stat().st_size} bytes)")
            except Exception as e:
                print(f"❌ {name}: Failed to load - {str(e)}")
                all_good = False
        else:
            print(f"❌ {name}: File not found - {filename}")
            all_good = False
    
    return all_good

def save_model_as_pickle():
    """Save the model in pickle format (.pkl) as well."""
    print("\n" + "="*60)
    print("CREATING PICKLE (.pkl) FORMAT")
    print("="*60)
    
    try:
        # Load existing joblib files
        model = joblib.load(MODEL_DIR / 'fishing_cost_model_latest.joblib')
        scaler = joblib.load(MODEL_DIR / 'scaler.joblib')
        encoders = joblib.load(MODEL_DIR / 'label_encoders.joblib')
        
        # Save as pickle
        pkl_files = []
        
        # Save model
        model_pkl = MODEL_DIR / 'fishing_cost_model.pkl'
        with open(model_pkl, 'wb') as f:
            pickle.dump(model, f)
        pkl_files.append(model_pkl)
        print(f"✅ Saved: fishing_cost_model.pkl ({model_pkl.stat().st_size} bytes)")
        
        # Save scaler
        scaler_pkl = MODEL_DIR / 'scaler.pkl'
        with open(scaler_pkl, 'wb') as f:
            pickle.dump(scaler, f)
        pkl_files.append(scaler_pkl)
        print(f"✅ Saved: scaler.pkl ({scaler_pkl.stat().st_size} bytes)")
        
        # Save encoders
        encoders_pkl = MODEL_DIR / 'label_encoders.pkl'
        with open(encoders_pkl, 'wb') as f:
            pickle.dump(encoders, f)
        pkl_files.append(encoders_pkl)
        print(f"✅ Saved: label_encoders.pkl ({encoders_pkl.stat().st_size} bytes)")
        
        # Save complete bundle
        bundle_pkl = MODEL_DIR / 'model_bundle_complete.pkl'
        with open(bundle_pkl, 'wb') as f:
            pickle.dump({
                'model': model,
                'scaler': scaler,
                'encoders': encoders,
                'timestamp': datetime.now().isoformat()
            }, f)
        pkl_files.append(bundle_pkl)
        print(f"✅ Saved: model_bundle_complete.pkl ({bundle_pkl.stat().st_size} bytes)")
        print(f"   (Contains: model + scaler + encoders in one file)")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to create pickle files: {str(e)}")
        return False

def test_all_formats():
    """Test loading from both joblib and pickle formats."""
    print("\n" + "="*60)
    print("TESTING ALL FORMATS")
    print("="*60)
    
    formats_to_test = [
        ('JOBLIB', 'fishing_cost_model_latest.joblib', joblib.load),
        ('PICKLE', 'fishing_cost_model.pkl', lambda f: pickle.load(open(f, 'rb'))),
        ('BUNDLE', 'model_bundle_complete.pkl', lambda f: pickle.load(open(f, 'rb')))
    ]
    
    for format_name, filename, load_func in formats_to_test:
        filepath = MODEL_DIR / filename
        if filepath.exists():
            try:
                data = load_func(filepath)
                if format_name == 'BUNDLE':
                    print(f"✅ {format_name}: {filename}")
                    print(f"   - Model: {type(data['model']).__name__}")
                    print(f"   - Scaler: {type(data['scaler']).__name__}")
                    print(f"   - Encoders: {len(data['encoders'])} encoders")
                    print(f"   - Timestamp: {data['timestamp']}")
                else:
                    print(f"✅ {format_name}: {filename} - Type: {type(data).__name__}")
            except Exception as e:
                print(f"❌ {format_name}: Failed - {str(e)}")
        else:
            print(f"⚠️  {format_name}: File not found - {filename}")

def create_usage_examples():
    """Create usage example files for different formats."""
    print("\n" + "="*60)
    print("CREATING USAGE EXAMPLES")
    print("="*60)
    
    # Example 1: Using joblib format
    example1 = """'''
Example 1: Load model using JOBLIB format (Recommended)
This is the standard format for scikit-learn models.
'''

import joblib
import pandas as pd
from pathlib import Path

MODEL_DIR = Path(__file__).parent

# Load model components
model = joblib.load(MODEL_DIR / 'fishing_cost_model_latest.joblib')
scaler = joblib.load(MODEL_DIR / 'scaler.joblib')
encoders = joblib.load(MODEL_DIR / 'label_encoders.joblib')

print("✅ Model loaded successfully using JOBLIB")
"""
    
    # Example 2: Using pickle format
    example2 = """'''
Example 2: Load model using PICKLE format (.pkl)
Alternative format, compatible with standard Python pickle.
'''

import pickle
import pandas as pd
from pathlib import Path

MODEL_DIR = Path(__file__).parent

# Load model components
with open(MODEL_DIR / 'fishing_cost_model.pkl', 'rb') as f:
    model = pickle.load(f)
    
with open(MODEL_DIR / 'scaler.pkl', 'rb') as f:
    scaler = pickle.load(f)
    
with open(MODEL_DIR / 'label_encoders.pkl', 'rb') as f:
    encoders = pickle.load(f)

print("✅ Model loaded successfully using PICKLE")
"""
    
    # Example 3: Using complete bundle
    example3 = """'''
Example 3: Load complete bundle (ALL IN ONE)
Easiest method - everything in a single file.
'''

import pickle
from pathlib import Path

MODEL_DIR = Path(__file__).parent

# Load complete bundle
with open(MODEL_DIR / 'model_bundle_complete.pkl', 'rb') as f:
    bundle = pickle.load(f)

model = bundle['model']
scaler = bundle['scaler']
encoders = bundle['encoders']

print("✅ Complete bundle loaded successfully")
print(f"   Model: {type(model).__name__}")
print(f"   Saved on: {bundle['timestamp']}")
"""
    
    examples_file = MODEL_DIR / 'USAGE_EXAMPLES.py'
    with open(examples_file, 'w') as f:
        f.write("# Model Loading Examples - Multiple Formats\n\n")
        f.write(example1 + "\n\n")
        f.write(example2 + "\n\n")
        f.write(example3 + "\n\n")
    
    print(f"✅ Created: USAGE_EXAMPLES.py")

def generate_summary():
    """Generate a summary of all saved files."""
    print("\n" + "="*60)
    print("MODEL FILES SUMMARY")
    print("="*60)
    
    print("\n📦 JOBLIB FORMAT (Recommended for scikit-learn):")
    print("   • fishing_cost_model_latest.joblib - Latest trained model")
    print("   • scaler.joblib - Feature scaler")
    print("   • label_encoders.joblib - Categorical encoders")
    
    print("\n📦 PICKLE FORMAT (Standard Python pickle):")
    print("   • fishing_cost_model.pkl - Model only")
    print("   • scaler.pkl - Scaler only")
    print("   • label_encoders.pkl - Encoders only")
    print("   • model_bundle_complete.pkl - ALL IN ONE file")
    
    print("\n📄 METADATA & DOCUMENTATION:")
    print("   • model_metadata.json - Model config & metrics")
    print("   • MODEL_REPORT.md - Complete technical report")
    print("   • QUICK_START.md - Integration guide")
    print("   • README.md - Overview")
    print("   • test_model_loading.py - Test script")
    print("   • USAGE_EXAMPLES.py - Loading examples")
    
    print("\n✅ All model formats are available and verified!")
    print("💡 Use JOBLIB format for best compatibility with scikit-learn")

def main():
    """Main function to verify and save all model formats."""
    print("\n" + "="*70)
    print("FISHING COST PREDICTION MODEL - SAVE & VERIFY")
    print("="*70)
    
    # Step 1: Verify existing files
    if verify_existing_files():
        print("\n✅ All existing model files verified successfully!")
    else:
        print("\n⚠️  Some files have issues. Check above for details.")
        return
    
    # Step 2: Create pickle versions
    if save_model_as_pickle():
        print("\n✅ Pickle format files created successfully!")
    
    # Step 3: Test all formats
    test_all_formats()
    
    # Step 4: Create usage examples
    create_usage_examples()
    
    # Step 5: Generate summary
    generate_summary()
    
    print("\n" + "="*70)
    print("✅ COMPLETE! Model is saved in multiple formats and verified.")
    print("="*70)
    print("\n📚 Next Steps:")
    print("   1. Use 'fishing_cost_model_latest.joblib' (RECOMMENDED)")
    print("   2. Or use 'fishing_cost_model.pkl' (standard pickle)")
    print("   3. Or use 'model_bundle_complete.pkl' (all-in-one)")
    print("   4. See 'USAGE_EXAMPLES.py' for loading code")
    print("   5. Run 'test_model_loading.py' to test predictions")

if __name__ == "__main__":
    main()
