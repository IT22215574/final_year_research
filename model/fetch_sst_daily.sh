#!/bin/bash
# Daily SST Data Fetcher and Analyzer - Automated Script
# This script fetches the latest Sea Surface Temperature data from Copernicus
# and generates an updated heatmap

# Set Copernicus credentials
export COPERNICUS_USER='ravindujayaweera123@gmail.com'
export COPERNICUS_PASS='XarW6K6zRiF5!hk'

# Navigate to project directory
cd /Users/ravindujayaweera/Desktop/project/final_year_research

# Log start
echo "$(date): Starting SST data fetch..." >> model/sst_fetch.log

# Run the fetch script
python3 model/fetch_sst_data.py >> model/sst_fetch.log 2>&1

# Check if fetch was successful
if [ $? -eq 0 ]; then
    echo "$(date): Data fetch successful, generating heatmap..." >> model/sst_fetch.log
    
    # Generate the heatmap
    python3 model/analyze_sst_data.py >> model/sst_fetch.log 2>&1
    
    if [ $? -eq 0 ]; then
        echo "$(date): Heatmap generation successful" >> model/sst_fetch.log
    else
        echo "$(date): ERROR - Heatmap generation failed" >> model/sst_fetch.log
    fi
else
    echo "$(date): ERROR - Data fetch failed" >> model/sst_fetch.log
fi

echo "$(date): SST update completed" >> model/sst_fetch.log
echo "---" >> model/sst_fetch.log
