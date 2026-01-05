@echo off
setlocal

:: Change to project root (adjust if path changes)
cd /d "D:\Research Project\final_year_research\Backend"

:: Activate virtual environment and start API on all interfaces, port 8000
"..\.venv\Scripts\python.exe" -m uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload

endlocal
