import os
import pickle
import numpy as np
import tensorflow as tf
from flask import Flask, request, jsonify
from flask import after_this_request

# Suppress verbose TF logs — only errors
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

app = Flask(__name__)

# ---------------------------------------------------------------------------
# CORS — allow the Node dev server on any localhost port to call us
# ---------------------------------------------------------------------------
@app.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

@app.route('/predict', methods=['OPTIONS'])
def predict_preflight():
    return '', 204

# ---------------------------------------------------------------------------
# Load Model
# ---------------------------------------------------------------------------
print("Loading Keras model...")
try:
    model = tf.keras.models.load_model('lstm_autoencoder_iot.h5', compile=False)
    print("Model loaded successfully.")
    print("Expected input shape:", model.input_shape)
    TIME_STEPS = model.input_shape[1]  # 20
    N_FEATURES = model.input_shape[2]  # 6
except Exception as e:
    print(f"Error loading model: {e}")
    model = None
    TIME_STEPS = 20
    N_FEATURES = 6

# ---------------------------------------------------------------------------
# Load Artifacts (Scaler + threshold)
# ---------------------------------------------------------------------------
print("Loading artifacts...")
try:
    with open('model_artifacts.pkl', 'rb') as f:
        artifacts = pickle.load(f)
    print("Artifacts loaded. Keys:", list(artifacts.keys()) if isinstance(artifacts, dict) else "raw scaler")
    if isinstance(artifacts, dict):
        scaler    = artifacts.get('scaler')
        threshold = artifacts.get('threshold', 0.0204)
        features  = artifacts.get('features', [])
    else:
        scaler    = artifacts
        threshold = 0.0204
        features  = []
    print(f"Threshold: {threshold}, Features: {features}")
except Exception as e:
    print(f"Error loading artifacts: {e}")
    scaler    = None
    threshold = 0.0204
    features  = []

# ---------------------------------------------------------------------------
# Helper: build sliding windows from a 2-D scaled array (N, F) → (N, T, F)
# Pads the head so every row gets a window, matching training behaviour.
# ---------------------------------------------------------------------------
def build_windows(scaled: np.ndarray, time_steps: int) -> np.ndarray:
    n = len(scaled)
    windows = np.empty((n, time_steps, scaled.shape[1]), dtype=np.float32)
    for i in range(n):
        if i < time_steps - 1:
            pad = np.repeat(scaled[0:1], time_steps - 1 - i, axis=0)
            windows[i] = np.vstack([pad, scaled[:i + 1]])
        else:
            windows[i] = scaled[i - time_steps + 1 : i + 1]
    return windows


# ---------------------------------------------------------------------------
# Predict endpoint
# ---------------------------------------------------------------------------
@app.route('/predict', methods=['POST'])
def predict():
    if model is None or scaler is None:
        return jsonify({"error": "Model or scaler not loaded"}), 500

    data = request.get_json(force=True, silent=True)
    if not data or 'features' not in data:
        return jsonify({"error": "No features provided"}), 400

    try:
        arr = np.array(data['features'], dtype=np.float64)
        if arr.ndim == 1:
            arr = arr.reshape(1, -1)

        # Scale
        scaled = scaler.transform(arr).astype(np.float32)

        # Build windows: (N, TIME_STEPS, N_FEATURES)
        windows = build_windows(scaled, TIME_STEPS)

        # Batch predict in chunks of 256 to limit peak RAM
        BATCH = 256
        mse_parts = []
        for start in range(0, len(windows), BATCH):
            chunk = windows[start : start + BATCH]
            recon = model.predict(chunk, verbose=0)
            mse_parts.append(
                np.mean(np.power(chunk - recon, 2), axis=(1, 2))
            )

        mse = np.concatenate(mse_parts).tolist()

        # Only return the scores — NOT scaled_input or reconstruction
        # (those were 100 MB+ for 3 000 rows and crashed the browser)
        return jsonify({
            "anomaly_scores": mse,
            "threshold": float(threshold)
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status":        "ok",
        "model_loaded":  model is not None,
        "scaler_loaded": scaler is not None,
        "threshold":     float(threshold),
        "time_steps":    TIME_STEPS,
        "n_features":    N_FEATURES,
    })


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
