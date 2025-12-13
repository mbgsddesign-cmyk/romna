'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Clock, Calendar, Play, SkipForward, Repeat, ChevronRight, RefreshCcw, AlertCircle, Mic } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { useAutoGLMDecision } from '@/contexts/autoglm-decision-context';
import { useRomnaAI } from '@/contexts/romna-ai-context';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const { t, locale } = useTranslation();
  const { decision, loading, error, status, refetch } = useAutoGLMDecision();
  const { openDrawer } = useRomnaAI();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    setHasAnimated(true);
  }, []);

  const handleAction = async (action: 'start' | 'reschedule' | 'skip') => {
    if (actionLoading) return;
    setActionLoading(action);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('/api/autoglm/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action,
          taskId: decision?.active_task?.id,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        await refetch();
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDecisionReason = (task: any) => {
    if (!task?.ai_reason) return '';
    
    const reason = task.ai_reason;
    const title = task.title;
    
    if (reason.includes('Overdue') && task.priority === 'high') {
      return `This is overdue and high priority. ${locale === 'ar' ? 'ابدأ الآن' : 'Start now'}.`;
    }
    
    if (reason.includes('High priority')) {
      return `Because this is high priority, ${locale === 'ar' ? 'ركز عليه الآن' : 'focus on it now'}.`;
    }
    
    return `${reason}. ${locale === 'ar' ? 'هذا هو الأفضل الآن' : 'This is the best next step'}.`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <PageWrapper className="px-5">
      <motion.div
        key="home-content"
        variants={containerVariants}
        initial={hasAnimated ? false : "hidden"}
        animate="visible"
      >
        <motion.header variants={itemVariants} className="pt-8 pb-6">
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">
            {t('appName')}
          </h1>
          <p className="text-accent text-[14px] mt-0.5 font-medium">
            {locale === 'ar' ? 'مركز القرارات الذكي' : 'AI Decision Center'}
          </p>
        </motion.header>

        {status === 'loading' ? (
          <div className="glass-card p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-accent/20 animate-pulse" />
              <div className="h-4 w-48 bg-muted/20 rounded animate-pulse" />
            </div>
          </div>
        ) : status === 'error' ? (
          <motion.div variants={itemVariants} className="glass-card p-8 text-center">
            <AlertCircle className="w-16 h-16 text-destructive/50 mx-auto mb-4" />
            <h2 className="text-[20px] font-bold text-foreground mb-2">
              {locale === 'ar' ? 'فشل تحميل القرار' : 'Failed to load decision'}
            </h2>
            <p className="text-[14px] text-muted-foreground mb-6">
              {error || (locale === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : 'Something went wrong. Try again.')}
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={refetch}
              disabled={loading}
              className="px-6 py-3 rounded-[16px] bg-accent text-accent-foreground font-semibold text-[14px] neon-glow flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
            >
              <RefreshCcw className="w-4 h-4" />
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </motion.button>
          </motion.div>
        ) : status === 'empty' || !decision?.active_task ? (
          <motion.div variants={itemVariants} className="glass-card p-8 text-center">
            <Brain className="w-16 h-16 text-accent/30 mx-auto mb-4" />
            <h2 className="text-[20px] font-bold text-foreground mb-2">
              {locale === 'ar' ? 'لا يوجد قرار نشط الآن' : 'No active decision right now'}
            </h2>
            <p className="text-[14px] text-muted-foreground mb-6">
              {locale === 'ar' 
                ? 'لا توجد مهام عاجلة أو أولويات حرجة في الوقت الحالي. هذا قرار واعٍ من ROMNA.'
                : 'There are no urgent tasks or critical priorities right now. This is an intentional decision by ROMNA.'}
            </p>
            <p className="text-[13px] text-muted-foreground/80 mb-6">
              {locale === 'ar' 
                ? 'يمكنك إضافة مهمة جديدة أو أخذ استراحة قصيرة.'
                : 'You can add a new task or take a short break.'}
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={openDrawer}
              className="px-6 py-3 rounded-[16px] bg-accent text-accent-foreground font-semibold text-[14px] neon-glow flex items-center justify-center gap-2 mx-auto"
            >
              <Mic className="w-4 h-4" />
              {locale === 'ar' ? 'أضف مهمة بالصوت' : 'Add a task by voice'}
            </motion.button>
          </motion.div>
        ) : (
          <>
            {/* 1️⃣ DECISION CARD */}
            <motion.div variants={itemVariants} className="glass-card p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-accent" />
                <span className="text-[12px] font-bold text-accent uppercase tracking-wide">
                  {locale === 'ar' ? 'قرار اليوم' : 'Now'}
                </span>
              </div>

              <h2 className="text-[22px] font-bold text-foreground mb-3 leading-tight">
                {decision.active_task.title}
              </h2>

              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-accent/20 text-accent border-0 text-[11px]">
                  Priority {decision.active_task.ai_priority}/5
                </Badge>
                {decision.active_task.estimated_duration && (
                  <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {decision.active_task.estimated_duration}m
                  </div>
                )}
                {decision.active_task.due_date && (
                  <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(decision.active_task.due_date).toLocaleDateString(
                      locale === 'ar' ? 'ar-EG' : 'en-US',
                      { month: 'short', day: 'numeric' }
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-[14px] bg-muted/30 mb-6">
                <div className="flex items-start gap-2">
                  <Brain className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-accent uppercase tracking-wide mb-1">
                      {locale === 'ar' ? 'لماذا الآن؟' : 'Why now?'}
                    </p>
                    <p className="text-[13px] text-foreground leading-relaxed">
                      {formatDecisionReason(decision.active_task)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={actionLoading === 'start'}
                  onClick={() => handleAction('start')}
                  className="w-full px-6 py-4 rounded-[16px] bg-accent text-accent-foreground font-bold text-[15px] neon-glow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading === 'start' ? (
                    <>{locale === 'ar' ? 'جاري التنفيذ...' : 'Processing...'}</>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      {locale === 'ar' ? 'ابدأ الآن' : 'Execute'}
                    </>
                  )}
                </motion.button>

                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    disabled={actionLoading === 'reschedule'}
                    onClick={() => handleAction('reschedule')}
                    className="px-4 py-3 rounded-[14px] bg-muted/30 hover:bg-muted/50 text-foreground font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Repeat className="w-4 h-4" />
                    {locale === 'ar' ? 'إعادة جدولة' : 'Snooze'}
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    disabled={actionLoading === 'skip'}
                    onClick={() => handleAction('skip')}
                    className="px-4 py-3 rounded-[14px] bg-muted/30 hover:bg-muted/50 text-foreground font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <SkipForward className="w-4 h-4" />
                    {locale === 'ar' ? 'تخطي' : 'Adjust'}
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* 2️⃣ TODAY/TOMORROW TIMELINE */}
            <TodayTomorrowTimeline 
              activeTask={decision.active_task}
              locale={locale}
            />

            {/* 3️⃣ CALENDAR STRIP */}
            <CalendarStrip 
              activeTask={decision.active_task}
              locale={locale}
            />

            {/* 4️⃣ INSIGHTS (Minimized) */}
            {decision.recommendations && decision.recommendations.length > 0 && (
              <motion.div variants={itemVariants} className="glass-card p-5 mb-6">
                <h3 className="text-[13px] font-bold text-muted-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                  {locale === 'ar' ? 'ملاحظات' : 'Insights'}
                </h3>
                <div className="space-y-2">
                  {decision.recommendations.slice(0, 2).map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </PageWrapper>
  );
}

function TodayTomorrowTimeline({ activeTask, locale }: { activeTask: any; locale: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchEvents = async () => {
      if (!isMounted) return;
      
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user || !isMounted) return;

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 2);
        tomorrow.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', today.toISOString())
          .lte('start_time', tomorrow.toISOString())
          .order('start_time');

        if (!error && data && isMounted) {
          setEvents(data);
        }
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEvents();
    
    return () => {
      isMounted = false;
    };
  }, [activeTask?.id]);

  if (loading) return null;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.start_time);
    return eventDate.toDateString() === today.toDateString();
  });

  const tomorrowEvents = events.filter(e => {
    const eventDate = new Date(e.start_time);
    return eventDate.toDateString() === tomorrow.toDateString();
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 mb-6"
    >
      <h3 className="text-[14px] font-bold text-foreground mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-accent" />
        {locale === 'ar' ? 'اليوم وغدًا' : 'Today & Tomorrow'}
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Today */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-accent uppercase tracking-wide">
            {locale === 'ar' ? 'اليوم' : 'Today'}
          </div>
          {todayEvents.length > 0 ? (
            <div className="space-y-2">
              {todayEvents.slice(0, 2).map((event) => (
                <div 
                  key={event.id}
                  className="p-2.5 rounded-[10px] bg-accent/10 border border-accent/20"
                >
                  <p className="text-[12px] font-semibold text-foreground mb-0.5 truncate">
                    {event.title}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(event.start_time).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-[10px] bg-muted/20 border border-muted/30">
              <p className="text-[11px] text-muted-foreground">
                {locale === 'ar' ? 'وقت فراغ' : 'Free time'}
              </p>
              <p className="text-[10px] text-accent mt-1">
                {locale === 'ar' ? 'وقت جيد للتركيز' : 'Good time for focus'}
              </p>
            </div>
          )}
        </div>

        {/* Tomorrow */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            {locale === 'ar' ? 'غدًا' : 'Tomorrow'}
          </div>
          {tomorrowEvents.length > 0 ? (
            <div className="space-y-2">
              {tomorrowEvents.slice(0, 2).map((event) => (
                <div 
                  key={event.id}
                  className="p-2.5 rounded-[10px] bg-muted/20 border border-muted/30"
                >
                  <p className="text-[12px] font-semibold text-foreground mb-0.5 truncate">
                    {event.title}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(event.start_time).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-[10px] bg-muted/20 border border-muted/30">
              <p className="text-[11px] text-muted-foreground">
                {locale === 'ar' ? 'وقت فراغ' : 'Free time'}
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                {locale === 'ar' ? 'احجز وقت تركيز؟' : 'Block focus time?'}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CalendarStrip({ activeTask, locale }: { activeTask: any; locale: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchEvents = async () => {
      if (!isMounted) return;
      
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user || !isMounted) return;

        const today = new Date();
        const threeDaysOut = new Date(today);
        threeDaysOut.setDate(threeDaysOut.getDate() + 3);

        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', today.toISOString())
          .lte('start_time', threeDaysOut.toISOString())
          .order('start_time');

        if (!error && data && isMounted) {
          setEvents(data);
        }
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEvents();
    
    return () => {
      isMounted = false;
    };
  }, [activeTask?.id]);

  if (loading) return null;

  const today = new Date();
  const next3Days = Array.from({ length: 3 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    return date;
  });

  const getEventsForDay = (date: Date) => {
    return events.filter(e => {
      const eventDate = new Date(e.start_time);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const hasAnyEvents = events.length > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 mb-6"
    >
      <h3 className="text-[14px] font-bold text-foreground mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-accent" />
        {locale === 'ar' ? 'الأيام القادمة' : 'Next Days'}
      </h3>
      
      {!hasAnyEvents ? (
        <div className="text-center py-3">
          <p className="text-[13px] text-foreground mb-1">
            {locale === 'ar' 
              ? 'جدولك مفتوح.' 
              : 'Your schedule is open.'}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {locale === 'ar' 
              ? 'ROMNA يوصي بالتركيز أو الراحة.' 
              : 'ROMNA recommends focus or rest.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {next3Days.map((date, idx) => {
            const dayEvents = getEventsForDay(date);
            const isToday = idx === 0;
            
            return (
              <div 
                key={idx}
                className={cn(
                  "p-3 rounded-[12px] border transition-all",
                  isToday 
                    ? "bg-accent/10 border-accent/30" 
                    : "bg-muted/10 border-muted/20"
                )}
              >
                <div className={cn(
                  "text-[10px] font-bold uppercase tracking-wide mb-2",
                  isToday ? "text-accent" : "text-muted-foreground"
                )}>
                  {date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { 
                    weekday: 'short',
                    day: 'numeric'
                  })}
                </div>
                
                {dayEvents.length > 0 ? (
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div key={event.id} className="text-[10px] text-foreground/80 truncate">
                        • {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] text-muted-foreground">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground/60">
                    {locale === 'ar' ? 'فارغ' : 'Free'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}