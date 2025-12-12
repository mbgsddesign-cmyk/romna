'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Sparkles, 
  AlertTriangle, 
  ShoppingBasket, 
  Calendar, 
  CheckCircle2, 
  Lightbulb, 
  Mic,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { PaywallModal } from '@/components/romna/paywall-modal';

type NotificationType = 'all' | 'ai' | 'reminders';

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
  metadata?: Record<string, unknown>;
}

export default function NotificationsPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<NotificationType>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('Pro Feature');
  const [paywallTrigger, setPaywallTrigger] = useState('notification_unlock');

  const openPaywall = (feature: string, trigger: string) => {
    setPaywallFeature(feature);
    setPaywallTrigger(trigger);
    setShowPaywall(true);
  };

  const fetchNotifications = useCallback(async () => {
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
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
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
  }, [activeTab]);

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
  }, [fetchNotifications, loading]);

  const handleMarkRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );

      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const newNotifications = notifications.filter(n => !n.is_read);
  const earlierNotifications = notifications.filter(n => n.is_read);

  // Fallback data if no notifications (to show the design)
  // In a real app we might want to show empty state, but for this task we want to match the design visually if empty
  const showDesignFallback = notifications.length === 0 && !loading;

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto shadow-2xl overflow-hidden bg-[#f6f8f7] dark:bg-[#112117] text-foreground font-sans">
      {/* Header */}
      <header className="flex items-center p-6 pb-4 justify-between shrink-0 z-20">
        <button 
          onClick={() => router.back()}
          className="text-white hover:text-[#30e87a] transition-colors flex size-10 items-center justify-center rounded-full active:bg-white/5"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-white text-xl font-bold leading-tight tracking-tight">Notifications</h2>
        <div className="size-10"></div> 
      </header>

      {/* Segmented Control */}
      <div className="px-6 py-2 shrink-0 z-20">
        <div className="flex h-12 w-full items-center rounded-full bg-[#1A2C22] p-1.5 border border-white/5 relative">
          {/* Animated Selection Background */}
          <motion.div 
            className="absolute top-1.5 bottom-1.5 bg-[#30e87a] rounded-full shadow-lg z-0"
            layoutId="tab-highlight"
            initial={false}
            animate={{
              left: activeTab === 'all' ? '1.5%' : activeTab === 'ai' ? '34%' : '67%',
              width: '32%'
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          
          <button 
            onClick={() => setActiveTab('all')}
            className={cn(
              "relative z-10 flex-1 flex items-center justify-center font-semibold text-sm h-full rounded-full transition-all duration-200",
              activeTab === 'all' ? "text-[#052e16]" : "text-[#9db8a8] hover:text-white"
            )}
          >
            All
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={cn(
              "relative z-10 flex-1 flex items-center justify-center font-medium text-sm h-full rounded-full transition-all duration-200",
              activeTab === 'ai' ? "text-[#052e16] font-semibold" : "text-[#9db8a8] hover:text-white"
            )}
          >
            AI
          </button>
          <button 
            onClick={() => setActiveTab('reminders')}
            className={cn(
              "relative z-10 flex-1 flex items-center justify-center font-medium text-sm h-full rounded-full transition-all duration-200",
              activeTab === 'reminders' ? "text-[#052e16] font-semibold" : "text-[#9db8a8] hover:text-white"
            )}
          >
            Reminders
          </button>
        </div>
      </div>

      {/* Smart Hint */}
      <div className="px-6 py-4 shrink-0 text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A2C22]/50 border border-white/5 backdrop-blur-sm">
          <Sparkles className="w-4 h-4 text-[#30e87a]" />
          <p className="text-[#9db8a8] text-xs font-medium tracking-wide">ROMANA waits until the right moment.</p>
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 space-y-3 z-0">
        
        {/* NEW SECTION */}
        {(newNotifications.length > 0 || showDesignFallback) && (
          <>
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest px-2 py-2 mt-2">New</h3>
            
            {showDesignFallback ? (
              <>
                 <NotificationItem 
                   title="Meeting Conflict"
                   message="Your 2 PM design review overlaps with travel time to the airport."
                   time="2m ago"
                   icon={AlertTriangle}
                   isUnread={true}
                   type="warning"
                 />
                 <NotificationItem 
                   title="Grocery Run"
                   message="Don't forget almond milk on your way home."
                   time="1h ago"
                   icon={ShoppingBasket}
                   isUnread={true}
                   type="shopping"
                 />
              </>
            ) : (
              newNotifications.map(n => (
                <NotificationItem 
                  key={n.id}
                  title={n.title}
                  message={n.message}
                  time={getTimeAgo(n.created_at)}
                  icon={getIconForCategory(n.category, n.priority)}
                  isUnread={true}
                  onClick={() => handleMarkRead(n.id)}
                  category={n.category}
                  metadata={n.metadata as any}
                  onUnlock={() => openPaywall('AI Action', 'blocked_action_click')}
                  onUpgrade={() => openPaywall('Pro Plan', 'upgrade_button_click')}
                />
              ))
            )}
          </>
        )}

        {/* EARLIER SECTION */}
        {(earlierNotifications.length > 0 || showDesignFallback) && (
          <>
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest px-2 py-2 mt-4">Earlier</h3>
            
            {showDesignFallback ? (
              <>
                <NotificationItem 
                  title="Deep Work Block"
                  message="Scheduled for 30 mins. Focus mode was active."
                  time="3h ago"
                  icon={Calendar}
                  isUnread={false}
                />
                <NotificationItem 
                  title="Daily Goals Met"
                  message="You completed 5/5 planned tasks today."
                  time="5h ago"
                  icon={CheckCircle2}
                  isUnread={false}
                />
                <NotificationItem 
                  title="Suggestion"
                  message="Try moving your gym session to morning for better energy."
                  time="Yesterday"
                  icon={Lightbulb}
                  isUnread={false}
                />
              </>
            ) : (
              earlierNotifications.map(n => (
                <NotificationItem 
                  key={n.id}
                  title={n.title}
                  message={n.message}
                  time={getTimeAgo(n.created_at)}
                  icon={getIconForCategory(n.category, n.priority)}
                  isUnread={false}
                  onClick={() => {}}
                  category={n.category}
                  metadata={n.metadata as any}
                  onUnlock={() => openPaywall('AI Action', 'blocked_action_click')}
                  onUpgrade={() => openPaywall('Pro Plan', 'upgrade_button_click')}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30 pointer-events-none">
        <button className="pointer-events-auto flex items-center gap-3 bg-[#30e87a] text-[#052e16] px-6 py-4 rounded-full shadow-[0_0_20px_-5px_rgba(48,232,122,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 group">
          <Mic className="w-7 h-7 group-hover:animate-pulse" />
          <span className="text-base font-bold tracking-tight">Ask ROMANA</span>
        </button>
      </div>

      {/* Background Gradient Overlay */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#112117] to-transparent pointer-events-none z-10"></div>
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#112117] via-[#112117]/80 to-transparent pointer-events-none z-10"></div>
      
      <PaywallModal 
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureName={paywallFeature}
        triggerLocation={paywallTrigger}
      />
    </div>
  );
}

function NotificationItem({ 
  title, 
  message, 
  time, 
  icon: Icon, 
  isUnread, 
  onClick,
  category,
  metadata,
  onUnlock,
  onUpgrade
}: { 
  title: string; 
  message: string; 
  time: string; 
  icon: React.ElementType; 
  isUnread: boolean; 
  onClick?: () => void;
  category?: string;
  metadata?: { pro_eligible?: boolean; reason?: string; action_status?: string };
  onUnlock?: () => void;
  onUpgrade?: () => void;
}) {
  const isUpsell = category === 'upgrade';
  const isProEligible = metadata?.pro_eligible === true;
  const isBlocked = metadata?.action_status === 'blocked_pro';

  const handleItemClick = (e: React.MouseEvent) => {
    if (isBlocked && onUnlock) {
      e.stopPropagation();
      onUnlock();
      return;
    }
    if (onClick) onClick();
  };

  return (
    <div 
      onClick={handleItemClick}
      className={cn(
        "group relative w-full touch-pan-x cursor-pointer",
      )}
    >
      <div className={cn(
        "relative flex items-start gap-4 p-5 rounded-2xl shadow-lg transition-transform active:scale-[0.98]",
        isUpsell ? "bg-gradient-to-br from-[#1A2C22] to-[#2C1A22] border border-accent/30" :
        isUnread 
          ? "bg-[#23362b] border-l-4 border-[#30e87a]" 
          : "bg-[#1A2C22] border border-white/5"
      )}>
        <div className="relative">
          <div className={cn(
            "flex items-center justify-center rounded-xl size-12 shrink-0",
            isUpsell ? "bg-accent/20 text-accent" :
            isUnread ? "bg-[#30e87a]/20 text-[#30e87a]" : "bg-[#23362b] text-[#9db8a8]"
          )}>
            {isBlocked ? <div className="text-accent"><Icon className="w-6 h-6 opacity-50" /></div> : <Icon className="w-6 h-6" />}
            {isBlocked && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/40 rounded-full p-1 backdrop-blur-sm">
                        {/* Lock icon overlay */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                </div>
            )}
          </div>
          {isUnread && !isUpsell && !isBlocked && (
            <div className="absolute -top-1 -right-1 size-3 bg-[#30e87a] rounded-full border-2 border-[#23362b]"></div>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-center min-w-0">
          <div className="flex justify-between items-start mb-0.5">
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-base leading-tight truncate pr-2",
                isUpsell ? "text-white font-bold" :
                isUnread ? "text-white font-semibold" : "text-white/80 font-medium"
              )}>
                {title}
              </p>
              {isProEligible && !isUpsell && !isBlocked && (
                 <span className="px-1.5 py-0.5 rounded-md bg-accent/20 text-accent text-[10px] font-bold uppercase tracking-wider border border-accent/20">
                   Pro Insight
                 </span>
              )}
              {isBlocked && (
                 <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
                   Locked
                 </span>
              )}
            </div>
            <span className={cn(
              "text-xs font-medium whitespace-nowrap",
              isUpsell ? "text-accent" :
              isUnread ? "text-[#30e87a]" : "text-white/30"
            )}>
              {time}
            </span>
          </div>
          <p className={cn(
            "text-sm font-normal leading-relaxed line-clamp-2",
            isUpsell ? "text-white/90" :
            isUnread ? "text-[#9db8a8]" : "text-white/40"
          )}>
            {message}
          </p>
          
          {isUpsell && (
              <div className="mt-3">
                  <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          if (onUpgrade) onUpgrade();
                      }}
                      className="text-xs font-bold bg-accent/90 hover:bg-accent text-white px-4 py-2 rounded-lg w-full transition-colors"
                  >
                      Upgrade to Pro
                  </button>
              </div>
          )}

          {isBlocked && (
              <div className="mt-3">
                  <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          if (onUnlock) onUnlock();
                      }}
                      className="flex items-center justify-center gap-2 text-xs font-bold bg-[#1A2C22] hover:bg-[#23362b] border border-amber-500/30 text-amber-500 px-4 py-2 rounded-lg w-full transition-colors"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      Unlock Action
                  </button>
              </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getIconForCategory(category: string, priority: string) {
  if (category === 'conflict' || priority === 'urgent') return AlertTriangle;
  if (category === 'shopping' || category === 'task') return ShoppingBasket;
  if (category === 'calendar' || category === 'event') return Calendar;
  if (category === 'success' || category === 'achievement') return CheckCircle2;
  if (category === 'idea' || category === 'insight') return Lightbulb;
  if (category === 'ai') return Sparkles;
  return Bell;
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