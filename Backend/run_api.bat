@echo off
setlocal

echo Starting Fish Price Predictor API...
echo.

:: Change to Backend folder (capital B)
cd /d "%~dp0"

:: Check if venv exists
if not exist "..\.venv\Scripts\python.exe" (
    echo ERROR: Virtual environment not found!
    echo Please run: python -m venv .venv
    pause
    exit /b 1
)

:: Check if models exist
if not exist "models\rf_model.pkl" (
    echo ERROR: Model files not found!
    echo Please run model_train.py first to generate models.
    pause
    exit /b 1
)

:: Start API server
echo Starting API on http://0.0.0.0:8000
echo Backend will be accessible from network at http://YOUR_PC_IP:8000
echo Press Ctrl+C to stop
echo.

"..\.venv\Scripts\python.exe" -m uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload

endlocal

