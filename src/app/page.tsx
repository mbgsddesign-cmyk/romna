'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Target, Zap, Bell, BellDot, Brain, Lightbulb, Calendar, Mail, MessageSquare, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface Insight {
  id: string;
  type: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  created_at: string;
}

interface NotificationPreview {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
}

export default function HomePage() {
  const { t, locale } = useTranslation();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [notifications, setNotifications] = useState<NotificationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    // Prefetch on page load
    const prefetchLinks = () => {
      const router = require('next/navigation').useRouter;
      if (typeof window !== 'undefined') {
        fetch('/api/insights/today', { cache: 'force-cache' });
        fetch('/api/notifications/all', { cache: 'force-cache' });
      }
    };
    
    prefetchLinks();
  }, []);

  const fetchData = async () => {
    try {
      const [insightsRes, notificationsRes] = await Promise.allSettled([
        fetch('/api/insights/today', { next: { revalidate: 60 } }).then(r => r.json()),
        fetch('/api/notifications/all?limit=3', { next: { revalidate: 30 } }).then(r => r.json()),
      ]);

      if (insightsRes.status === 'fulfilled' && insightsRes.value.success) {
        setInsights(insightsRes.value.insights?.slice(0, 3) || []);
      }

      if (notificationsRes.status === 'fulfilled' && notificationsRes.value.success) {
        setNotifications(notificationsRes.value.notifications?.slice(0, 3) || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <PageWrapper className="px-5">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.header variants={itemVariants} className="pt-8 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">
                {t('appName')}
              </h1>
              <p className="text-accent text-[14px] mt-0.5 font-medium">
                {t('yourDailyAIAssistant')}
              </p>
            </div>
            <Link href="/notifications">
              <motion.div 
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <div className={cn(
                  "w-12 h-12 rounded-[18px] flex items-center justify-center transition-all glass-card",
                  unreadCount > 0 && "neon-glow"
                )}>
                  {unreadCount > 0 ? (
                    <BellDot className="w-5 h-5 text-accent" />
                  ) : (
                    <Bell className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-accent flex items-center justify-center neon-glow">
                    <span className="text-[11px] font-bold text-background">{unreadCount}</span>
                  </div>
                )}
              </motion.div>
            </Link>
          </div>
        </motion.header>

        <motion.section variants={itemVariants} className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              {t('aiInsights')}
            </h2>
            <Link href="/insights">
              <span className="text-[14px] text-accent font-semibold hover:underline">{t('viewAll')}</span>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-5 animate-pulse">
                  <div className="h-4 bg-muted/30 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-muted/20 rounded w-full" />
                </div>
              ))}
            </div>
          ) : insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} locale={locale} t={t} />
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <Brain className="w-12 h-12 text-accent/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {t('noNewInsightsToday')}
              </p>
            </div>
          )}
        </motion.section>

        <motion.section variants={itemVariants} className="mb-6">
          <h2 className="text-[18px] font-bold mb-4">
            {t('focusProductivity')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <FocusCard
              icon={Target}
              title={t('todaysTasksLabel')}
              value="3"
              color="primary"
              href="/tasks"
            />
            <FocusCard
              icon={Calendar}
              title={t('todaysEventsLabel')}
              value="2"
              color="accent"
              href="/calendar"
            />
            <FocusCard
              icon={TrendingUp}
              title={t('completionRate')}
              value="87%"
              color="success"
              href="/insights"
            />
            <FocusCard
              icon={Zap}
              title={t('activityScore')}
              value="94"
              color="gold"
              href="/insights"
            />
          </div>
        </motion.section>

        {notifications.length > 0 && (
          <motion.section variants={itemVariants} className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold">{t('notifications')}</h2>
              <Link href="/notifications">
                <span className="text-[14px] text-accent font-semibold hover:underline">{t('viewAll')}</span>
              </Link>
            </div>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} locale={locale} />
              ))}
            </div>
          </motion.section>
        )}

        <motion.section variants={itemVariants} className="mb-8">
          <h2 className="text-[18px] font-bold mb-4">{t('quickActions')}</h2>
          <div className="grid grid-cols-3 gap-3">
            <QuickActionCard href="/voice" icon={MessageSquare} label={t('voiceTaskLabel')} />
            <QuickActionCard href="/calendar?action=new" icon={Calendar} label={t('newEventLabel')} />
            <QuickActionCard href="/settings/integrations" icon={Mail} label={t('connectLabel')} />
          </div>
        </motion.section>
      </motion.div>
    </PageWrapper>
  );
}

