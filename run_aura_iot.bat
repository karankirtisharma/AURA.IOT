@echo off
setlocal enabledelayedexpansion
cd /d %~dp0
title AURA.IOT Launcher

echo ==========================================
echo    AURA.IOT: Intelligent IoT Dashboard
echo ==========================================
echo.

:: ---- Check Python venv ----
if not exist ".\venv\Scripts\python.exe" (
    echo [SETUP] Creating Python environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create venv. Check your Python installation.
        pause
        exit /b 1
    )
    echo [SETUP] Installing Python dependencies...
    call .\venv\Scripts\pip.exe install --upgrade pip
    call .\venv\Scripts\pip.exe install Flask tensorflow scikit-learn pandas numpy
    if errorlevel 1 (
        echo [ERROR] Failed to install Python dependencies.
        pause
        exit /b 1
    )
)

:: ---- Check node_modules ----
if not exist ".\node_modules\" (
    echo [SETUP] node_modules not found. Running npm install...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo [ERROR] npm install failed. Please run it manually.
        pause
        exit /b 1
    )
)

:: ---- Install react-is if missing (recharts dependency) ----
if not exist ".\node_modules\react-is\" (
    echo [SETUP] Installing missing react-is dependency...
    call npm install react-is --save
)

:: ---- Kill any stale processes already on ports 5000 / 3000 ----
echo [CHECK] Clearing ports 5000 and 3000 if already in use...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokStarting ML Server on port 5000...
start "AURA.IOT ML Server" cmd /k "cd /d %~dp0 && .\venv\Scripts\python.exe model_server.py"

:: ---- Wait for Flask to be ready ----
echo [WAIT] Waiting 7 seconds for server initialization...
timeout /t 7 /nobreak

:: ---- Start Node/Vite Server ----
echo [2/2] Starting Dashboard on port 3000...
start "AURA.IOT Dashboard" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ==========================================
echo ✓ Servers starting!
echo ==========================================
echo.
echo ML Server:  http://localhost:5000
echo Dashboard:  http://localhost:3000
echo ==========================================
echo.
echo ML Server:  http://localhost:5000
echo Dashboard:  http://localhost:3000
echo.
echo Press any key in either window to stop the servers.
echo.
pause

echo.
echo ==========================================
echo    SUCCESS: Both services are launching!
echo ==========================================
echo  - ML Analytics: http://localhost:5000/health
echo  - Web Dashboard: http://localhost:3000
echo ==========================================
echo.
echo The Node server has a built-in retry loop, so it will
echo wait for the ML backend to be ready automatically.
echo.
echo You can now close this window.
echo ==========================================
