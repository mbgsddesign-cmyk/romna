'use client';

import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

interface PriorityBadgeProps {
  priority: 'high' | 'medium' | 'low';
  variant?: 'badge' | 'dot';
  className?: string;
}

export function PriorityBadge({ priority, variant = 'badge', className }: PriorityBadgeProps) {
  const { t } = useTranslation();

  if (variant === 'dot') {
    return (
      <div className={cn(
        "w-2.5 h-2.5 rounded-full",
        `priority-dot-${priority}`,
        className
      )} />
    );
  }

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      `priority-${priority}`,
      className
    )}>
      {t(priority)}
    </span>
  );
}
