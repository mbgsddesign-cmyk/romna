'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Target, Zap, Bell, BellDot, Brain, Lightbulb, Calendar, Mail, MessageSquare, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
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
  }, []);

  const fetchData = async () => {
    try {
      const [insightsRes, notificationsRes] = await Promise.allSettled([
        fetch('/api/insights/today').then(r => r.json()),
        fetch('/api/notifications/all?limit=3').then(r => r.json()),
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
              <h1 className="text-[28px] font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t('appName')}
              </h1>
              <p className="text-muted-foreground text-[14px] mt-0.5">
                {locale === 'ar' ? 'مساعدك الذكي اليومي' : 'Your Daily AI Assistant'}
              </p>
            </div>
            <Link href="/notifications">
              <motion.div 
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <div className={cn(
                  "w-12 h-12 rounded-[16px] flex items-center justify-center transition-colors",
                  unreadCount > 0 ? "bg-accent/10" : "bg-muted"
                )}>
                  {unreadCount > 0 ? (
                    <BellDot className="w-5 h-5 text-accent" />
                  ) : (
                    <Bell className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{unreadCount}</span>
                  </div>
                )}
              </motion.div>
            </Link>
          </div>
        </motion.header>

        <motion.section variants={itemVariants} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-bold">{locale === 'ar' ? 'رؤى ذكية' : 'AI Insights'}</h2>
            <Link href="/insights">
              <span className="text-[13px] text-accent font-medium">{t('viewAll')}</span>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-full" />
                </Card>
              ))}
            </div>
          ) : insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} locale={locale} />
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {locale === 'ar' ? 'لا توجد رؤى جديدة اليوم' : 'No new insights today'}
              </p>
            </Card>
          )}
        </motion.section>

        <motion.section variants={itemVariants} className="mb-6">
          <h2 className="text-[16px] font-bold mb-3">
            {locale === 'ar' ? 'التركيز والإنتاجية' : 'Focus & Productivity'}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <FocusCard
              icon={Target}
              title={locale === 'ar' ? 'مهام اليوم' : "Today's Tasks"}
              value="3"
              color="primary"
              href="/tasks"
            />
            <FocusCard
              icon={Calendar}
              title={locale === 'ar' ? 'أحداث اليوم' : "Today's Events"}
              value="2"
              color="accent"
              href="/calendar"
            />
            <FocusCard
              icon={TrendingUp}
              title={locale === 'ar' ? 'معدل الإنجاز' : 'Completion Rate'}
              value="87%"
              color="success"
              href="/insights"
            />
            <FocusCard
              icon={Zap}
              title={locale === 'ar' ? 'نقاط النشاط' : 'Activity Score'}
              value="94"
              color="gold"
              href="/insights"
            />
          </div>
        </motion.section>

        {notifications.length > 0 && (
          <motion.section variants={itemVariants} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-bold">{locale === 'ar' ? 'الإشعارات' : 'Notifications'}</h2>
              <Link href="/notifications">
                <span className="text-[13px] text-accent font-medium">{t('viewAll')}</span>
              </Link>
            </div>
            <div className="space-y-2">
              {notifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} locale={locale} />
              ))}
            </div>
          </motion.section>
        )}

        <motion.section variants={itemVariants} className="mb-8">
          <h2 className="text-[16px] font-bold mb-3">{t('quickActions')}</h2>
          <div className="grid grid-cols-3 gap-3">
            <QuickActionCard href="/voice" icon={MessageSquare} label={locale === 'ar' ? 'مهمة صوتية' : 'Voice Task'} />
            <QuickActionCard href="/calendar?action=new" icon={Calendar} label={locale === 'ar' ? 'حدث جديد' : 'New Event'} />
            <QuickActionCard href="/settings/integrations" icon={Mail} label={locale === 'ar' ? 'الربط' : 'Connect'} />
          </div>
        </motion.section>
      </motion.div>
    </PageWrapper>
  );
}

function InsightCard({ insight, locale }: { insight: Insight; locale: string }) {
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
      <Card className="p-4 hover:shadow-md transition-all duration-200 border-border/50 hover:border-accent/30">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0",
            insight.priority === 'high' || insight.priority === 'urgent' ? "bg-accent/10" : "bg-primary/10"
          )}>
            <Icon className={cn(
              "w-5 h-5",
              insight.priority === 'high' || insight.priority === 'urgent' ? "text-accent" : "text-primary"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[14px] font-semibold line-clamp-1">{insight.title}</h3>
              {insight.priority === 'high' && (
                <Badge className="bg-accent/10 text-accent text-[10px] h-5">
                  {locale === 'ar' ? 'مهم' : 'High'}
                </Badge>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground line-clamp-2">{insight.content}</p>
          </div>
        </div>
      </Card>
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
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-green-500/10 text-green-600 dark:text-green-500',
    gold: 'bg-[#F3C96B]/15 text-[#C9A550] dark:text-[#F3C96B]',
  };

  return (
    <Link href={href}>
      <motion.div whileTap={{ scale: 0.95 }}>
        <Card className="p-4 hover:shadow-md transition-all duration-200">
          <div className={cn("w-10 h-10 rounded-[14px] flex items-center justify-center mb-3", colorClasses[color])}>
            <Icon className="w-5 h-5" />
          </div>
          <p className="text-[12px] text-muted-foreground mb-1">{title}</p>
          <p className="text-[20px] font-bold">{value}</p>
        </Card>
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

  return (
    <Link href="/notifications">
      <Card className={cn(
        "p-3 hover:shadow-sm transition-all duration-200",
        !notification.is_read && "bg-accent/5 border-accent/20"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5", getPriorityColor())}>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-medium line-clamp-1 mb-0.5">{notification.title}</h4>
            <p className="text-[12px] text-muted-foreground line-clamp-1">{notification.message}</p>
          </div>
          {!notification.is_read && (
            <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />
          )}
        </div>
      </Card>
    </Link>
  );
}

function QuickActionCard({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link href={href}>
      <motion.div
        whileTap={{ scale: 0.95 }}
        className="mobile-card flex flex-col items-center gap-2 p-4 hover:shadow-md transition-all duration-200"
      >
        <div className="p-2.5 rounded-[14px] bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
      </motion.div>
    </Link>
  );
}