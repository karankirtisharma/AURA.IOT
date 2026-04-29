import { AnimatePresence, motion } from 'motion/react';
import { ReactNode, useEffect, useState } from 'react';
import { cn } from '../lib/utils';

import { useTheme } from '../context/ThemeContext';

interface SensorCardProps {
  title: string;
  value: number | string;
  unit: string;
  icon: ReactNode;
  trend?: string;
  className?: string;
  accentColor: 'temp' | 'humi' | 'acc';
  isAnomaly?: boolean;
  onResolve?: () => void;
}

export default function SensorCard({ 
  title, 
  value, 
  unit, 
  icon, 
  trend, 
  className,
  accentColor,
  isAnomaly = false,
  onResolve
}: SensorCardProps) {
  const { theme } = useTheme();
  const [prevValue, setPrevValue] = useState(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (value !== prevValue) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 1000);
      setPrevValue(value);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  const gradients = {
    temp: { 
      color: theme === 'light' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 0, 110, 0.1)', 
      shadow: theme === 'light' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 0, 110, 0.2)' 
    },
    humi: { 
      color: theme === 'light' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0, 245, 255, 0.1)', 
      shadow: theme === 'light' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0, 245, 255, 0.2)' 
    },
    acc: { 
      color: theme === 'light' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(157, 78, 221, 0.1)', 
      shadow: theme === 'light' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(157, 78, 221, 0.2)' 
    }
  };

  const getShadow = () => {
    if (theme === 'dark') return isAnomaly ? '0 0 20px rgba(255, 255, 255, 0.1)' : 'none';
    if (isAnomaly) return '0 15px 35px -5px rgba(22, 22, 24, 0.2), 0 5px 15px -5px rgba(22, 22, 24, 0.1)';
    const s = gradients[accentColor].shadow;
    return `0 25px 50px -12px rgba(0, 0, 0, 0.08), 0 10px 20px -10px ${s}`;
  };

  const glitchAnimation = {
    x: isAnomaly ? [0, -2, 2, -1, 1, 0] : 0,
    y: isAnomaly ? [0, 1, -1, 0.5, -0.5, 0] : 0,
    opacity: isAnomaly ? [1, 0.8, 1, 0.9, 1] : 1,
  };

  return (
    <motion.div
      layout
      viewport={{ once: true }}
      whileHover={{ y: -5, scale: 1.01 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        boxShadow: getShadow()
      }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      className={cn(
        "glass-card group h-full flex flex-col justify-between min-h-[180px]",
        isAnomaly && "border-red-500/50",
        className
      )}
    >
      {/* Pulse effect for anomaly */}
      <AnimatePresence>
        {isAnomaly && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 border-2 border-red-500/50 rounded-[24px] pointer-events-none z-20"
          />
        )}
      </AnimatePresence>

      <div 
        className="glow-aesthetic" 
        style={{ 
          background: accentColor === 'temp' 
            ? (theme === 'light' ? '#f59e0b' : '#ff006e') 
            : accentColor === 'humi' 
              ? (theme === 'light' ? '#3b82f6' : '#00f5ff') 
              : (theme === 'light' ? '#a855f7' : '#9d4edd') 
        }} 
      />

      {isAnomaly && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
          className="absolute inset-0 bg-red-600/20 mix-blend-overlay pointer-events-none"
        />
      )}

      <div className={cn(
        "absolute -top-10 -right-10 w-40 h-40 rounded-full blur-2xl pointer-events-none transition-all duration-1000",
        theme === 'light' ? "opacity-30" : "opacity-25",
        accentColor === 'temp' ? "bg-amber-100/50 dark:bg-rose-400/20" : 
        accentColor === 'humi' ? "bg-blue-100/50 dark:bg-cyan-400/20" : 
        "bg-purple-100/50 dark:bg-purple-400/20"
      )} />

      <div className="z-10 flex justify-between items-start">
        <div className="flex flex-col flex-1">
          <p className="label-aesthetic">{title}</p>
          <div className="flex items-baseline gap-1 mt-2 relative z-10">
            <h2
              className={cn(
                "font-display font-black leading-none block",
                "text-[clamp(1.8rem,7vw,3.5rem)]",
                accentColor === 'temp' 
                  ? (theme === 'light' ? 'text-amber-500' : 'text-rose-500') 
                  : accentColor === 'humi' 
                    ? (theme === 'light' ? 'text-blue-600' : 'text-cyan-400') 
                    : (theme === 'light' ? 'text-purple-600' : 'text-purple-400')
              )}
            >
              {typeof value === 'number' ? value.toFixed(2) : value}<span className="text-[clamp(0.8rem,2vw,1.2rem)] font-bold text-muted-text ml-1">{unit}</span>
            </h2>
            {isAnomaly && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="ml-2 bg-red-600 text-[10px] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter"
              >
                Alert
              </motion.div>
            )}
          </div>
          {/* Subtle underline bar seen in reference image */}
          {theme === 'light' && (
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '40px' }}
              className={cn(
                "h-1.5 rounded-full mt-3",
                accentColor === 'temp' ? 'bg-amber-500' : accentColor === 'humi' ? 'bg-blue-600' : 'bg-purple-600'
              )}
            />
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className={cn(
            "transition-colors duration-500",
            accentColor === 'temp' 
              ? (theme === 'light' ? 'text-amber-500' : 'text-rose-500') 
              : accentColor === 'humi' 
                ? (theme === 'light' ? 'text-blue-600' : 'text-cyan-400') 
                : (theme === 'light' ? 'text-purple-600' : 'text-purple-500')
          )}>{icon}</div>
          <AnimatePresence>
            {isAnomaly && onResolve && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ 
                  scale: [1, 1.2, 0],
                  rotate: [0, 10, -10],
                  filter: ["blur(0px)", "blur(10px)"],
                  opacity: 0,
                  transition: { duration: 0.4 }
                }}
                onClick={onResolve}
                className="bg-black/80 dark:bg-white/10 hover:bg-black border border-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white transition-colors z-30"
              >
                Resolve
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-4 z-10 flex flex-col gap-2">
        {trend && (
          <span className="text-[10px] font-mono text-emerald-500/80 tracking-wider">
            {trend}
          </span>
        )}
        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ 
              // Map value to a meaningful percentage within each sensor's realistic domain:
              // temp: 15–45 °C → 0–100%  | humi: 0–100% (raw) | accel: 0–20 m/s²
              width: typeof value === 'number'
                ? `${Math.min(Math.max(
                    accentColor === 'temp'  ? ((value - 15) / 30) * 100
                  : accentColor === 'humi'  ? value
                  :                          (value / 20) * 100
                  , 0), 100)}%`
                : '50%',
              backgroundColor: isAnomaly ? '#ef4444' : undefined
            }}
            className={cn(
              "h-full transition-colors duration-500",
              !isAnomaly && (accentColor === 'temp' ? 'bg-amber-500' : accentColor === 'humi' ? 'bg-blue-500' : 'bg-purple-500')
            )}
          />
        </div>
      </div>
    </motion.div>
  );
}
