import { Activity } from 'lucide-react';
import { motion } from 'motion/react';

import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-6 md:px-10 pt-8 pb-4 z-10 gap-4">
      <div className="flex flex-col">
        <h1 className="text-xl md:text-2xl font-bold tracking-tighter uppercase font-display">
          AURA<span className="text-muted-text">.IOT</span>
        </h1>
        <p className="text-[10px] text-muted-text uppercase tracking-widest mt-1 font-bold">IoT Intelligence Core v3.0.0</p>
      </div>
      <ThemeToggle />
    </header>
  );
}
