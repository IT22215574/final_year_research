#!/bin/bash
#
# Automated Cron Job Setup for Daily Ocean Data Downloads
#
# This script helps you set up a cron job to automatically download
# SST, Chlorophyll, and Ocean Currents data daily from Copernicus Marine Service.
#
# Author: Ravindu Jayaweera
# Date: March 2026
#

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Get the absolute path of the model directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FETCH_SCRIPT="$SCRIPT_DIR/fetch_copernicus_daily.sh"
LOG_FILE="$SCRIPT_DIR/cron.log"

clear
echo -e "${BOLD}${CYAN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Ocean Data Automated Download Setup                         ║"
echo "║   Copernicus Marine Service - Daily Data Fetcher              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check if fetch script exists
if [ ! -f "$FETCH_SCRIPT" ]; then
    echo -e "${RED}✗ Error: fetch_copernicus_daily.sh not found!${NC}"
    echo "Expected location: $FETCH_SCRIPT"
    exit 1
fi

# Make fetch script executable
chmod +x "$FETCH_SCRIPT"
echo -e "${GREEN}✓${NC} Found fetch script: ${BOLD}fetch_copernicus_daily.sh${NC}"
echo ""

# Display what datasets will be downloaded
echo -e "${BOLD}This will set up automatic daily downloads for:${NC}"
echo -e "  ${GREEN}1.${NC} Sea Surface Temperature (SST)"
echo -e "  ${GREEN}2.${NC} Chlorophyll Concentration"
echo -e "  ${GREEN}3.${NC} Ocean Currents (U and V velocities)"
echo ""
echo -e "${YELLOW}Note:${NC} Bathymetry data is static and only needs to be downloaded once."
echo ""

# Check if credentials are set
echo -e "${BOLD}Step 1: Checking Credentials${NC}"
if grep -q "your_username_here\|ravindujayaweera123@gmail.com" "$FETCH_SCRIPT"; then
    echo -e "${YELLOW}⚠${NC}  Credentials found in script (update if needed)"
else
    echo -e "${YELLOW}⚠${NC}  Please ensure COPERNICUS_USER and COPERNICUS_PASS are set in:"
    echo "     - Environment variables (recommended), OR"
    echo "     - fetch_copernicus_daily.sh script"
fi
echo ""

# Test the script first
echo -e "${BOLD}Step 2: Test Manual Execution${NC}"
echo -e "Before setting up automation, let's test the script manually."
echo ""
read -p "$(echo -e ${CYAN}Do you want to test download now? [y/N]: ${NC})" -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Running test download...${NC}"
    echo ""
    "$FETCH_SCRIPT"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Test download completed successfully!${NC}"
    else
        echo ""
        echo -e "${RED}✗ Test download failed. Please check credentials and try again.${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⊳ Skipping test. You can test later with: ./fetch_copernicus_daily.sh${NC}"
fi
echo ""

# Cron setup
echo -e "${BOLD}Step 3: Schedule Daily Downloads${NC}"
echo "Select when you want to download data automatically:"
echo ""
echo -e "  ${GREEN}1.${NC} Daily at 6:00 AM  ${YELLOW}(recommended)${NC}"
echo -e "  ${GREEN}2.${NC} Daily at midnight (00:00)"
echo -e "  ${GREEN}3.${NC} Daily at 9:00 PM"
echo -e "  ${GREEN}4.${NC} Every 12 hours (6 AM and 6 PM)"
echo -e "  ${GREEN}5.${NC} Custom time"
echo -e "  ${GREEN}6.${NC} Skip automated setup"
echo ""
read -p "$(echo -e ${CYAN}Enter your choice [1-6]: ${NC})" choice