function InsightCard({ insight, locale, t }: { insight: Insight; locale: string; t: (key: string) => string }) {
  const getIcon = () => {
    switch (insight.category) {
      case 'productivity': return TrendingUp;
      case 'suggestion': return Lightbulb;
      case 'achievement': return CheckCircle2;
      default: return Brain;
    }
  };

  const Icon = getIcon();

  return (
    <Link href="/insights">
      <div className="glass-card-hover glass-card p-5 cursor-pointer">
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0",
            insight.priority === 'high' || insight.priority === 'urgent' 
              ? "bg-accent/20 neon-glow" 
              : "bg-primary/20"
          )}>
            <Icon className={cn(
              "w-6 h-6",
              insight.priority === 'high' || insight.priority === 'urgent' ? "text-accent" : "text-primary"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-[15px] font-semibold text-foreground line-clamp-1">{insight.title}</h3>
              {insight.priority === 'high' && (
                <Badge className="bg-accent/20 text-accent text-[11px] h-5 border-0">
                  {t('high')}
                </Badge>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">{insight.content}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function FocusCard({ 
  icon: Icon, 
  title, 
  value, 
  color, 
  href 
}: { 
  icon: React.ElementType; 
  title: string; 
  value: string; 
  color: 'primary' | 'accent' | 'success' | 'gold';
  href: string;
}) {
  const colorClasses = {
    primary: 'bg-primary/20 text-primary',
    accent: 'bg-accent/20 text-accent neon-glow',
    success: 'bg-green-500/20 text-green-400',
    gold: 'bg-[#F3C96B]/20 text-[#F3C96B]',
  };

  return (
    <Link href={href}>
      <motion.div whileTap={{ scale: 0.97 }}>
        <div className="glass-card-hover glass-card p-5 cursor-pointer">
          <div className={cn("w-12 h-12 rounded-[16px] flex items-center justify-center mb-4", colorClasses[color])}>
            <Icon className="w-6 h-6" />
          </div>
          <p className="text-[13px] text-muted-foreground mb-2">{title}</p>
          <p className="text-[24px] font-bold text-foreground">{value}</p>
        </div>
      </motion.div>
    </Link>
  );
}

function NotificationCard({ notification, locale }: { notification: NotificationPreview; locale: string }) {
  const getPriorityColor = () => {
    switch (notification.priority) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-accent';
      case 'normal': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  const priorityClass = notification.priority === 'urgent' ? 'priority-urgent' : 
                        notification.priority === 'high' ? 'priority-high' : 'priority-normal';

  return (
    <Link href="/notifications">
      <div className={cn(
        "notification-card cursor-pointer transition-all hover:scale-[1.02]",
        priorityClass,
        !notification.is_read && "bg-accent/5"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn("mt-1", getPriorityColor())}>
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[14px] font-semibold text-foreground line-clamp-1 mb-1">{notification.title}</h4>
            <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">{notification.message}</p>
          </div>
          {!notification.is_read && (
            <div className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-2 neon-glow" />
          )}
        </div>
      </div>
    </Link>
  );
}

function QuickActionCard({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link href={href}>
      <motion.div
        whileTap={{ scale: 0.95 }}
        className="glass-card-hover glass-card flex flex-col items-center gap-3 p-5 cursor-pointer"
      >
        <div className="p-3 rounded-[16px] bg-accent/20 neon-glow">
          <Icon className="w-6 h-6 text-accent" />
        </div>
        <span className="text-[12px] font-semibold text-center leading-tight text-foreground">{label}</span>
      </motion.div>
    </Link>
  );
}