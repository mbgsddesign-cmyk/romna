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
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';

type NotificationType = 'all' | 'insights' | 'ai' | 'reminders';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  created_at: string;
  action_url?: string;
  action_label?: string;
  is_read: boolean;
  metadata?: any;
}

export default function NotificationsPage() {
  const { t, locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<NotificationType>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadingTimeoutRef.current = setTimeout(() => {
      if (loading) {
        console.warn('Notifications loading timeout - showing UI anyway');
        setLoading(false);
      }
    }, 8000);

    fetchNotifications();
    
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [activeTab]);

  const fetchNotifications = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const category = activeTab === 'all' ? null : activeTab;
      const url = category 
        ? `/api/notifications/all?category=${category}`
        : '/api/notifications/all';
      
      const res = await fetch(url, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        console.warn('Notifications API returned non-OK status');
        setNotifications([]);
        return;
      }
      
      const data = await res.json();
      if (data.success && data.notifications) {
        setNotifications(data.notifications);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Notifications request timed out');
      } else {
        console.error('Failed to fetch notifications:', error);
      }
      setNotifications([]);
    } finally {
      setLoading(false);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  const filteredNotifications = notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <PageWrapper className="px-5">
        <div className="mobile-container pt-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-32 w-full mb-3" />
          <Skeleton className="h-32 w-full mb-3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="px-5">
      <div className="mobile-container">
        <header className="pt-8 pb-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-[28px] font-extrabold">
              {locale === 'ar' ? 'الإشعارات' : 'Notifications'}
            </h1>
            {unreadCount > 0 && (
              <Badge className="bg-accent text-accent-foreground">
                {unreadCount}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-[14px]">
            {locale === 'ar' ? 'ابقَ على اطلاع' : 'Stay updated'}
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as NotificationType)} className="mb-4">
          <TabsList className="grid w-full grid-cols-4 h-11 rounded-[14px] p-1 bg-muted">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="pb-24 space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card className="p-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No notifications yet</p>
            </Card>
          ) : (
            filteredNotifications.map((notif, index) => (
              <NotificationCard
                key={notif.id}
                notification={notif}
                index={index}
                onMarkRead={handleMarkRead}
              />
            ))
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

function NotificationCard({ 
  notification, 
  index, 
  onMarkRead 
}: { 
  notification: Notification; 
  index: number;
  onMarkRead: (id: string) => void;
}) {
  const timeAgo = getTimeAgo(notification.created_at);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={cn(
        "p-4 hover:shadow-md transition-all relative",
        !notification.is_read && "border-l-4 border-l-accent"
      )}>
        {notification.priority === 'urgent' && (
          <div className="absolute top-2 right-2">
            <Badge variant="destructive" className="text-[10px] h-5">URGENT</Badge>
          </div>
        )}
        
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0",
            notification.priority === 'urgent' ? "bg-destructive/10" : "bg-accent/10"
          )}>
            {notification.category === 'insight' && <Sparkles className="w-5 h-5 text-accent" />}
            {notification.category === 'conflict' && <Calendar className="w-5 h-5 text-destructive" />}
            {notification.category === 'summary' && <CheckCircle2 className="w-5 h-5 text-primary" />}
            {!['insight', 'conflict', 'summary'].includes(notification.category) && (
              <Clock className="w-5 h-5 text-primary" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[14px] font-semibold">{notification.title}</h3>
              {notification.metadata?.isPro && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-accent/30 text-accent">
                  PRO
                </Badge>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
              {notification.message}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
              <div className="flex gap-2">
                {notification.action_label && (
                  <Button 
                    size="sm" 
                    variant="default" 
                    className="h-8 text-[12px]"
                    onClick={() => {
                      if (notification.action_url) {
                        window.location.href = notification.action_url;
                      }
                      onMarkRead(notification.id);
                    }}
                  >
                    {notification.action_label}
                  </Button>
                )}
                {!notification.is_read && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-[12px]"
                    onClick={() => onMarkRead(notification.id)}
                  >
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}