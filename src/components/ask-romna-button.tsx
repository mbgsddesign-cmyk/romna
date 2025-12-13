'use client';

import { Sparkles } from 'lucide-react';
import { useRomnaAI } from '@/contexts/romna-ai-context';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function AskRomnaButton() {
  const { openDrawer } = useRomnaAI();

  return (
    <motion.button
      onClick={openDrawer}
      className={cn(
        'fixed bottom-24 right-6 z-40',
        'w-14 h-14 rounded-full',
        'bg-accent hover:bg-accent/90',
        'text-background',
        'shadow-xl shadow-accent/30',
        'flex items-center justify-center',
        'transition-all duration-300',
        'neon-glow-strong'
      )}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Sparkles className="w-6 h-6" strokeWidth={2.5} />
      
      <motion.div
        className="absolute inset-0 rounded-full bg-accent/20 blur-xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.button>
  );
}
