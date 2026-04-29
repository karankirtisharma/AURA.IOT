import { motion } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

interface Accel3DProps {
  x: number;
  y: number;
  z: number;
}

export default function Accel3D({ x, y, z }: Accel3DProps) {
  const { theme } = useTheme();
  // Normalize values for visual scale
  // Direct mapping of sensor axes to 3D rotation
  // We use a factor of 10-15 to make the gravity vector (approx 9.8) feel responsive
  const rotateX = y * 12; // Pitch
  const rotateY = x * 12; // Yaw
  const rotateZ = (z - 9.8) * 15; // Roll/Dynamic lift
  const glowZ = (z / 10) * 30; // Depth of the power core

  return (
    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center perspective-1000 overflow-hidden">
      {/* 3D Cube representation */}
      <motion.div
        animate={{
          rotateX: rotateX,
          rotateY: rotateY,
          rotateZ: rotateZ
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="w-32 h-32 relative"
      >
        {/* Faces of the "cube" */}
        {[
          { rotateY: 0, translateZ: 64 },
          { rotateY: 90, translateZ: 64 },
          { rotateY: 180, translateZ: 64 },
          { rotateY: 270, translateZ: 64 },
          { rotateX: 90, translateZ: 64 },
          { rotateX: -90, translateZ: 64 },
        ].map((face, i) => (
          <div
            key={i}
            className="absolute inset-0 border border-purple-500/40 bg-purple-500/10 backdrop-blur-[4px] flex items-center justify-center overflow-hidden"
            style={{
              transform: `rotateX(${face.rotateX || 0}deg) rotateY(${face.rotateY || 0}deg) translateZ(${face.translateZ}px)`,
              backfaceVisibility: 'visible',
              boxShadow: 'inset 0 0 30px rgba(168,85,247,0.2)'
            }}
          >
             <div className={cn(
               "w-full h-full relative",
               theme === 'light' 
                 ? "bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.2)_0%,transparent_70%)]" 
                 : "bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.2)_0%,transparent_70%)]"
             )}>
                {/* Grid pattern on face */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(168,85,247,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.5)_1px,transparent_1px)] bg-[size:16px_16px]" />
             </div>
          </div>
        ))}

        {/* Floating internal shards */}
        {[0, 120, 240].map((rot, i) => (
            <motion.div
                key={`shard-${i}`}
                animate={{ 
                    rotateY: [rot, rot + 360],
                    rotateX: [rot, rot + 180]
                }}
                transition={{ duration: 10 + i, repeat: Infinity, ease: "linear" }}
                className="absolute inset-8 border border-purple-400/20 rounded-lg pointer-events-none"
                style={{ transformStyle: 'preserve-3d' }}
            />
        ))}

        {/* Inner core glow */}
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1], 
            opacity: theme === 'dark' ? [0.5, 0.8, 0.5] : [0.2, 0.4, 0.2],
            boxShadow: [
                '0 0 20px rgba(168,85,247,0.4)',
                '0 0 60px rgba(168,85,247,0.8)',
                '0 0 20px rgba(168,85,247,0.4)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transform: `translateZ(${glowZ}px)` }}
          className={cn(
            "absolute inset-8 blur-xl rounded-full z-10",
            theme === 'light' ? "bg-[#a855f7]" : "bg-[#9d4edd] dark:bg-[#9d4edd]/90"
          )}
        />
      </motion.div>

      {/* Axis grids */}
      <div className={cn(
        "absolute inset-0 z-0 pointer-events-none transition-opacity duration-500",
        theme === 'dark' ? "opacity-20" : "opacity-40"
      )}>
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-card-border" />
        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-card-border" />
        {/* Decorative depth lines */}
        <div className="absolute top-0 left-0 w-full h-full border border-card-border skew-x-12" />
      </div>

      {/* Labels */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1 z-20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400"></span>
          <span className="text-[10px] font-mono text-muted-text font-bold">X: {x.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
          <span className="text-[10px] font-mono text-muted-text font-bold">Y: {y.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
          <span className="text-[10px] font-mono text-muted-text font-bold">Z: {z.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
