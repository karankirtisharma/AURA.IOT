#!/bin/bash

echo "=========================================="
echo "    AURAIOT: Intelligent IoT Dashboard"
echo "=========================================="
echo ""

cd "$(dirname "$0")" || exit 1

# ---- Check Python venv ----
if [ ! -d "./venv" ]; then
    echo "[SETUP] Creating Python environment..."
    python3 -m venv venv || python -m venv venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create venv."
        exit 1
    fi
    
    echo "[SETUP] Installing Python dependencies..."
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install Flask tensorflow scikit-learn pandas numpy
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install Python dependencies."
        exit 1
    fi
fi

# ---- Check node_modules ----
if [ ! -d "./node_modules" ]; then
    echo "[SETUP] Installing Node dependencies..."
    npm install --legacy-peer-deps
    if [ $? -ne 0 ]; then
        echo "[ERROR] npm install failed."
        exit 1
    fi
fi

# ---- Install react-is if missing ----
if [ ! -d "./node_modules/react-is" ]; then
    echo "[SETUP] Installing react-is..."
    npm install react-is --save
fi

# ---- Kill any stale processes ----
echo "[CHECK] Clearing ports 5000 and 3000..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

# ---- Start ML Model Server ----
echo ""
echo "[1/2] Starting ML Server on port 5000..."
./venv/bin/python model_server.py &
ML_PID=$!
sleep 7

# ---- Start Node/Vite Server ----
echo "[2/2] Starting Dashboard on port 3000..."
npm run dev &
NODE_PID=$!

echo ""
echo "=========================================="
echo "✓ Servers running!"
echo "=========================================="
echo ""
echo "ML Server:  http://localhost:5000"
echo "Dashboard:  http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $ML_PID $NODE_PID
