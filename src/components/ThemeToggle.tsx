import { Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative flex items-center gap-3 px-3 py-1.5 rounded-full border border-card-border bg-card-bg backdrop-blur-md transition-all duration-500 hover:scale-105 active:scale-95 group",
        "shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] dark:shadow-none"
      )}
    >
      {/* Moving Track Backdrop */}
      <motion.div
        className="absolute inset-0.5 bg-brand-text/5 dark:bg-white/10 rounded-full z-0"
        animate={{
          x: theme === 'light' ? 0 : '0%',
        }}
      />

      {/* Sun Icon */}
      <div className={cn(
        "relative z-10 transition-all duration-500",
        theme === 'light' ? "text-slate-900 scale-110" : "text-muted-text opacity-40 scale-90"
      )}>
        <Sun size={14} strokeWidth={2.5} />
      </div>

      {/* Track Separator */}
      <div className="w-[1px] h-3 bg-card-border relative z-10" />

      {/* Moon Icon */}
      <div className={cn(
        "relative z-10 transition-all duration-500",
        theme === 'dark' ? "text-white scale-110" : "text-muted-text opacity-40 scale-90"
      )}>
        <Moon size={14} strokeWidth={2.5} />
      </div>

      {/* Active Indicator Glow */}
      <motion.div
        layoutId="theme-active-dot"
        className={cn(
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
          theme === 'light' ? "bg-black shadow-[0_0_8px_rgba(0,0,0,0.5)]" : "bg-white shadow-[0_0_8px_#ffffff]"
        )}
        animate={{
          x: theme === 'light' ? -18 : 18
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      />
    </button>
  );
}
