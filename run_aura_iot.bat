@echo off
setlocal enabledelayedexpansion
title Aura IoT Project Launcher

echo ==========================================
echo    AURAIOT: Intelligent IoT Dashboard
echo ==========================================
echo.

:: ---- Check Python venv ----
if not exist ".\venv313\Scripts\python.exe" (
    echo [ERROR] Python environment not found at .\venv313\Scripts\python.exe
    echo Please ensure the venv313 folder exists and is configured correctly.
    echo.
    pause
    exit /b 1
)

:: ---- Check node_modules ----
if not exist ".\node_modules\" (
    echo [SETUP] node_modules not found. Running npm install...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Please run it manually.
        pause
        exit /b 1
    )
)

:: ---- Kill any stale processes already on ports 5000 / 3000 ----
echo [CHECK] Clearing ports 5000 and 3000 if already in use...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)

:: ---- Start ML Model Server ----
echo.
echo [1/2] Launching LSTM Model Server on Port 5000...
start "Aura ML Backend" cmd /k "cd /d %~dp0 && .\venv313\Scripts\python.exe model_server.py"

:: ---- Wait for Flask to be ready (ping-based, no redirection issues) ----
echo [WAIT] Waiting 7 seconds for ML server to initialize...
ping 127.0.0.1 -n 8 > nul

:: ---- Start Node/Vite Server ----
echo [2/2] Launching Frontend Dashboard on Port 3000...
start "Aura IoT App" cmd /k "cd /d %~dp0 && npm run dev"

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
