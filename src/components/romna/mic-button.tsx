'use client';

import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MicButtonProps {
  isRecording?: boolean;
  onClick?: () => void;
  onPressStart?: () => void;
  onPressEnd?: () => void;
  size?: 'default' | 'large' | 'hero';
  className?: string;
}

export function MicButton({ 
  isRecording = false, 
  onClick, 
  onPressStart, 
  onPressEnd,
  size = 'default',
  className 
}: MicButtonProps) {
  const sizeClasses = {
    default: 'w-16 h-16',
    large: 'w-24 h-24',
    hero: 'w-32 h-32',
  };

  const iconSizes = {
    default: 'w-7 h-7',
    large: 'w-10 h-10',
    hero: 'w-12 h-12',
  };

  const glowSizes = {
    default: 'inset-[-10%]',
    large: 'inset-[-15%]',
    hero: 'inset-[-20%]',
  };

  return (
    <motion.button
      onClick={onClick}
      onMouseDown={onPressStart}
      onMouseUp={onPressEnd}
      onTouchStart={onPressStart}
      onTouchEnd={onPressEnd}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'relative rounded-full flex items-center justify-center focus:outline-none',
        sizeClasses[size],
        className
      )}
    >
      <motion.div
        className={cn(
          "absolute rounded-full transition-opacity duration-500",
          glowSizes[size],
          isRecording ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="voice-wave active" />
      </motion.div>
      
      <motion.div
        animate={isRecording ? { 
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.6, 0.3]
        } : { scale: 1, opacity: 0.2 }}
        transition={{ repeat: isRecording ? Infinity : 0, duration: 1.5, ease: 'easeInOut' }}
        className={cn(
          "absolute rounded-full blur-2xl transition-all duration-300",
          glowSizes[size],
          isRecording 
            ? "bg-gradient-to-br from-accent/50 to-primary/50" 
            : "bg-primary/20"
        )}
      />
      
      <motion.div
        animate={isRecording ? { scale: [1, 1.03, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        className={cn(
          "relative rounded-full flex items-center justify-center transition-all duration-300",
          sizeClasses[size],
          isRecording 
            ? "bg-gradient-to-br from-accent to-primary hero-mic-glow recording" 
            : "bg-gradient-to-br from-primary to-accent hero-mic-glow"
        )}
      >
        <motion.div
          animate={isRecording ? { scale: [1, 1.15, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
        >
          <Mic className={cn(
            "text-white transition-transform duration-300",
            iconSizes[size],
            isRecording && "scale-110"
          )} />
        </motion.div>
      </motion.div>

      {isRecording && (
        <>
          <motion.div
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
            className={cn(
              "absolute rounded-full border-2 border-accent",
              sizeClasses[size]
            )}
          />
          <motion.div
            initial={{ scale: 1, opacity: 0.4 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut', delay: 0.3 }}
            className={cn(
              "absolute rounded-full border-2 border-primary",
              sizeClasses[size]
            )}
          />
        </>
      )}
    </motion.button>
  );
}
