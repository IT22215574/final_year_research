#!/bin/bash
#
# Setup Automated Daily Fish Zone Prediction System
#
# This script sets up a cron job to automatically:
# 1. Fetch latest environmental data (SST, chlorophyll, ocean currents) daily
# 2. Run fish zone predictions using the updated data
# 3. Generate heatmaps and outputs
#
# Author: Ravindu Jayaweera
# Date: March 2026
#

# ==============================================================================
# COLORS & FORMATTING
# ==============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# ==============================================================================
# CONFIGURATION
# ==============================================================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PIPELINE_SCRIPT="$SCRIPT_DIR/run_daily_pipeline.sh"
LOG_FILE="$SCRIPT_DIR/cron_setup.log"

# ==============================================================================
# HEADER
# ==============================================================================

clear
echo -e "${BOLD}${CYAN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Automated Fish Zone Prediction System Setup                 ║"
echo "║   Daily Environmental Data + ML Predictions                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# ==============================================================================
# VALIDATION
# ==============================================================================

echo -e "${BOLD}Checking System Requirements...${NC}"
echo ""

# Check if pipeline script exists
if [ ! -f "$PIPELINE_SCRIPT" ]; then
    echo -e "${RED}✗ Error: run_daily_pipeline.sh not found!${NC}"
    echo "Expected location: $PIPELINE_SCRIPT"
    exit 1
fi
echo -e "${GREEN}✓${NC} Pipeline script found: run_daily_pipeline.sh"

# Check if prediction script exists
if [ ! -f "$SCRIPT_DIR/predict_daily_fish_zones.py" ]; then
    echo -e "${RED}✗ Error: predict_daily_fish_zones.py not found!${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Prediction script found: predict_daily_fish_zones.py"

# Check if model exists
MODEL_PATH="$SCRIPT_DIR/finding fish location/train/models/rf_fish_zone_model.pkl"
if [ ! -f "$MODEL_PATH" ]; then
    echo -e "${YELLOW}⚠${NC}  Warning: Trained model not found at:"
    echo "    $MODEL_PATH"
    echo "    You'll need to train the model before predictions work."
    echo ""
fi

# Make scripts executable
chmod +x "$PIPELINE_SCRIPT"
chmod +x "$SCRIPT_DIR/predict_daily_fish_zones.py"
echo -e "${GREEN}✓${NC} Scripts made executable"
echo ""

# ==============================================================================
# DISPLAY WHAT WILL BE AUTOMATED
# ==============================================================================

echo -e "${BOLD}This automation will run daily:${NC}"
echo ""
echo -e "${CYAN}1. Data Fetching:${NC}"
echo "   • Sea Surface Temperature (SST)"
echo "   • Chlorophyll Concentration"
echo "   • Ocean Currents (U and V components)"
echo ""
echo -e "${CYAN}2. Machine Learning Prediction:${NC}"
echo "   • Load trained Random Forest model"
echo "   • Process environmental data"
echo "   • Predict fish zones across Sri Lankan waters"
echo ""
echo -e "${CYAN}3. Output Generation:${NC}"
echo "   • Fish zone heatmap visualization (PNG)"
echo "   • Prediction data (CSV)"
echo "   • Geographic data (GeoJSON)"
echo "   • Summary statistics (TXT)"
echo ""

# ==============================================================================
# TEST OPTION
# ==============================================================================

echo -e "${BOLD}Step 1: Test the Pipeline${NC}"
echo ""
read -p "$(echo -e ${CYAN}Would you like to test the pipeline now? [y/N]: ${NC})" -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Running pipeline test...${NC}"
    echo ""
    "$PIPELINE_SCRIPT"
    
    PIPELINE_EXIT=$?
    
    echo ""
    if [ $PIPELINE_EXIT -eq 0 ]; then
        echo -e "${GREEN}✓ Pipeline test completed successfully!${NC}"
        echo -e "Check the output in: ${BOLD}fish_zone_predictions/${NC}"
    else
        echo -e "${RED}✗ Pipeline test failed.${NC}"
        echo "Please check the logs and fix any issues before setting up automation."
        echo "Log file: $SCRIPT_DIR/daily_pipeline.log"
        exit 1
    fi
else
    echo -e "${YELLOW}⊳ Skipping test.${NC}"
    echo "You can test manually later with: ./run_daily_pipeline.sh"
fi

echo ""

# ==============================================================================
# SCHEDULE SELECTION
# ==============================================================================