case $choice in
    1)
        CRON_TIME="0 6 * * *"
        SCHEDULE_DESC="6:00 AM daily"
        ;;
    2)
        CRON_TIME="0 0 * * *"
        SCHEDULE_DESC="midnight daily"
        ;;
    3)
        CRON_TIME="0 21 * * *"
        SCHEDULE_DESC="9:00 PM daily"
        ;;
    4)
        CRON_TIME="0 6,18 * * *"
        SCHEDULE_DESC="6:00 AM and 6:00 PM daily"
        ;;
    5)
        echo ""
        echo "Enter cron schedule (e.g., '0 8 * * *' for 8 AM daily):"
        read -p "Cron expression: " CRON_TIME
        SCHEDULE_DESC="custom schedule"
        ;;
    6)
        echo ""
        echo -e "${YELLOW}⊳ Skipping automated setup.${NC}"
        echo ""
        echo "To set up manually later, run:"
        echo "  crontab -e"
        echo ""
        echo "And add this line:"
        echo "  0 6 * * * $FETCH_SCRIPT >> $LOG_FILE 2>&1"
        exit 0
        ;;
    *)
        echo -e "${RED}✗ Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

# Prepare cron job entry
CRON_JOB="$CRON_TIME $FETCH_SCRIPT >> $LOG_FILE 2>&1"

echo ""
echo -e "${BOLD}Cron Job Configuration:${NC}"
echo -e "${CYAN}$CRON_JOB${NC}"
echo ""
echo -e "This will download data ${BOLD}$SCHEDULE_DESC${NC}"
echo ""
read -p "$(echo -e ${CYAN}Proceed with this configuration? [Y/n]: ${NC})" -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "fetch_copernicus_daily.sh"; then
        echo ""
        echo -e "${YELLOW}⚠ A cron job for this script already exists!${NC}"
        echo ""
        echo "Existing cron jobs:"
        crontab -l 2>/dev/null | grep "fetch_copernicus_daily.sh"
        echo ""
        read -p "$(echo -e ${CYAN}Replace existing cron job? [y/N]: ${NC})" -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Remove old entry and add new one
            (crontab -l 2>/dev/null | grep -v "fetch_copernicus_daily.sh"; echo "$CRON_JOB") | crontab -
            echo -e "${GREEN}✓ Cron job updated successfully!${NC}"
        else
            echo -e "${YELLOW}⊳ Keeping existing cron job. No changes made.${NC}"
        fi
    else
        # Add new cron job
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        echo -e "${GREEN}✓ Cron job added successfully!${NC}"
    fi
else
    echo -e "${YELLOW}⊳ Setup cancelled. No cron job added.${NC}"
    exit 0
fi

echo ""
echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}   Setup Complete! ✓${NC}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Your automated downloads are now configured.${NC}"
echo ""
echo -e "${CYAN}Schedule:${NC} $SCHEDULE_DESC"
echo -e "${CYAN}Downloads:${NC} SST, Chlorophyll, Ocean Currents"
echo -e "${CYAN}Log file:${NC} $LOG_FILE"
echo ""
echo -e "${BOLD}Useful Commands:${NC}"
echo -e "  ${GREEN}•${NC} View scheduled jobs:  ${CYAN}crontab -l${NC}"
echo -e "  ${GREEN}•${NC} Edit cron jobs:       ${CYAN}crontab -e${NC}"
echo -e "  ${GREEN}•${NC} Remove all cron jobs: ${CYAN}crontab -r${NC}"
echo -e "  ${GREEN}•${NC} View cron log:        ${CYAN}tail -f $LOG_FILE${NC}"
echo -e "  ${GREEN}•${NC} View download log:    ${CYAN}tail -f $SCRIPT_DIR/copernicus_download_log.txt${NC}"
echo -e "  ${GREEN}•${NC} Manual download:      ${CYAN}$FETCH_SCRIPT${NC}"
echo ""
echo -e "${BOLD}Data Storage Locations:${NC}"
echo -e "  ${GREEN}•${NC} All daily data: $SCRIPT_DIR/Fish zone daily data/"
echo ""
echo -e "${YELLOW}Note:${NC} Your first automated download will occur at the scheduled time."
echo -e "      You can check the logs to verify successful execution."
echo ""
echo -e "For detailed documentation, see: ${CYAN}OCEAN_DATA_SETUP_GUIDE.md${NC}"
echo ""
