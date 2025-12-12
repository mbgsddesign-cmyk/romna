'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bell, Sparkles, Calendar, Clock, CheckCircle2, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type NotificationType = 'all' | 'insights' | 'ai' | 'reminders';

interface MockNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  time: string;
  actions?: { label: string; variant?: 'default' | 'secondary' | 'outline' }[];
  isPro?: boolean;
}

const mockNotifications: MockNotification[] = [
  {
    id: '1',
    type: 'ai',
    title: 'Meeting Conflict Detected',
    message: 'Your 3 PM meeting with team overlaps with focus session',
    priority: 'high',
    category: 'conflict',
    time: '2m ago',
    actions: [
      { label: 'Optimize Schedule', variant: 'default' },
      { label: 'Dismiss', variant: 'outline' }
    ]
  },
  {
    id: '2',
    type: 'reminders',
    title: 'Grocery Shopping',
    message: 'Pick up groceries on the way home',
    priority: 'normal',
    category: 'task',
    time: '1h ago',
    actions: [
      { label: 'Mark Done', variant: 'default' },
      { label: 'Snooze', variant: 'outline' }
    ]
  },
  {
    id: '3',
    type: 'insights',
    title: 'Pro Insight Available',
    message: 'Your productivity peaks at 10 AM - schedule important work then',
    priority: 'normal',
    category: 'insight',
    time: '3h ago',
    isPro: true,
    actions: [
      { label: 'View Insights', variant: 'default' }
    ]
  },
  {
    id: '4',
    type: 'ai',
    title: 'Daily Summary Ready',
    message: '8 tasks completed, 3 pending for tomorrow',
    priority: 'low',
    category: 'summary',
    time: '5h ago',
    actions: [
      { label: 'View Summary', variant: 'secondary' }
    ]
  }
];

export default function NotificationsPage() {
  const { t, locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<NotificationType>('all');
  const [notifications, setNotifications] = useState(mockNotifications);

  const filteredNotifications = activeTab === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === activeTab);

  const unreadCount = notifications.filter(n => n.priority !== 'low').length;

  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <PageWrapper className="px-5">
      <div className="mobile-container">
        <header className="pt-8 pb-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-[28px] font-extrabold">
              {locale === 'ar' ? 'الإشعارات' : 'Notifications'}
            </h1>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                {unreadCount} {locale === 'ar' ? 'جديد' : 'new'}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-[14px]">
            {locale === 'ar' 
              ? 'ابق على اطلاع بتحديثاتك الذكية' 
              : 'Stay updated with your smart notifications'}
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as NotificationType)} className="mb-6">
          <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur-sm">
            <TabsTrigger value="all" className="text-[13px]">
              {locale === 'ar' ? 'الكل' : 'All'}
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-[13px]">
              {locale === 'ar' ? 'رؤى' : 'Insights'}
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-[13px]">
              {locale === 'ar' ? 'AI' : 'AI'}
            </TabsTrigger>
            <TabsTrigger value="reminders" className="text-[13px]">
              {locale === 'ar' ? 'تذكيرات' : 'Reminders'}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <motion.div 
          className="space-y-3 pb-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <NotificationCard 
                  notification={notification}
                  onDismiss={() => handleDismiss(notification.id)}
                  locale={locale}
                />
              </motion.div>
            ))
          ) : (
            <Card className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                {locale === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
              </p>
            </Card>
          )}
        </motion.div>
      </div>
    </PageWrapper>
  );
}

function NotificationCard({ 
  notification, 
  onDismiss, 
  locale 
}: { 
  notification: MockNotification; 
  onDismiss: () => void;
  locale: string;
}) {
  const priorityColors = {
    urgent: 'border-l-4 border-l-error',
    high: 'border-l-4 border-l-warning',
    normal: 'border-l-2 border-l-accent',
    low: 'border-l-2 border-l-border'
  };

  const categoryIcons = {
    conflict: Calendar,
    task: CheckCircle2,
    insight: Sparkles,
    summary: Clock
  };

  const Icon = categoryIcons[notification.category as keyof typeof categoryIcons] || Bell;

  return (
    <Card className={cn(
      "p-4 relative overflow-hidden",
      priorityColors[notification.priority],
      "hover:shadow-md transition-all"
    )}>
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          "w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0",
          notification.priority === 'high' || notification.priority === 'urgent'
            ? "bg-accent/15"
            : "bg-primary/10"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            notification.priority === 'high' || notification.priority === 'urgent'
              ? "text-accent"
              : "text-primary"
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[14px] font-semibold truncate">{notification.title}</h3>
            {notification.isPro && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-accent/30 text-accent">
                PRO
              </Badge>
            )}
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-2">
            {notification.message}
          </p>
          <span className="text-[11px] text-muted-foreground/70">{notification.time}</span>
        </div>
      </div>

      {notification.actions && notification.actions.length > 0 && (
        <div className="flex gap-2 mt-3">
          {notification.actions.map((action, index) => (
            <Button
              key={index}
              size="sm"
              variant={action.variant || 'default'}
              className="text-[12px] h-8 flex-1"
            >
              {action.label}
              {action.variant === 'default' && (
                <ArrowRight className="w-3 h-3 ml-1" />
              )}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}