echo -e "${BOLD}Step 2: Schedule Daily Automation${NC}"
echo ""
echo "Select when to run the automated pipeline:"
echo ""
echo -e "  ${GREEN}1.${NC} Daily at 6:00 AM  ${YELLOW}(recommended - fresh morning data)${NC}"
echo -e "  ${GREEN}2.${NC} Daily at midnight (00:00)"
echo -e "  ${GREEN}3.${NC} Daily at 9:00 PM (21:00)"
echo -e "  ${GREEN}4.${NC} Every 12 hours (6 AM and 6 PM)"
echo -e "  ${GREEN}5.${NC} Custom time"
echo -e "  ${GREEN}6.${NC} Skip automation setup"
echo ""

read -p "$(echo -e ${CYAN}Select option [1-6]: ${NC})" choice

case $choice in
    1)
        CRON_SCHEDULE="0 6 * * *"
        SCHEDULE_DESC="Daily at 6:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 0 * * *"
        SCHEDULE_DESC="Daily at midnight"
        ;;
    3)
        CRON_SCHEDULE="0 21 * * *"
        SCHEDULE_DESC="Daily at 9:00 PM"
        ;;
    4)
        CRON_SCHEDULE="0 6,18 * * *"
        SCHEDULE_DESC="Twice daily (6 AM and 6 PM)"
        ;;
    5)
        echo ""
        read -p "$(echo -e ${CYAN}Enter cron schedule (e.g., '0 8 * * *' for 8 AM): ${NC})" CRON_SCHEDULE
        SCHEDULE_DESC="Custom: $CRON_SCHEDULE"
        ;;
    6)
        echo -e "${YELLOW}⊳ Skipping automation setup${NC}"
        echo ""
        echo "You can run the pipeline manually anytime with:"
        echo -e "  ${BOLD}./run_daily_pipeline.sh${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

# ==============================================================================
# CRON JOB SETUP
# ==============================================================================

echo ""
echo -e "${BOLD}Setting up cron job...${NC}"

# Backup existing crontab
crontab -l > /tmp/crontab_backup_$$.txt 2>/dev/null

# Check if entry already exists
if crontab -l 2>/dev/null | grep -q "run_daily_pipeline.sh"; then
    echo -e "${YELLOW}⚠${NC}  Existing fish zone pipeline cron job found"
    read -p "$(echo -e ${CYAN}Replace it? [y/N]: ${NC})" -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Remove old entry
        crontab -l 2>/dev/null | grep -v "run_daily_pipeline.sh" | crontab -
        echo -e "${GREEN}✓${NC} Removed old cron job"
    else
        echo -e "${YELLOW}⊳ Keeping existing cron job${NC}"
        exit 0
    fi
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_SCHEDULE $PIPELINE_SCRIPT >> $SCRIPT_DIR/daily_pipeline.log 2>&1") | crontab -

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Cron job successfully configured!"
else
    echo -e "${RED}✗${NC} Failed to setup cron job"
    exit 1
fi

# ==============================================================================
# SUMMARY
# ==============================================================================

echo ""
echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║   SETUP COMPLETE!                                             ║${NC}"
echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BOLD}Configuration Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Schedule:        ${CYAN}$SCHEDULE_DESC${NC}"
echo -e "  Pipeline Script: ${CYAN}$PIPELINE_SCRIPT${NC}"
echo -e "  Log File:        ${CYAN}$SCRIPT_DIR/daily_pipeline.log${NC}"
echo -e "  Output Folder:   ${CYAN}$SCRIPT_DIR/fish_zone_predictions/${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${BOLD}What happens now:${NC}"
echo ""
echo "✓ Every day at the scheduled time, the system will:"
echo "  1. Download latest SST, chlorophyll, and ocean current data"
echo "  2. Run the fish zone prediction model"
echo "  3. Generate heatmaps and prediction files"
echo "  4. Save everything to fish_zone_predictions/"
echo ""

echo -e "${BOLD}Useful Commands:${NC}"
echo ""
echo "• View active cron jobs:"
echo -e "  ${CYAN}crontab -l${NC}"
echo ""
echo "• Check pipeline logs:"
echo -e "  ${CYAN}tail -f $SCRIPT_DIR/daily_pipeline.log${NC}"
echo ""
echo "• Run pipeline manually:"
echo -e "  ${CYAN}$PIPELINE_SCRIPT${NC}"
echo ""
echo "• View latest predictions:"
echo -e "  ${CYAN}ls -lh $SCRIPT_DIR/fish_zone_predictions/${NC}"
echo ""
echo "• Remove cron job:"
echo -e "  ${CYAN}crontab -e${NC} (then delete the line with run_daily_pipeline.sh)"
echo ""

echo -e "${BOLD}${GREEN}The automated fish zone prediction system is now active! 🐟🌊${NC}"
echo ""
