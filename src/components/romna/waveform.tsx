'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WaveformProps {
  isActive?: boolean;
  barCount?: number;
  className?: string;
}

export function Waveform({ isActive = false, barCount = 5, className }: WaveformProps) {
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            "w-1 rounded-full transition-colors duration-300",
            isActive ? "bg-accent" : "bg-muted-foreground/30"
          )}
          animate={isActive ? {
            height: [12, 24 + Math.random() * 16, 12],
          } : { height: 12 }}
          transition={{
            duration: 0.5,
            repeat: isActive ? Infinity : 0,
            delay: i * 0.1,
            ease: "easeInOut",
          }}
          style={{ height: 12 }}
        />
      ))}
    </div>
  );
}
