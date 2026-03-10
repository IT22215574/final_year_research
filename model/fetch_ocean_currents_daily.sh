#!/bin/bash
# Daily Ocean Current Data Fetcher - Automated Script
# This script fetches the latest ocean current data (uo, vo) from Copernicus
# and archives it for future usage

# Set Copernicus credentials
export COPERNICUS_USER='ravindujayaweera123@gmail.com'
export COPERNICUS_PASS='XarW6K6zRiF5!hk'

# Navigate to project directory
cd /Users/ravindujayaweera/Desktop/project/final_year_research

# Log start
echo "$(date): Starting ocean current data fetch..." >> model/ocean_currents_fetch.log

# Run the fetch script
python3 model/fetch_ocean_currents.py >> model/ocean_currents_fetch.log 2>&1

# Check if fetch was successful
if [ $? -eq 0 ]; then
    echo "$(date): Ocean current data fetch successful" >> model/ocean_currents_fetch.log
    
    # Optional: Generate visualization/analysis
    # Uncomment the following lines if you create an analysis script
    # echo "$(date): Generating ocean current analysis..." >> model/ocean_currents_fetch.log
    # python3 model/analyze_ocean_currents.py >> model/ocean_currents_fetch.log 2>&1
    # 
    # if [ $? -eq 0 ]; then
    #     echo "$(date): Analysis generation successful" >> model/ocean_currents_fetch.log
    # else
    #     echo "$(date): ERROR - Analysis generation failed" >> model/ocean_currents_fetch.log
    # fi
else
    echo "$(date): ERROR - Ocean current data fetch failed" >> model/ocean_currents_fetch.log
fi

echo "$(date): Ocean current update completed" >> model/ocean_currents_fetch.log
echo "---" >> model/ocean_currents_fetch.log
