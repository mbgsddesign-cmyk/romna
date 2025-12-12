'use client';

import { CheckSquare, Calendar, Mail, FileText, MessageCircle, Send, Bell, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import type { IntentType } from '@/lib/store';

interface IntentBadgeProps {
  intent: IntentType;
  className?: string;
}

const intentConfig: Record<IntentType, { icon: React.ElementType; labelKey: string; className: string }> = {
  task: {
    icon: CheckSquare,
    labelKey: 'task',
    className: 'intent-task',
  },
  event: {
    icon: Calendar,
    labelKey: 'event',
    className: 'intent-event',
  },
  email: {
    icon: Mail,
    labelKey: 'email',
    className: 'intent-email',
  },
  note: {
    icon: FileText,
    labelKey: 'note',
    className: 'intent-note',
  },
  whatsapp_message: {
    icon: MessageCircle,
    labelKey: 'whatsappMessage',
    className: 'bg-[#25D366]/10 text-[#25D366]',
  },
  telegram_message: {
    icon: Send,
    labelKey: 'telegramMessage',
    className: 'bg-[#0088cc]/10 text-[#0088cc]',
  },
  reminder: {
    icon: Bell,
    labelKey: 'reminder',
    className: 'bg-amber-500/10 text-amber-600',
  },
  search: {
    icon: Search,
    labelKey: 'search',
    className: 'bg-purple-500/10 text-purple-600',
  },
};

export function IntentBadge({ intent, className }: IntentBadgeProps) {
  const { t } = useTranslation();
  const config = intentConfig[intent] || intentConfig.note;
  const Icon = config.icon;

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
      config.className,
      className
    )}>
      <Icon className="w-4 h-4" />
      <span>{t(config.labelKey as Parameters<typeof t>[0])}</span>
    </div>
  );
}
