'use client';

import { motion } from 'framer-motion';
import { Lock, Sparkles, TrendingUp, TrendingDown, Coffee, Play, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FocusLockScreenProps {
  isActive: boolean;
  mode: 'deep_work' | 'light_focus' | 'break';
  endTime?: string;
  insight?: {
    type: 'energy_dip' | 'productivity_peak' | 'break_needed';
    message: string;
  };
  onScheduleFocus?: () => void;
  onPlayMusic?: () => void;
  isPro?: boolean;
}

export function FocusLockScreen({
  isActive,
  mode,
  endTime,
  insight,
  onScheduleFocus,
  onPlayMusic,
  isPro = false
}: FocusLockScreenProps) {
  const modeConfig = {
    deep_work: {
      title: 'Pro Focus Active',
      subtitle: 'Deep Work in progress',
      color: 'from-accent/20 to-primary/20',
      icon: Lock,
      iconColor: 'text-accent'
    },
    light_focus: {
      title: 'Light Focus Active',
      subtitle: 'Focused work session',
      color: 'from-primary/20 to-teal/20',
      icon: Sparkles,
      iconColor: 'text-primary'
    },
    break: {
      title: 'Break Time',
      subtitle: 'Recharge your energy',
      color: 'from-gold/20 to-accent/20',
      icon: Coffee,
      iconColor: 'text-gold'
    }
  };

  const config = modeConfig[mode];
  const Icon = config.icon;

  const insightConfig = insight ? {
    energy_dip: {
      icon: TrendingDown,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    productivity_peak: {
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    break_needed: {
      icon: Coffee,
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    }
  }[insight.type] : null;

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 backdrop-blur-3xl bg-background/95 flex items-center justify-center p-5"
    >
      <div className="mobile-container w-full">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "w-20 h-20 mx-auto mb-6 rounded-[28px] flex items-center justify-center",
              "bg-gradient-to-br shadow-2xl",
              config.color
            )}
          >
            <Icon className={cn("w-10 h-10", config.iconColor)} />
          </motion.div>

          <h1 className="text-[32px] font-extrabold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {config.title}
          </h1>
          <p className="text-muted-foreground text-[16px] mb-1">
            {config.subtitle}
          </p>
          {endTime && (
            <Badge variant="secondary" className="mt-2 px-4 py-1.5 text-[14px]">
              Until {endTime}
            </Badge>
          )}
          {isPro && (
            <Badge variant="outline" className="mt-2 ml-2 border-accent/30 text-accent">
              PRO
            </Badge>
          )}
        </motion.div>

        {insight && insightConfig && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <Card className={cn("p-5 border-none", insightConfig.bgColor)}>
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0",
                  insightConfig.bgColor
                )}>
                  <insightConfig.icon className={cn("w-6 h-6", insightConfig.color)} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold mb-1">
                    {insight.type === 'energy_dip' && 'Energy Dip Detected'}
                    {insight.type === 'productivity_peak' && 'Productivity Peak'}
                    {insight.type === 'break_needed' && 'Break Recommended'}
                  </h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {insight.message}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          {onPlayMusic && (
            <Button
              size="lg"
              variant="default"
              className="w-full h-14 text-[16px] font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
              onClick={onPlayMusic}
            >
              <Play className="w-5 h-5 mr-2" />
              Play Focus Mix
            </Button>
          )}

          {onScheduleFocus && (
            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 text-[16px] font-semibold border-2"
              onClick={onScheduleFocus}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Schedule Focus
            </Button>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-[12px] text-muted-foreground">
            Non-urgent notifications are being held
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
