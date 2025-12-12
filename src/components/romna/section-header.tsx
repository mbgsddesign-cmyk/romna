'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  viewAllHref?: string;
  className?: string;
}

export function SectionHeader({ title, viewAllHref, className }: SectionHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      <h2 className="romna-section-title">{title}</h2>
      {viewAllHref && (
        <Link 
          href={viewAllHref} 
          className="text-xs text-accent font-medium flex items-center gap-0.5 hover:text-accent/80 transition-colors"
        >
          {t('viewAll')} 
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </Link>
      )}
    </div>
  );
}
