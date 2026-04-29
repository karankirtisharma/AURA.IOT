/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Thermometer, Droplets, Filter, Search } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import Header from './components/Header';
import Footer from './components/Footer';
import SensorCard from './components/SensorCard';
import Accel3D from './components/Accel3D';
import LuminosityLamp from './components/LuminosityLamp';
import BackgroundGlow from './components/BackgroundGlow';
import ChartWidget from './components/ChartWidget';
import EventLog from './components/EventLog';

interface SensorReading {
  temp: number;
  humidity: number;
  lux: number;
  accel: { x: number; y: number; z: number };
  time: string;
  anomalyScore: number;
}

interface HistoryPoint {
  time: string;
  value: number;
}

interface Event {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

import { useTheme } from './context/ThemeContext';
import { sensorHistory } from './data/sensorData';

export default function App() {
  const { theme } = useTheme();
  const [dataIndex, setDataIndex] = useState(0);
  // Provide a safe default with anomalyScore so data.anomalyScore is never undefined
  const [data, setData] = useState<SensorReading>({
    ...sensorHistory[0],
    anomalyScore: 0
  });
  const [dataPool, setDataPool] = useState<SensorReading[]>([]);
  const [timeFilter, setTimeFilter] = useState({ start: '', end: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  // Threshold fetched dynamically from the ML server via /api/health
  const [mlThreshold, setMlThreshold] = useState(0.0204);
  // Real measured fetch latency in ms
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const [anomalies, setAnomalies] = useState({
    temp: false,
    humidity: false,
    accel: false,
    system: false
  });

  // Use a ref so fetchData never needs timeFilter as a dependency,
  // preventing the infinite mount→filter-change→re-fetch loop.
  const timeFilterRef = useRef({ start: '', end: '' });
  useEffect(() => { timeFilterRef.current = timeFilter; }, [timeFilter]);

  const [events, setEvents] = useState<Event[]>([
    { id: '1', type: 'info', message: 'Intelligence Core Online: LSTM Autoencoder Active', timestamp: new Date().toLocaleTimeString() }
  ]);

  const [history, setHistory] = useState<{
    temp: HistoryPoint[];
    humi: HistoryPoint[];
    accel: HistoryPoint[];
    lux: HistoryPoint[];
    anom: HistoryPoint[];
  }>({
    temp: Array.from({ length: 20 }, () => ({ time: `--:--`, value: sensorHistory[0].temp })),
    humi: Array.from({ length: 20 }, () => ({ time: `--:--`, value: sensorHistory[0].humidity })),
    accel: Array.from({ length: 20 }, () => ({ time: `--:--`, value: sensorHistory[0].accel.z })),
    lux: Array.from({ length: 20 }, () => ({ time: `--:--`, value: sensorHistory[0].lux })),
    // Initialized to a realistic flat line using the first static sample's accel.z as proxy.
    // Will be immediately re-seeded from real scored data once dataPool loads.
    anom: Array.from({ length: 20 }, () => ({ time: `--:--`, value: 0.009 }))
  });

  const addEvent = (type: 'info' | 'warning' | 'error', message: string) => {
    const newEvent: Event = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 50));
  };

  const fetchData = useCallback(async (isManual: boolean = false) => {
    try {
      const filter = timeFilterRef.current;
      const params = new URLSearchParams();
      if (filter.start) params.append('startTime', filter.start);
      if (filter.end)   params.append('endTime',   filter.end);
      const query = params.toString();

      const t0 = performance.now();
      const response = await fetch(`/api/sensor-data?${query}`);
      const result = await response.json();
      const elapsed = Math.round(performance.now() - t0);

      if (Array.isArray(result) && result.length > 0) {
        setDataPool(result);
        setDataIndex(0);
        setLatencyMs(elapsed);
        if (isManual) {
          setIsApplied(true);
          setTimeout(() => setIsApplied(false), 2000);
        }
      } else if (response.status === 503) {
        if (!isManual) setTimeout(() => fetchData(), 3000);
      }
    } catch (error) {
      console.error('Failed to fetch data pool:', error);
      if (!isManual) setTimeout(() => fetchData(), 3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
    // Fetch real threshold from the ML server (proxied through Node)
    fetch('/api/health')
      .then(r => r.json())
      .then(h => { if (typeof h.threshold === 'number') setMlThreshold(h.threshold); })
      .catch(() => {}); // keep hardcoded fallback on failure
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDataIndex(prev => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Pre-seed all history channels from real data whenever the pool loads or changes.
  // This prevents the misleading ramp from 0 → actual scores that made the anomaly
  // chart look like a surge at startup.
  useEffect(() => {
    if (dataPool.length === 0) return;
    const HIST = 20;
    const seed = dataPool.slice(0, HIST);
    // Pad with the first record if pool has fewer than 20 entries
    const padded: typeof dataPool = seed.length < HIST
      ? [...Array(HIST - seed.length).fill(seed[0]), ...seed]
      : seed;
    setHistory({
      temp:  padded.map(r => ({ time: r.time, value: r.temp })),
      humi:  padded.map(r => ({ time: r.time, value: r.humidity })),
      accel: padded.map(r => ({ time: r.time, value: r.accel.z })),
      lux:   padded.map(r => ({ time: r.time, value: r.lux })),
      anom:  padded.map(r => ({ time: r.time, value: r.anomalyScore ?? 0 })),
    });
  }, [dataPool]);

  // Update current reading from the pool when index or pool changes
  useEffect(() => {
    if (dataPool.length === 0) return;

    const currentSample = dataPool[dataIndex % dataPool.length];
    setData(currentSample);

    // ML-Based Anomaly Detection — use dynamic threshold fetched from /api/health
    const isSystemAnomaly = currentSample.anomalyScore > mlThreshold;

    if (isSystemAnomaly && !anomalies.system) {
      addEvent('error', `ML Alert: Sequence anomaly detected (MSE: ${currentSample.anomalyScore.toFixed(4)}, threshold: ${mlThreshold.toFixed(4)})`);
    }

    // Per-sensor rule-based alerts derived from the actual dataset ranges:
    // - temp:     Dataset anomalies begin consistently above 35 °C
    // - humidity: Anomalous range seen below 34% or above 45% in data
    // - accel:    Z-axis stays ≈9.8 g (gravity) throughout; real anomalies are
    //             X or Y lateral spikes above ±1.5 g (see CSV anomaly rows)
    const accelMagnitudeXY = Math.sqrt(
      currentSample.accel.x ** 2 + currentSample.accel.y ** 2
    );
    setAnomalies(prev => ({
      ...prev,
      system:   isSystemAnomaly,
      temp:     currentSample.temp > 35,
      humidity: currentSample.humidity > 45 || currentSample.humidity < 34,
      accel:    accelMagnitudeXY > 1.5   // lateral g-force deviation from level
    }));

    setHistory(prev => ({
      temp: [...prev.temp.slice(1), { time: currentSample.time, value: currentSample.temp }],
      humi: [...prev.humi.slice(1), { time: currentSample.time, value: currentSample.humidity }],
      accel: [...prev.accel.slice(1), { time: currentSample.time, value: currentSample.accel.z }],
      lux: [...prev.lux.slice(1), { time: currentSample.time, value: currentSample.lux }],
      anom: [...prev.anom.slice(1), { time: currentSample.time, value: currentSample.anomalyScore }]
    }));
  }, [dataIndex, dataPool]);

  const anyAnomaly = Object.values(anomalies).some(Boolean);

  const resolveAnomaly = (sensor: keyof typeof anomalies) => {
    setAnomalies(prev => ({ ...prev, [sensor]: false }));
    const name = String(sensor);
    addEvent('info', `${name.charAt(0).toUpperCase() + name.slice(1)} anomaly resolved manually.`);
  };

  return (
    <div className="min-h-screen flex flex-col relative z-10 selection:bg-slate-300 dark:selection:bg-slate-700 overflow-hidden">
      <BackgroundGlow isAnomaly={anyAnomaly} />
      <Header />

      <div className="mx-auto w-full max-w-7xl px-4 md:px-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center gap-6 p-5 glass-card-distinct backdrop-blur-xl rounded-[28px] border border-slate-200/60 dark:border-white/20 shadow-xl"
        >
          {/* Header/Label Section */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 bg-blue-500/15 rounded-xl">
              <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 leading-none mb-1">Analytical Tools</p>
              <h3 className="text-sm font-black text-slate-800 dark:text-white tracking-tight">Time Frame Filter</h3>
            </div>
          </div>
          
          {/* Inputs Section */}
          <div className="flex flex-1 flex-wrap gap-3 w-full md:w-auto">
            <div className="relative flex-1 min-w-[140px]">
              <input 
                type="text" 
                placeholder="Start (14:48:30)" 
                value={timeFilter.start}
                onChange={(e) => setTimeFilter(f => ({ ...f, start: e.target.value }))}
                className={cn(
                  "w-full rounded-xl px-4 py-2.5 text-xs font-mono font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40",
                  theme === 'light' 
                    ? "bg-slate-200/60 border border-slate-300 text-slate-900 placeholder:text-slate-500 caret-blue-600" 
                    : "bg-white/5 border border-white/10 text-white placeholder:text-slate-500 caret-white"
                )}
              />
            </div>
            <div className="relative flex-1 min-w-[140px]">
              <input 
                type="text" 
                placeholder="End (14:52:44)" 
                value={timeFilter.end}
                onChange={(e) => setTimeFilter(f => ({ ...f, end: e.target.value }))}
                className={cn(
                  "w-full rounded-xl px-4 py-2.5 text-xs font-mono font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40",
                  theme === 'light' 
                    ? "bg-slate-200/60 border border-slate-300 text-slate-900 placeholder:text-slate-500 caret-blue-600" 
                    : "bg-white/5 border border-white/10 text-white placeholder:text-slate-500 caret-white"
                )}
              />
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fetchData(true)}
              className={cn(
                "text-white text-[11px] font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg",
                isApplied 
                  ? "bg-emerald-500 shadow-emerald-500/20" 
                  : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"
              )}
            >
              <Search className="w-3.5 h-3.5" />
              Apply Filter
            </motion.button>
          </div>

          {/* Engine Status HUD */}
          <div className="flex-col items-end gap-1.5 shrink-0 ml-auto border-l border-slate-200 dark:border-white/10 pl-6 hidden lg:flex">
             <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">Aura Intelligence Core</span>
             </div>
             <div className="text-[11px] text-slate-900 dark:text-slate-300 font-mono font-bold flex flex-col items-end leading-tight">
               <div>v3.0.0 <span className="text-slate-400 mx-1">|</span> LSTM Autoencoder Active</div>
               <div className="text-[9px] text-slate-400 font-normal">Threshold: {mlThreshold.toFixed(4)} (MSE)</div>
             </div>
          </div>
        </motion.div>
      </div>

      <main className="bento-grid grow mx-auto w-full max-w-7xl z-10 px-4 md:px-6">
        <AnimatePresence mode="popLayout">
          {/* First Cluster: Primary Environmental Metrics */}
          <motion.div key="temp-container" layout className="col-span-1">
            <SensorCard 
              title="Temperature" 
              value={data.temp} 
              unit="°C" 
              icon={<Thermometer className="w-5 h-5" />} 
              accentColor="temp"
              isAnomaly={anomalies.temp}
              onResolve={() => resolveAnomaly('temp')}
            />
          </motion.div>
          
          <motion.div key="humi-container" layout className="col-span-1">
            <SensorCard 
              title="Humidity" 
              value={data.humidity} 
              unit="%" 
              icon={<Droplets className="w-5 h-5" />} 
              accentColor="humi"
              isAnomaly={anomalies.humidity}
              onResolve={() => resolveAnomaly('humidity')}
            />
          </motion.div>

          <motion.div 
            key="status-card"
            layout
            viewport={{ once: true }}
            animate={{ 
              boxShadow: theme === 'light' 
                ? (anyAnomaly ? '0 20px 40px -10px rgba(239,68,68,0.2)' : '0 20px 40px -15px rgba(16,185,129,0.1), 0 10px 20px -10px rgba(0,0,0,0.02)')
                : 'none',
              background: theme === 'light'
                ? (anyAnomaly 
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, #fffdfa 100%)' 
                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, #fffdfa 100%)')
                : 'var(--card-bg)'
            }}
            className="col-span-1 glass-card flex flex-col justify-center items-center text-center py-8"
          >
            <div className={cn(
              "text-xs font-bold mb-2 tracking-widest uppercase transition-colors",
              anyAnomaly ? "text-red-500 dark:text-red-400" : "text-emerald-500 dark:text-emerald-400"
            )}>
              {anyAnomaly ? "Anomaly" : "Nominal"}
            </div>
            <div className="text-[clamp(1.5rem,4vw,2.5rem)] font-bold font-mono tracking-tighter tabular-nums text-brand-text">
              {latencyMs !== null ? `${latencyMs}ms` : '---'}
            </div>
            <div className="label-aesthetic mt-2 text-[10px]">API Fetch Latency</div>
          </motion.div>

          <motion.div key="lux-container" layout className="col-span-1 lg:row-span-2">
            <LuminosityLamp lux={data.lux} />
          </motion.div>

          {/* Large Visualization Section - Vector/Motion Focus */}
          <motion.div 
            key="accel-card"
            layout
            viewport={{ once: true }}
            animate={{ 
              boxShadow: theme === 'light' 
                ? (anomalies.accel ? '0 20px 40px -10px rgba(239,68,68,0.25)' : '0 20px 40px -15px rgba(16,85,247,0.2), 0 10px 20px -10px rgba(0,0,0,0.03)')
                : (anomalies.accel ? '0 0 20px rgba(239,68,68,0.3)' : 'none'),
              background: theme === 'light'
                ? (anomalies.accel 
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, #fffdfa 100%)' 
                  : 'linear-gradient(135deg, rgba(16, 85, 247, 0.03) 0%, #fffdfa 100%)')
                : 'var(--card-bg)'
            }}
            className={cn(
              "col-span-1 md:col-span-2 lg:col-span-3 glass-card overflow-hidden group transition-all duration-500 min-h-[400px]",
              anomalies.accel && "border-red-500/50"
            )}
          >
            {anomalies.accel && (
              <motion.div 
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 bg-red-600/10 mix-blend-overlay z-0 pointer-events-none"
              />
            )}
            <div 
              className="glow-aesthetic" 
              style={{ background: theme === 'light' ? '#a855f7' : '#9d4edd' }} 
            />
            <div className="z-10 flex flex-col h-full">
              <div className="flex justify-between items-start">
                <p className="label-aesthetic">3-Axis Accelerometer</p>
                {anomalies.accel && (
                  <button 
                    onClick={() => resolveAnomaly('accel')}
                    className="bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-red-100 transition-colors z-30"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="grow flex items-center justify-center py-4">
                <Accel3D x={data.accel.x} y={data.accel.y} z={data.accel.z} />
              </div>
              <div className="grid grid-cols-3 gap-4 border-t border-slate-500/10 pt-4 z-10">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-text/50 tracking-wider">X-Vector</span>
                  <span className="text-xl font-display font-bold tabular-nums">{data.accel.x.toFixed(4)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-text/50 tracking-wider">Y-Vector</span>
                  <span className="text-xl font-display font-bold tabular-nums">{data.accel.y.toFixed(4)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-text/50 tracking-wider">Z-Thrust</span>
                  <span className="text-xl font-display font-bold tabular-nums tracking-widest text-brand-text">{data.accel.z.toFixed(4)}</span>
                </div>
              </div>
              {anomalies.accel && (
                <div className="text-[10px] text-red-600 dark:text-red-400 font-mono text-center animate-pulse font-bold uppercase tracking-tighter">
                  IMPACT DETECTED: {data.accel.z.toFixed(2)}g
                </div>
              )}
            </div>
          </motion.div>

          {/* Historical Data Section */}
          <motion.div 
            key="full-history-card"
            layout
            viewport={{ once: true }}
            className="col-span-1 md:col-span-2 lg:col-span-4"
          >
            <ChartWidget 
              title="Historical Telemetry (24h)" 
              data={history.temp} 
              accentColor={anomalies.temp ? 'acc' : 'temp'} 
            />
          </motion.div>

          {/* Secondary Charts - Below main chart, above Event Log */}
          <motion.div 
            key="humi-levels-card"
            layout
            viewport={{ once: true }}
            className="col-span-1 md:col-span-2 lg:col-span-2"
          >
            <ChartWidget 
              title="Humidity Levels" 
              data={history.humi} 
              accentColor={anomalies.humidity ? 'acc' : 'humi'} 
            />
          </motion.div>

          <motion.div 
            key="system-entropy-card"
            layout
            viewport={{ once: true }}
            className="col-span-1 md:col-span-2 lg:col-span-2"
          >
            <ChartWidget 
              title="System Entropy" 
              data={history.accel} 
              accentColor="acc" 
            />
          </motion.div>

          <motion.div 
            key="luminosity-history-card"
            layout
            viewport={{ once: true }}
            className="col-span-1 md:col-span-2 lg:col-span-4"
          >
            <ChartWidget 
              title="Luminosity Spectrum" 
              data={history.lux} 
              accentColor="temp" 
            />
          </motion.div>

          {/* Event Log - Wider and at the very end */}
          <motion.div 
            key="event-log-container" 
            layout 
            animate={{ 
              boxShadow: theme === 'light' ? '0 30px 60px -15px rgba(0,0,0,0.05), 0 10px 20px -10px rgba(0,0,0,0.02)' : 'none',
              background: theme === 'light' ? 'linear-gradient(135deg, rgba(72, 72, 74, 0.02) 0%, white 100%)' : 'var(--card-bg)'
            }}
            className="col-span-1 md:col-span-2 lg:col-span-4"
          >
            <EventLog events={events} anomData={history.anom} threshold={mlThreshold} hasAnomaly={anomalies.system} />
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
