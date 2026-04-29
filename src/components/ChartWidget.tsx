import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from 'recharts';
import { motion } from 'motion/react';
import { useTheme } from '../context/ThemeContext';

interface ChartData {
  time: string;
  value: number;
}

interface ChartWidgetProps {
  data: ChartData[];
  accentColor: 'temp' | 'humi' | 'acc';
  title: string;
}

export default function ChartWidget({ data, accentColor, title }: ChartWidgetProps) {
  const { theme } = useTheme();
  const colors = {
    temp: theme === 'light' ? '#f59e0b' : '#ff006e', 
    humi: theme === 'light' ? '#3b82f6' : '#00f5ff',
    acc: theme === 'light' ? '#a855f7' : '#9d4edd'
  };

  const getShadow = () => {
    if (theme === 'dark') return 'none';
    const s = colors[accentColor];
    return `0 20px 40px -15px ${s}40, 0 10px 20px -10px rgba(0,0,0,0.03)`;
  };

  const gradientId = `gradient-${accentColor}`;
  const currentColor = colors[accentColor];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        boxShadow: getShadow(),
        background: theme === 'light'
          ? `linear-gradient(135deg, ${currentColor}08 0%, #fffdfa 100%)`
          : 'var(--card-bg)'
      }}
      className="glass-card p-6 h-full flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="label-aesthetic text-[11px]">{title}</h3>
        <div className="px-2 py-1 glass-card border-card-border bg-card-bg/20 backdrop-blur-sm">
          <span className="text-[10px] font-mono text-muted-text uppercase font-bold tracking-wider">
            {title.includes('Temperature') ? 'Temp ·°C'
             : title.includes('Humidity')    ? 'Relative %'
             : title.includes('Entropy')     ? 'Accel Z m/s²'
             : title.includes('Luminosity')  ? 'Lux'
             : 'Signal'}
          </span>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={currentColor} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={currentColor} stopOpacity={0}/>
              </linearGradient>
              <filter id={`glow-${accentColor}`}>
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <XAxis 
              dataKey="time" 
              hide={true}
            />
            <YAxis 
              hide={true} 
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="glass-card border-card-border p-2 bg-card-bg backdrop-blur-md shadow-lg">
                      <p className="text-[10px] font-mono text-muted-text mb-1 font-bold">{payload[0].payload.time}</p>
                      <p className="text-sm font-display font-bold text-brand-text">
                        {(Number(payload[0].value)).toFixed(2)} <span className="text-[10px] text-muted-text font-bold">
                          {title.includes('Temperature') ? '°C' : 
                           title.includes('Humidity') ? '%' : 
                           title.includes('Luminosity') ? 'lx' : 'm/s²'}
                        </span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={currentColor}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              filter={`url(#glow-${accentColor})`}
              animationDuration={1500}
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
