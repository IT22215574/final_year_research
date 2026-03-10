#!/bin/bash
# SETUP GUIDE: Get All 3 Datasets Daily from Copernicus
# =====================================================

echo "This guide will help you set up daily downloads for all 3 datasets:"
echo "  1. Sea Surface Temperature (SST)"
echo "  2. Ocean Currents"
echo "  3. Chlorophyll Concentration"
echo ""
echo "Current Status: You only get SST daily (not all 3)"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}STEP 1: Test the new script manually${NC}"
echo "Run this command to test:"
echo "  cd ~/Desktop/project/final_year_research/model"
echo "  ./fetch_copernicus_daily.sh"
echo ""
echo "This will download:"
echo "  ✓ SST data → sst_data/"
echo "  ✓ Ocean currents → ocean_currents/"
echo "  ✓ Chlorophyll → chlorophyll_data/"
echo ""
echo "Press Enter to continue..."
read

echo -e "${YELLOW}STEP 2: Update your cron job${NC}"
echo "Option A: Replace SST-only with all 3 datasets (RECOMMENDED)"
echo "  1. Run: crontab -e"
echo "  2. Find this line:"
echo "     0 6 * * * /Users/ravindujayaweera/Desktop/project/final_year_research/model/fetch_sst_daily.sh"
echo "  3. Replace with:"
echo "     0 6 * * * /Users/ravindujayaweera/Desktop/project/final_year_research/model/fetch_copernicus_daily.sh >> /Users/ravindujayaweera/Desktop/project/final_year_research/model/cron.log 2>&1"
echo ""
echo "Option B: Add ocean currents separately (keeps both)"
echo "  1. Run: crontab -e"
echo "  2. Add this new line:"
echo "     0 6 * * * /Users/ravindujayaweera/Desktop/project/final_year_research/model/fetch_copernicus_daily.sh >> /Users/ravindujayaweera/Desktop/project/final_year_research/model/cron.log 2>&1"
echo ""
echo "Press Enter to continue..."
read

echo -e "${YELLOW}STEP 3: Verify cron job${NC}"
echo "Run: crontab -l"
echo "You should see your updated cron job"
echo ""
echo "Press Enter to continue..."
read

echo -e "${GREEN}✓ Setup Complete!${NC}"
echo ""
echo "Your daily downloads will now fetch all 3 datasets at 6:00 AM"
echo ""
echo "Check logs:"
echo "  - Download log: model/copernicus_download_log.txt"
echo "  - Cron log: model/cron.log"
echo ""
echo "Data locations:"
echo "  - SST: model/sst_data/"
echo "  - Currents: model/ocean_currents/"
echo "  - Chlorophyll: model/chlorophyll_data/"
