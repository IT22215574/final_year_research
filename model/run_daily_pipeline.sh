#!/bin/bash
#
# Daily Ocean Data & Fish Zone Prediction Pipeline
#
# This script orchestrates the complete daily workflow:
# 1. Fetch latest environmental data (SST, chlorophyll, ocean currents)
# 2. Run fish zone predictions using the updated data
# 3. Generate visualizations and outputs
# 4. Log all activities
#
# Designed to run as a daily cron job
#
# Author: Ravindu Jayaweera
# Date: March 2026
#

# ==============================================================================
# CONFIGURATION
# ==============================================================================

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Set Copernicus credentials
export COPERNICUS_USER='ravindujayaweera123@gmail.com'
export COPERNICUS_PASS='XarW6K6zRiF5!hk'

# Log file
LOG_FILE="$SCRIPT_DIR/daily_pipeline.log"

# Python executable (adjust if using virtual environment)
PYTHON_EXEC="python3"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ==============================================================================
# LOGGING FUNCTIONS
# ==============================================================================

log_message() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    log_message "INFO" "$@"
}

log_error() {
    log_message "ERROR" "$@"
}

log_success() {
    log_message "SUCCESS" "$@"
}

print_header() {
    echo -e "\n${BOLD}${CYAN}$1${NC}\n" | tee -a "$LOG_FILE"
}

print_separator() {
    echo "================================================================" | tee -a "$LOG_FILE"
}

# ==============================================================================
# MAIN PIPELINE
# ==============================================================================

main() {
    print_separator
    print_header "🌊 DAILY OCEAN DATA & FISH ZONE PREDICTION PIPELINE"
    log_info "Pipeline started"
    print_separator
    
    # -------------------------------------------------------------------------
    # STEP 1: FETCH ENVIRONMENTAL DATA
    # -------------------------------------------------------------------------
    print_header "📡 STEP 1: Fetching Environmental Data"
    
    log_info "Downloading SST, Chlorophyll, and Ocean Currents data from Copernicus..."
    
    $PYTHON_EXEC fetch_copernicus_daily.py >> "$LOG_FILE" 2>&1
    DATA_FETCH_EXIT=$?
    
    if [ $DATA_FETCH_EXIT -eq 0 ]; then
        log_success "✓ Environmental data fetch completed successfully"
    else
        log_error "✗ Environmental data fetch failed (exit code: $DATA_FETCH_EXIT)"
        log_error "Fish zone prediction cannot proceed without updated data"
        print_separator
        exit 1
    fi
    
    # -------------------------------------------------------------------------
    # STEP 2: PREDICT FISH ZONES
    # -------------------------------------------------------------------------
    print_header "🐟 STEP 2: Predicting Fish Zones"
    
    log_info "Running fish zone prediction model with latest data..."
    
    $PYTHON_EXEC predict_daily_fish_zones.py >> "$LOG_FILE" 2>&1
    PREDICTION_EXIT=$?
    
    if [ $PREDICTION_EXIT -eq 0 ]; then
        log_success "✓ Fish zone prediction completed successfully"
    else
        log_error "✗ Fish zone prediction failed (exit code: $PREDICTION_EXIT)"
        print_separator
        exit 1
    fi
    
    # -------------------------------------------------------------------------
    # STEP 3: SUMMARY
    # -------------------------------------------------------------------------
    print_header "📊 PIPELINE SUMMARY"
    
    # Check output files
    LATEST_PREDICTION=$(ls -t fish_zone_predictions/fish_zones_*.csv 2>/dev/null | head -1)
    LATEST_HEATMAP=$(ls -t fish_zone_predictions/fish_zones_heatmap_*.png 2>/dev/null | head -1)
    LATEST_GEOJSON=$(ls -t fish_zone_predictions/fish_zones_*.geojson 2>/dev/null | head -1)
    
    if [ -n "$LATEST_PREDICTION" ]; then
        log_info "Latest prediction CSV: $LATEST_PREDICTION"
    fi
    
    if [ -n "$LATEST_HEATMAP" ]; then
        log_info "Latest heatmap: $LATEST_HEATMAP"
    fi
    
    if [ -n "$LATEST_GEOJSON" ]; then
        log_info "Latest GeoJSON: $LATEST_GEOJSON"
    fi
    
    # Data status
    echo "" | tee -a "$LOG_FILE"
    log_info "Current Data Status:"
    log_info "  SST Data:         $(ls -t 'Fish zone daily data'/sst_*.nc 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo 'None')"
    log_info "  Chlorophyll Data: $(ls -t 'Fish zone daily data'/chlorophyll_*.nc 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo 'None')"
    log_info "  Ocean Currents:   $(ls -t 'Fish zone daily data'/currents_*.nc 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo 'None')"
    log_info "  Bathymetry:       $(ls -t 'Fish zone daily data'/bathymetry*.nc 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo 'None')"
    
    # -------------------------------------------------------------------------
    # COMPLETION
    # -------------------------------------------------------------------------
    echo "" | tee -a "$LOG_FILE"
    log_success "🎉 Daily pipeline completed successfully!"
    log_info "All outputs saved to: $SCRIPT_DIR/fish_zone_predictions/"
    print_separator
    
    return 0
}

# ==============================================================================
# EXECUTION
# ==============================================================================

# Run main pipeline
main

# Exit with status
exit $?
