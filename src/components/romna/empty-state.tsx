'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  icon?: LucideIcon;
  className?: string;
}

export function EmptyState({ message, icon: Icon, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-8 px-4 rounded-[var(--radius-card)] bg-muted/30 border border-dashed border-border",
      className
    )}>
      {Icon && <Icon className="w-8 h-8 text-muted-foreground/50 mb-2" />}
      <p className="text-sm text-muted-foreground text-center">{message}</p>
    </div>
  );
}
