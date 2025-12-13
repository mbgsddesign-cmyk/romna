'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Target, Zap, Bell, BellDot, Brain, Lightbulb, Calendar, Mail, MessageSquare, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { HomeSkeleton } from '@/components/skeletons/home-skeleton';

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

interface AutoGLMSuggestion {
  id: string;
  suggestion_type: string;
  payload: any;
  explanation: string;
  confidence: number;
  priority: string;
}

interface TimelineBlock {
  time: string;
  duration: number;
  task_ids: string[];
  type: 'focus' | 'event' | 'break';
  reason: string;
}

export default function HomePage() {
  const { t, locale } = useTranslation();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [notifications, setNotifications] = useState<NotificationPreview[]>([]);
  const [suggestions, setSuggestions] = useState<AutoGLMSuggestion[]>([]);
  const [todayPlan, setTodayPlan] = useState<TimelineBlock[]>([]);
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
      // Get user from Supabase auth
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const [insightsRes, notificationsRes, suggestionsRes, planRes] = await Promise.allSettled([
        fetch('/api/insights/today', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/notifications/all?limit=3', { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/autoglm/suggestions?userId=${user.id}`, { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/autoglm/run?userId=${user.id}`, { cache: 'no-store' }).then(r => r.json()),
      ]);

      if (insightsRes.status === 'fulfilled' && insightsRes.value.success) {
        setInsights(insightsRes.value.insights?.slice(0, 3) || []);
      }

      if (notificationsRes.status === 'fulfilled' && notificationsRes.value.success) {
        setNotifications(notificationsRes.value.notifications?.slice(0, 3) || []);
      }

      if (suggestionsRes.status === 'fulfilled' && suggestionsRes.value.success) {
        setSuggestions(suggestionsRes.value.suggestions?.slice(0, 3) || []);
      }

      if (planRes.status === 'fulfilled' && planRes.value.success && planRes.value.run) {
        const planData = JSON.parse(planRes.value.run.context_snapshot?.daily_plan || '{}');
        setTodayPlan(planData.timeline_blocks || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionAction = async (suggestionId: string, action: 'accept' | 'reject') => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const response = await fetch('/api/autoglm/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestion_id: suggestionId,
          action,
          user_id: user.id,
        }),
      });

      if (response.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      }
    } catch (error) {
      console.error('Failed to handle suggestion:', error);
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
            <HomeSkeleton />
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

        {/* Today's Plan from AutoGLM */}
        <motion.section variants={itemVariants} className="mb-6">
          <h2 className="text-[18px] font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            {locale === 'ar' ? 'خطة اليوم' : "Today's Plan"}
          </h2>
          {todayPlan.length > 0 ? (
            <div className="space-y-3">
              {todayPlan.map((block, idx) => (
                <div key={idx} className="glass-card p-4 hover:bg-muted/5 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-[16px] bg-gradient-to-br from-accent/20 to-accent/5 flex flex-col items-center justify-center neon-glow shrink-0">
                      <span className="text-[20px] font-bold text-accent">{block.time}</span>
                      <span className="text-[10px] text-accent/70 font-medium">{block.duration}m</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn(
                          "text-[10px] h-5 border-0",
                          block.type === 'focus' && "bg-purple-500/20 text-purple-400",
                          block.type === 'event' && "bg-blue-500/20 text-blue-400",
                          block.type === 'break' && "bg-green-500/20 text-green-400"
                        )}>
                          {block.type}
                        </Badge>
                      </div>
                      <p className="text-[15px] font-semibold text-foreground leading-tight mb-2">
                        {block.reason}
                      </p>
                      {block.task_ids && block.task_ids.length > 0 && (
                        <p className="text-[12px] text-muted-foreground">
                          {block.task_ids.length} {locale === 'ar' ? 'مهمة' : 'task(s)'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <Clock className="w-12 h-12 text-accent/30 mx-auto mb-3" />
              <p className="text-[14px] text-muted-foreground mb-4">
                {locale === 'ar' 
                  ? 'لا توجد خطة لليوم بعد'
                  : 'No plan generated yet'}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {locale === 'ar'
                  ? 'قم بتشغيل AutoGLM في الإعدادات للحصول على خطط يومية ذكية'
                  : 'Enable AutoGLM in Settings to get smart daily plans'}
              </p>
            </div>
          )}
        </motion.section>

        {suggestions.length > 0 && (
          <motion.section variants={itemVariants} className="mb-6">
            <h2 className="text-[18px] font-bold mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-accent" />
              AI Suggestions
            </h2>
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="glass-card p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-[14px] bg-accent/20 flex items-center justify-center shrink-0 neon-glow">
                      <Sparkles className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-foreground mb-2">
                        {suggestion.explanation}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-accent/20 text-accent text-[11px] h-5 border-0">
                          {Math.round(suggestion.confidence * 100)}% confident
                        </Badge>
                        <Badge className="bg-primary/20 text-primary text-[11px] h-5 border-0">
                          {suggestion.suggestion_type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSuggestionAction(suggestion.id, 'accept')}
                      className="flex-1 px-4 py-2 rounded-[12px] bg-accent/20 hover:bg-accent/30 text-accent font-semibold text-[14px] transition-all neon-glow"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleSuggestionAction(suggestion.id, 'reject')}
                      className="flex-1 px-4 py-2 rounded-[12px] bg-muted/20 hover:bg-muted/30 text-muted-foreground font-semibold text-[14px] transition-all"
                    >
                      × Ignore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

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