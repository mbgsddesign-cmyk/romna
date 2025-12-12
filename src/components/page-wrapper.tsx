'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  noBottomNav?: boolean;
}

export function PageWrapper({ children, className, noPadding = false, noBottomNav = false }: PageWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        'min-h-screen mobile-scroll',
        !noPadding && 'pt-safe',
        !noBottomNav && 'pb-24',
        className
      )}
    >
      {children}
    </motion.div>
  );
}