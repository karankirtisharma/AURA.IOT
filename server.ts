import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  let sensorDataCache: any[] = [];
  let isModelReady = false;
  let mlThreshold = 0.0204; // updated from ML server after scoring
  const PYTHON_ML_URL = (process.env.PYTHON_ML_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

  // ---------------------------------------------------------------------------
  // Parse CSV and batch-send to Python ML server for scoring
  // ---------------------------------------------------------------------------
  const loadAndPredictData = async (): Promise<void> => {
    try {
      console.log('Loading CSV dataset...');
      const csvPath = path.join(process.cwd(), 'authentic_iot_sensor_data.csv');
      const csvData = fs.readFileSync(csvPath, 'utf8');
      const lines = csvData.trim().split('\n');
      lines.shift(); // remove header

      const parsedData = lines.map(line => {
        const parts = line.split(',');
        const timestamp = parts[0];
        const time = timestamp.includes(' ') ? timestamp.split(' ')[1] : timestamp;
        return {
          timestamp,
          time,
          temp:     parseFloat(parts[1]),
          humidity: parseFloat(parts[2]),
          lux:      parseFloat(parts[3]),
          accel: {
            x: parseFloat(parts[4]),
            y: parseFloat(parts[5]),
            z: parseFloat(parts[6])
          },
          anomaly_type: parts[7]?.trim() ?? 'normal'
        };
      });

      console.log(`Parsed ${parsedData.length} records. Sending to LSTM Autoencoder...`);

      // Feature order must match what the scaler was trained on:
      // [temp, humidity, lux, accel.x, accel.y, accel.z]
      const features = parsedData.map(r => [
        r.temp, r.humidity, r.lux, r.accel.x, r.accel.y, r.accel.z
      ]);

      // Retry loop — model server may still be initialising when Node starts
      let mlResponse: Response | null = null;
      const MAX_RETRIES = 10;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          mlResponse = await fetch(`${PYTHON_ML_URL}/predict`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ features })
          });
          if (mlResponse.ok) break;
          console.warn(`[ML] Attempt ${attempt}/${MAX_RETRIES} to ${PYTHON_ML_URL}: server returned ${mlResponse.status}`);
        } catch (err) {
          console.warn(`[ML] Attempt ${attempt}/${MAX_RETRIES} to ${PYTHON_ML_URL}: connection failed — retrying in 3s...`);
        }
        await new Promise(r => setTimeout(r, 3000));
      }

      if (!mlResponse || !mlResponse.ok) {
        throw new Error(`Could not reach ML server at ${PYTHON_ML_URL} after ${MAX_RETRIES} retries`);
      }

      const modelData: { anomaly_scores: number[]; threshold: number } =
        await mlResponse.json();

      if (!Array.isArray(modelData.anomaly_scores)) {
        throw new Error('ML server response missing anomaly_scores array');
      }

      sensorDataCache = parsedData.map((r, i) => ({
        ...r,
        anomalyScore: modelData.anomaly_scores[i] ?? 0
      }));

      isModelReady = true;
      mlThreshold = modelData.threshold ?? 0.0204;
      const anomalyCount = sensorDataCache.filter(r => r.anomalyScore > mlThreshold).length;
      console.log(
        `[ML] Scored ${sensorDataCache.length} records | ` +
        `threshold=${mlThreshold.toFixed(4)} | anomalies=${anomalyCount}`
      );
    } catch (e) {
      console.error('[ML] Failed to load/score data:', e);
    }
  };

  // ---------------------------------------------------------------------------
  // API Endpoints
  // ---------------------------------------------------------------------------
  app.get('/api/sensor-data', (req, res) => {
    if (!isModelReady) {
      return res.status(503).json({ error: 'Model data still loading — retry shortly.' });
    }

    const { startTime, endTime } = req.query;
    let filtered = sensorDataCache;

    if (startTime && endTime) {
      filtered = sensorDataCache.filter(r =>
        r.time >= (startTime as string) && r.time <= (endTime as string)
      );
    }

    res.json(filtered);
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status:    'ok',
      engine:    'LSTM Autoencoder',
      ready:     isModelReady,
      count:     sensorDataCache.length,
      threshold: mlThreshold    // dynamic from ML server
    });
  });

  // ---------------------------------------------------------------------------
  // Vite middleware
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server:  { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  // ---------------------------------------------------------------------------
  // Start listening first, then kick off ML loading in the background
  // ---------------------------------------------------------------------------
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('[ML] LSTM Autoencoder Engine — loading data in background...');
  });

  // Load + predict after the server is up (non-blocking startup)
  loadAndPredictData();
}

startServer();
