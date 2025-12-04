import subprocess
import sys

def install_pandas():
    """
    Install pandas library and other dependencies using pip.
    """
    print("=" * 60)
    print("Installing dependencies...")
    print("=" * 60)
    
    packages = [
        "pandas",
        "openpyxl",
        "requests",
        "scikit-learn",
        "numpy",
        "tkcalendar"
    ]
    
    try:
        for package in packages:
            print(f"\nInstalling {package}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            print(f"✅ {package} installed successfully!")
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error installing packages: {e}")
        sys.exit(1)

if __name__ == "__main__":
    install_pandas()
    print("\n" + "="*60)
    print("✅ All dependencies installed successfully!")
    print("="*60)
