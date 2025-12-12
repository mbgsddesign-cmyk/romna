'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Sparkles, Calendar, Clock, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

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
          <div className="skeleton h-10 w-48 mb-6" />
          <div className="skeleton h-12 w-full mb-4" />
          <div className="glass-card h-32 mb-3 animate-pulse" />
          <div className="glass-card h-32 mb-3 animate-pulse" />
          <div className="glass-card h-32 animate-pulse" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="px-5">
      <div className="mobile-container">
        <header className="pt-8 pb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-[32px] font-extrabold text-foreground">
              {locale === 'ar' ? 'الإشعارات' : 'Notifications'}
            </h1>
            {unreadCount > 0 && (
              <Badge className="bg-accent/20 text-accent border-0 text-[13px] px-3 py-1 neon-glow">
                {unreadCount}
              </Badge>
            )}
          </div>
        </header>

        <div className="mb-5">
          <div className="glass-card p-1.5 inline-flex rounded-full">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-6 py-2 rounded-full text-[14px] font-semibold transition-all",
                activeTab === 'all' 
                  ? "bg-accent text-background neon-glow" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={cn(
                "px-6 py-2 rounded-full text-[14px] font-semibold transition-all",
                activeTab === 'ai' 
                  ? "bg-accent text-background neon-glow" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              AI
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={cn(
                "px-6 py-2 rounded-full text-[14px] font-semibold transition-all",
                activeTab === 'insights' 
                  ? "bg-accent text-background neon-glow" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Insights
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className={cn(
                "px-6 py-2 rounded-full text-[14px] font-semibold transition-all",
                activeTab === 'reminders' 
                  ? "bg-accent text-background neon-glow" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Reminders
            </button>
          </div>
        </div>

        <div className="pb-24 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <Bell className="w-14 h-14 text-accent/50 mx-auto mb-4" />
              <p className="text-muted-foreground text-[15px]">No notifications yet</p>
            </div>
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
  
  const priorityClass = notification.priority === 'urgent' ? 'priority-urgent' : 
                        notification.priority === 'high' ? 'priority-high' : 'priority-normal';
  
  const getIcon = () => {
    if (notification.priority === 'urgent') return AlertTriangle;
    if (notification.category === 'insight') return Sparkles;
    if (notification.category === 'conflict') return Calendar;
    if (notification.category === 'summary') return CheckCircle2;
    return AlertCircle;
  };

  const Icon = getIcon();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className={cn(
        "notification-card cursor-pointer",
        priorityClass,
        !notification.is_read && "bg-accent/5"
      )}>
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0",
            notification.priority === 'urgent' ? "bg-red-500/20" : 
            notification.priority === 'high' ? "bg-accent/20 neon-glow" : 
            "bg-primary/20"
          )}>
            <Icon className={cn(
              "w-6 h-6",
              notification.priority === 'urgent' ? "text-red-500" :
              notification.priority === 'high' ? "text-accent" :
              "text-primary"
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-[15px] font-semibold text-foreground">{notification.title}</h3>
              {notification.metadata?.isPro && (
                <Badge className="bg-purple-500/20 text-purple-300 border-0 text-[11px] px-2 py-0">
                  PRO
                </Badge>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
              {notification.message}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-accent font-medium">{timeAgo}</span>
              <div className="flex gap-2">
                {notification.action_label && (
                  <Button 
                    size="sm" 
                    className="h-8 text-[12px] bg-accent hover:bg-accent/90 text-background font-semibold rounded-[12px]"
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
                    variant="ghost"
                    className="h-8 text-[12px] text-muted-foreground hover:text-foreground rounded-[12px]"
                    onClick={() => onMarkRead(notification.id)}
                  >
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
          </div>

          {!notification.is_read && (
            <div className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-1 neon-glow" />
          )}
        </div>
      </div>
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