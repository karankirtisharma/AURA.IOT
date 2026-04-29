import tensorflow as tf
import pickle

try:
    model = tf.keras.models.load_model('lstm_autoencoder_iot.h5')
    print("Model input shape:", model.input_shape)
except Exception as e:
    print("Error loading model:", e)

try:
    with open('model_artifacts.pkl', 'rb') as f:
        artifacts = pickle.load(f)
        print("Artifacts keys:", artifacts.keys() if isinstance(artifacts, dict) else type(artifacts))
except Exception as e:
    print("Error loading artifacts:", e)
