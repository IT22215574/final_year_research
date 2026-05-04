@echo off
REM ==============================================================================
REM WEEKLY AUTOMATED FISH PRICE PREDICTION MODEL UPDATE
REM ==============================================================================
REM This script automates downloading the latest weekly fish prices from 
REM the Fisheries Ministry website and retrains the Machine Learning models.
REM 
REM Set this script up in Windows Task Scheduler to run every Monday Morning.
REM ==============================================================================

echo --------------------------------------------------------
echo 🐟 AUTOMATED FISH PRICE MODEL UPDATE STARTED
echo --------------------------------------------------------
date /t
time /t
echo.

REM Change directory to the root of the project
cd /d "%~dp0"

REM Check if Python virtual environment exists
if not exist ".venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found in %~dp0.venv
    echo Please set up the python environment.
    pause
    exit /b 1
)

REM Activate the virtual environment
call ".venv\Scripts\activate.bat"

echo.
echo [1/3] DOWNLOADING LATEST EXCEL FILES AND GENERATING FEATURES...
echo --------------------------------------------------------
python model\run_excel_pipeline.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Excel pipeline failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] RETRAINING MACHINE LEARNING MODELS...
echo --------------------------------------------------------
python -c "from model.fish_price_prediction.main import train_models; train_models()"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Model training failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] UPDATE COMPLETE!
echo --------------------------------------------------------
echo The fish price prediction models have been successfully updated with the latest data.
echo.

REM Deactivate virtual environment
deactivate

REM Wait 5 seconds before closing (optional)
timeout /t 5 >nul
