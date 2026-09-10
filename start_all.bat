@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo     AeroSense: Physics-Guided Air Quality System
echo ===================================================
echo.

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

echo [1/3] Checking Backend virtual environment...
if not exist "backend\venv\Scripts\python.exe" (
    echo Creating Python virtual environment...
    py -3.12 -m venv backend\venv 2>nul
    if not exist "backend\venv\Scripts\python.exe" (
        python -m venv backend\venv
    )
    call backend\venv\Scripts\activate.bat
    python -m pip install -r backend\requirements.txt
)

echo [2/3] Checking Frontend node_modules...
if not exist "frontend\node_modules" (
    echo Installing frontend npm dependencies...
    cd frontend
    call npm install
    cd /d "%ROOT_DIR%"
)

echo [3/3] Launching Backend & Frontend services...

:: Start Backend (FastAPI on Port 8000)
start "AeroSense-Backend" /min cmd /c "cd /d %ROOT_DIR% && backend\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000"

:: Start Frontend (Next.js on Port 3000)
start "AeroSense-Frontend" /min cmd /c "cd /d %ROOT_DIR%\frontend && npm run dev"

echo.
echo ===================================================
echo   AeroSense is starting up!
echo   - Frontend Operations Console: http://localhost:3000
echo   - FastAPI Backend API Docs:    http://127.0.0.1:8000/docs
echo   - Health Endpoint:             http://127.0.0.1:8000/api/v1/health
echo.
echo   To stop both services cleanly, run: stop_all.bat
echo ===================================================
echo.
pause
