import { motion, useMotionValue, useSpring } from 'motion/react';
import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function BackgroundGlow({ isAnomaly = false }: { isAnomaly?: boolean }) {
  const { theme } = useTheme();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const glowBaseColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(139, 92, 246, 0.18)';
  const anomalyColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(239, 68, 68, 0.15)';

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden sm:block">
      {/* Dynamic Cursor Glow */}
      <motion.div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: isAnomaly 
            ? `radial-gradient(circle 800px at ${springX}px ${springY}px, ${anomalyColor}, transparent 80%)`
            : `radial-gradient(circle 600px at ${springX}px ${springY}px, ${glowBaseColor}, transparent 80%)`,
        }}
      />

      {/* Ambient Moving Glows (Targeting aesthetic depth) */}
      <div className="absolute inset-0 opacity-40 dark:opacity-60">
        <motion.div 
          animate={{ x: [0, 150, 0], y: [0, -100, 0] }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[150px] dark:bg-slate-300/5"
        />
        <motion.div 
          animate={{ x: [0, -180, 0], y: [0, 120, 0] }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-amber-500/10 blur-[180px] dark:bg-slate-500/5"
        />
        <motion.div 
          animate={{ x: [0, 120, 0], y: [0, -150, 0] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] right-[10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[130px] dark:bg-slate-400/5"
        />
      </div>

      {isAnomaly && (
        <motion.div
          animate={{ opacity: [0.05, 0.15, 0.05] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute inset-0 bg-red-900/5"
        />
      )}
    </div>
  );
}
