# AURA.IOT - Intelligent IoT Telemetry Dashboard

AURA.IOT is an advanced, real-time IoT dashboard that leverages an AI-driven backend to detect system anomalies. The application processes high-frequency sensor data, runs it through an LSTM (Long Short-Term Memory) Autoencoder model, and visualizes the telemetry via a highly responsive, aesthetic frontend.

## 🚀 Features

-   **Real-time Telemetry Processing**: Handles multiple streams of sensor data with minimal latency.
-   **LSTM Autoencoder Anomaly Detection**: Employs an advanced sequence-based machine learning model to evaluate the Mean Squared Error (MSE) against a dynamically calculated threshold.
-   **Immersive 3D Visualizations**: Includes interactive 3D elements for accelerometer data.
-   **Adaptive UI**: A highly polished, dynamic user interface that responds to system states (e.g., entering "hazard" states during anomalies) with fluid micro-animations.
-   **Intelligent Logging**: A live feed tracking nominal operations and anomaly alerts.

## 📡 Supported Sensors & Metrics

The dashboard currently monitors and processes the following telemetry:
-   **🌡️ Temperature (°C)**: High precision temperature monitoring.
-   **💧 Humidity (%)**: Relative humidity levels.
-   **🔆 Luminosity (Lux)**: Environmental light intensity spectrum.
-   **☄️ 3-Axis Accelerometer (m/s²)**: X-Vector, Y-Vector, and Z-Thrust to measure system entropy, lateral forces, and impacts.

## 🛠️ Technology Stack

**Frontend:**
-   React 19
-   Vite
-   Tailwind CSS v4 (Glassmorphism & Modern UI)
-   Motion (Framer Motion) for fluid animations
-   Recharts for dynamic area charts
-   Three.js for 3D accelerometer visualization

**Backend & ML Core:**
-   Node.js with Express for data aggregation and serving
-   Python 3 (Flask) for the microservice hosting the machine learning inference engine
-   TensorFlow / Keras for the LSTM Autoencoder model
-   Scikit-Learn for feature scaling

## 🏗️ Project Architecture

1.  **Frontend Dashboard**: A React Single Page Application (SPA) that polls the Node server for the latest telemetry and visualizes it.
2.  **Node.js Backend (`server.ts`)**: Acts as the data broker. It parses simulated/live IoT data (`authentic_iot_sensor_data.csv`), interfaces with the ML microservice, and caches the results for the frontend.
3.  **ML Microservice (`model_server.py`)**: A Python-based Flask server that loads the pre-trained LSTM Autoencoder (`lstm_autoencoder_iot.h5`). It receives arrays of sensor data, normalizes them, and returns anomaly scores (MSE) and dynamic thresholds.

## 🚦 Getting Started

### Prerequisites

-   **Node.js** (v18 or higher recommended)
-   **Python** (v3.13 or compatible)

### Installation & Execution

We have provided a batch script (`run_aura_iot.bat`) to automate the startup sequence.

1.  Clone the repository:
    ```bash
    git clone https://github.com/karankirtisharma/AURA.IOT.git
    cd shared-aura-iot
    ```

2.  Ensure you have a Python virtual environment set up (the script expects it at `.\venv313\Scripts\python.exe`). You can create and prepare it via:
    ```bash
    python -m venv venv313
    .\venv313\Scripts\activate
    pip install Flask tensorflow scikit-learn pandas numpy
    ```

3.  Install Node dependencies:
    ```bash
    npm install
    ```

4.  Run the application using the launcher script:
    ```bash
    .\run_aura_iot.bat
    ```
    *This script will automatically start the ML backend on port 5000, wait for initialization, and then start the Node.js frontend/API server on port 3000.*

5.  Access the dashboard at: `http://localhost:3000`

## 📊 How Anomaly Detection Works

Instead of relying on simple rule-based bounds (e.g., Temperature > 40°C), AURA.IOT uses an **LSTM Autoencoder**.
1. The model is trained on "normal" operational data sequences.
2. During inference, it attempts to reconstruct the incoming sequence of all 6 features (Temp, Humidity, Lux, Accel X, Y, Z) simultaneously.
3. If the data represents a normal state, the reconstruction error (MSE) is very low.
4. If a novel, anomalous state occurs, the model fails to reconstruct it accurately, resulting in a high MSE.
5. If the MSE exceeds the dynamically calculated `threshold`, the system flags it as an anomaly, triggering visual alerts across the dashboard and logging the event in the Intelligence Core feed.

## 👨‍💻 Authors

Made by **Karan** and **Paramnoor**.
