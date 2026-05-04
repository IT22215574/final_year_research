#!/usr/bin/env python3
"""
🚤 Fish Trip Cost Prediction - Integration Verification Script
Checks that backend, mobile, and ML service are correctly using boat-type-specific models
"""

import os
import json
import sys
from pathlib import Path

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

class Verifier:
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.issues = []
        self.warnings = []
        self.successes = []
        
    def check(self, condition, message, is_critical=True):
        """Check condition and log result"""
        if condition:
            self.successes.append(message)
            print(f"{GREEN}✅{RESET} {message}")
        else:
            if is_critical:
                self.issues.append(message)
                print(f"{RED}❌{RESET} {message}")
            else:
                self.warnings.append(message)
                print(f"{YELLOW}⚠️ {RESET} {message}")
    
    def info(self, message):
        """Print info message"""
        print(f"{BLUE}ℹ️ {RESET} {message}")
    
    def section(self, title):
        """Print section header"""
        print(f"\n{BLUE}{'='*60}{RESET}")
        print(f"{BLUE}{title}{RESET}")
        print(f"{BLUE}{'='*60}{RESET}\n")
    
    def run(self):
        """Run all verifications"""
        print(f"{BLUE}🚤 Fish Trip Cost Prediction - Integration Verification{RESET}\n")
        
        self.verify_model_structure()
        self.verify_backend_integration()
        self.verify_mobile_integration()
        self.verify_ml_service()
        self.verify_training_data()
        
        self.print_summary()
        
        return len(self.issues) == 0
    
    def verify_model_structure(self):
        """Check that model directories exist"""
        self.section("1. MODEL DIRECTORY STRUCTURE")
        
        models_base = self.base_dir / "model" / "cost_prediction" / "models" / "fishtripcost"
        
        # Check boat-type directories
        boat_types = ["idat", "imui", "mtrp", "ofrp"]
        for boat_type in boat_types:
            path = models_base / "boat_type" / boat_type / "best_model" / "fuel_model.pkl"
            exists = path.exists()
            self.check(
                exists,
                f"Boat type '{boat_type}' model: {path}",
                is_critical=True
            )
        
        # Check global model
        global_path = models_base / "global" / "best_model" / "fuel_model.pkl"
        self.check(
            global_path.exists(),
            f"Global fallback model: {global_path}",
            is_critical=False
        )
    
    def verify_backend_integration(self):
        """Check backend is sending boatType to ML service"""
        self.section("2. BACKEND INTEGRATION (NestJS)")
        
        service_file = self.base_dir / "Backend" / "src" / "cost-engine" / "cost-engine.service.ts"
        
        self.check(
            service_file.exists(),
            f"Cost engine service exists: {service_file}"
        )
        
        if service_file.exists():
            content = service_file.read_text()
            
            # Check for boatType parameter
            self.check(
                "boatType: boat.boatType" in content or "boatType: boat.boatType," in content,
                "Backend sends 'boatType' to ML service POST request"
            )
            
            # Check for boat.boatType access
            self.check(
                "boat.boatType" in content,
                "Backend accesses boat.boatType from database"
            )
            
            # Check ML service call
            self.check(
                "'/predict/fuel'" in content,
                "Backend calls '/predict/fuel' endpoint on ML service"
            )
    
    def verify_mobile_integration(self):
        """Check mobile sends boatType in requests"""
        self.section("3. MOBILE INTEGRATION (React Native)")
        
        trip_planner = self.base_dir / "mobile" / "app" / "(root)" / "(tabs)" / "fishtripcost" / "components" / "TripPlanner.tsx"
        
        self.check(
            trip_planner.exists(),
            f"Trip planner component exists: {trip_planner}"
        )
        
        if trip_planner.exists():
            content = trip_planner.read_text()
            
            # Check for boatId usage
            self.check(
                "boatId: boatMongoId" in content or "boatId:" in content,
                "Mobile sends boatId in prediction request"
            )
            
            # Check boat selection
            self.check(
                "selectedBoat" in content or "boats" in content,
                "Mobile loads boat data including boatType"
            )
        
        # Check boat service
        boat_service = self.base_dir / "mobile" / "services" / "boatService.ts"
        self.check(
            boat_service.exists(),
            f"Boat service exists: {boat_service}"
        )
        
        if boat_service.exists():
            content = boat_service.read_text()
            self.check(
                "boatType" in content,
                "Boat service includes boatType in Boat type"
            )
    
    def verify_ml_service(self):
        """Check ML service (Python) correctly resolves models"""
        self.section("4. ML SERVICE INTEGRATION (Python)")
        
        adaptive_fuel = self.base_dir / "model" / "cost_prediction" / "services" / "fuel" / "adaptive_fuel.py"
        
        self.check(
            adaptive_fuel.exists(),
            f"AdaptiveFuelEngine exists: {adaptive_fuel}"
        )
        
        if adaptive_fuel.exists():
            content = adaptive_fuel.read_text()
            
            # Check boat type resolution
            self.check(
                "_resolve_model_path" in content,
                "ML service has model resolution logic"
            )
            
            # Check for boat_type priority
            self.check(
                "boat_type" in content.lower() or "BOAT_TYPE" in content,
                "ML service prioritizes boat-type-specific models"
            )
            
            # Check fallback logic
            self.check(
                "GLOBAL" in content,
                "ML service has global model fallback"
            )
        
        # Check app.py has FuelPredictionRequest
        app_py = self.base_dir / "model" / "cost_prediction" / "app.py"
        if app_py.exists():
            content = app_py.read_text()
            self.check(
                "boatType:" in content,
                "ML service accepts boatType in FuelPredictionRequest",
                is_critical=True
            )
    
    def verify_training_data(self):
        """Check training data exists for each boat type"""
        self.section("5. TRAINING DATA")
        
        training_data_dir = self.base_dir / "model" / "cost_prediction" / "training_data"
        
        boat_types = ["idat", "imui", "mtrp", "ofrp"]
        for boat_type in boat_types:
            csv_file = training_data_dir / f"training_data_{boat_type}.csv"
            exists = csv_file.exists()
            
            if exists:
                # Count rows
                with open(csv_file) as f:
                    row_count = sum(1 for _ in f) - 1  # Minus header
                
                self.check(
                    row_count > 0,
                    f"Training data for '{boat_type}': {csv_file} ({row_count} rows)"
                )
            else:
                self.check(
                    False,
                    f"Training data for '{boat_type}': {csv_file}"
                )
        
        # Check for training notebooks
        self.info("Colab Training Notebooks:")
        colab_dir = self.base_dir / "model" / "cost_prediction" / "colab"
        if colab_dir.exists():
            for notebook in ["boat_type_idat_training.ipynb", "boat_type_imui_training.ipynb", 
                           "boat_type_mtrp_training.ipynb", "boat_type_ofrp_training.ipynb"]:
                nb_path = colab_dir / notebook
                exists = nb_path.exists()
                self.check(
                    exists,
                    f"  {notebook}",
                    is_critical=False
                )
    
    def print_summary(self):
        """Print final summary"""
        self.section("VERIFICATION SUMMARY")
        
        total = len(self.successes) + len(self.issues) + len(self.warnings)
        
        print(f"{GREEN}✅ Successes: {len(self.successes)}/{total}{RESET}")
        print(f"{RED}❌ Critical Issues: {len(self.issues)}{RESET}")
        print(f"{YELLOW}⚠️  Warnings: {len(self.warnings)}{RESET}\n")
        
        if self.issues:
            print(f"{RED}CRITICAL ISSUES TO FIX:{RESET}")
            for issue in self.issues:
                print(f"  • {issue}")
            print()
        
        if self.warnings:
            print(f"{YELLOW}RECOMMENDATIONS:{RESET}")
            for warning in self.warnings:
                print(f"  • {warning}")
            print()
        
        if not self.issues:
            print(f"{GREEN}✨ ALL CRITICAL CHECKS PASSED!{RESET}")
            print(f"{GREEN}Integration is properly configured.{RESET}\n")
            print("Next steps:")
            print(f"  1. Train missing boat-type Colab notebooks (IMUI, MTRP, OFRP)")
            print(f"  2. Verify models save to: models/fishtripcost/boat_type/*/best_model/")
            print(f"  3. Test predictions with each boat type")
        else:
            print(f"{RED}⚠️  PLEASE FIX CRITICAL ISSUES ABOVE{RESET}\n")
            print("For help, see: BOAT_TYPE_MODEL_TRAINING_GUIDE.md")
            sys.exit(1)


if __name__ == "__main__":
    verifier = Verifier()
    success = verifier.run()
    sys.exit(0 if success else 1)
