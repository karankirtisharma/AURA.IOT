import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Clock, Activity, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useTheme } from '../context/ThemeContext';

interface Event {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

interface HistoryPoint {
  time: string;
  value: number;
}

interface EventLogProps {
  events: Event[];
  anomData: HistoryPoint[];
  threshold?: number;
  hasAnomaly?: boolean;
}

export default function EventLog({ events, anomData, threshold = 0.0204, hasAnomaly = false }: EventLogProps) {
  const { theme } = useTheme();

  // Compute where the threshold sits relative to the visible data range.
  // This lets us paint the gradient red only above the threshold line.
  const dataMax = Math.max(...anomData.map(d => d.value), threshold * 1.1);
  const dataMin = 0;
  const range = dataMax - dataMin;
  // thresholdFraction = how far from the BOTTOM the threshold is (0=bottom, 1=top)
  const thresholdFraction = range > 0 ? (threshold - dataMin) / range : 0.5;
  // In SVG gradient, y=0 is TOP and y=1 is BOTTOM, so invert:
  const thresholdPct = `${Math.round((1 - thresholdFraction) * 100)}%`;
  return (
    <div className="glass-card flex flex-col min-h-[400px] lg:h-[450px] overflow-hidden p-0!">
      <div className="flex flex-col md:flex-row h-full">
        {/* Left Side: Logs */}
        <div className="w-full md:w-[35%] lg:w-[30%] p-6 border-b md:border-b-0 md:border-r border-card-border overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <p className="label-aesthetic flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Intelligence Log
            </p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-[9px] text-muted-text font-bold uppercase tracking-widest">Live Feed</span>
            </div>
          </div>
          
          <div className="grow overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            <AnimatePresence initial={false} mode="popLayout">
              {events.map((event) => (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "p-3.5 rounded-xl border flex gap-3 items-start relative transition-all duration-300",
                    event.type === 'error' 
                      ? "bg-rose-50/80 dark:bg-red-500/10 border-rose-200 dark:border-red-500/20" 
                      : "bg-slate-50/50 dark:bg-white/5 border-slate-100 dark:border-white/5"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg shrink-0 mt-0.5",
                    event.type === 'error' ? "bg-rose-100 dark:bg-rose-500/20" : "bg-slate-100 dark:bg-white/10"
                  )}>
                    <AlertCircle className={cn(
                      "w-3.5 h-3.5",
                      event.type === 'error' ? "text-rose-500" : "text-slate-500 dark:text-slate-400"
                    )} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      "text-[11px] leading-snug font-bold",
                      event.type === 'error' 
                        ? "text-rose-800 dark:text-rose-300" 
                        : "text-slate-700 dark:text-slate-200"
                    )}>
                      {event.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                       <p className="text-[9px] text-slate-400 dark:text-slate-600 font-mono font-bold">
                        {event.timestamp}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Side: Anomaly Graph */}
        <div className="flex-1 p-6 flex flex-col bg-slate-50/20 dark:bg-black/10">
          <div className="flex items-center justify-between mb-8 shrink-0">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-purple-500/10 rounded-xl">
                 <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
               </div>
               <div>
                  <p className="label-aesthetic text-[9px] mb-0.5">LSTM Autoencoder</p>
                  <h4 
                    className="text-xs font-black uppercase tracking-tight"
                    style={{ color: theme === 'light' ? '#000000' : '#FFFFFF' }}
                  >
                    Real-Time Anomaly Score History (MSE)
                  </h4>
               </div>
            </div>
            
            <div className="px-3 py-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg shadow-sm">
               <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">THRESHOLD: <span className="text-rose-500 font-black">{threshold.toFixed(4)}</span></span>
            </div>
          </div>

          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={anomData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAnom" x1="0" y1="0" x2="0" y2="1">
                    {/* Always render 4 stops — only colors change. Never conditionally
                        add/remove stops or React will unmount the gradient element,
                        breaking the SVG fill reference and making the chart vanish. */}
                    <stop offset="0%"
                      stopColor={hasAnomaly ? '#f43f5e' : '#6366f1'}
                      stopOpacity={hasAnomaly ? 0.55 : 0.45}
                    />
                    <stop offset={thresholdPct}
                      stopColor={hasAnomaly ? '#f43f5e' : '#8b5cf6'}
                      stopOpacity={hasAnomaly ? 0.30 : 0.25}
                    />
                    <stop offset={thresholdPct}
                      stopColor={hasAnomaly ? '#8b5cf6' : '#8b5cf6'}
                      stopOpacity={hasAnomaly ? 0.35 : 0.10}
                    />
                    <stop offset="100%"
                      stopColor="#6366f1"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10 dark:opacity-5" />
                <ReferenceLine 
                  y={threshold} 
                  stroke={hasAnomaly ? '#f43f5e' : '#8b5cf6'}
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                  label={{ position: 'right', value: hasAnomaly ? 'HAZARD' : 'LIMIT', fill: hasAnomaly ? '#f43f5e' : '#8b5cf6', fontSize: 8, fontWeight: 'bold' }} 
                />
                <XAxis 
                  dataKey="time" 
                  hide 
                />
                <YAxis 
                  domain={[0, 'auto']} 
                  tick={{ fontSize: 10, fill: 'currentColor' }} 
                  className="opacity-50"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const score = payload[0].value as number;
                      return (
                        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-white/10 p-3 rounded-xl shadow-2xl">
                          <p className="text-[10px] font-black text-slate-500 uppercase mb-1">{payload[0].payload.time}</p>
                          <div className="flex items-center gap-2">
                             <div className={cn("w-2 h-2 rounded-full", score > 0.0204 ? "bg-red-500" : "bg-purple-500")} />
                             <p className="text-sm font-black text-slate-900 dark:text-white">
                                {score.toFixed(6)} <span className="text-[10px] text-slate-400 font-normal">MSE</span>
                             </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={hasAnomaly ? '#f43f5e' : '#8b5cf6'}
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorAnom)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest border-t border-slate-200/50 dark:border-white/5 pt-4">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                   <div className="w-2 h-0.5 bg-purple-500" />
                   Anomaly Score (MSE)
                </div>
                <div className="flex items-center gap-1.5 opacity-50">
                   <Zap className="w-3 h-3" />
                   12ms Inference
                </div>
             </div>
             <div>AURA.OS Intelligence Core v3.0</div>
          </div>
        </div>
      </div>
    </div>
  );
}
