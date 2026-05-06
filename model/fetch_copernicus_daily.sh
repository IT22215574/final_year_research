#!/bin/bash
#
# Daily Copernicus Data Fetcher - Shell Wrapper
#
# This script is designed to be run as a cron job to automatically
# download ocean environmental data from Copernicus Marine Service.
#
# Cron setup example (runs daily at 6:00 AM):
# 0 6 * * * /path/to/fetch_copernicus_daily.sh >> /path/to/cron.log 2>&1
#

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Load credentials from a local .env file if present (safer than embedding secrets in this script)
# Copy model/.env.example -> model/.env and fill it, then this script will source it.
if [ -f .env ]; then
    # Export all variables defined in .env into the environment for the python script
    set -o allexport
    . ./.env
    set +o allexport
else
    echo "⚠ .env not found in ${SCRIPT_DIR}. If credentials are not set globally, create model/.env from model/.env.example"
fi

# Activate Python virtual environment if you have one
# source /path/to/venv/bin/activate

# Run the Python script
echo "========================================"
echo "Starting Copernicus daily data fetch"
echo "Date: $(date)"
echo "========================================"

python3 fetch_copernicus_daily.py

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✓ Data fetch completed successfully"
else
    echo "✗ Data fetch failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
