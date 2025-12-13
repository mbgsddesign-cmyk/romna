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
        variants={containerVariants}
        initial="hidden"
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

            {decision.recommendations && decision.recommendations.length > 0 && (
              <motion.div variants={itemVariants} className="glass-card p-5 mb-6">
                <h3 className="text-[14px] font-bold text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  {locale === 'ar' ? 'توصيات اليوم' : "Today's Insights"}
                </h3>
                <div className="space-y-2">
                  {decision.recommendations.slice(0, 3).map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                      <ChevronRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <DecisionScopedCalendar 
              activeTask={decision.active_task}
              locale={locale}
            />
          </>
        )}
      </motion.div>
    </PageWrapper>
  );
}

function DecisionScopedCalendar({ activeTask, locale }: { activeTask: any; locale: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', today.toISOString())
          .lte('start_time', tomorrow.toISOString())
          .order('start_time');

        if (!error && data) {
          setEvents(data);
        }
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [activeTask?.id]);

  if (loading) return null;
  
  if (events.length === 0 && activeTask) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 mb-6"
      >
        <h3 className="text-[14px] font-bold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          {locale === 'ar' ? 'جدول اليوم' : 'Today & Tomorrow'}
        </h3>
        <div className="text-center py-4">
          <p className="text-[13px] text-muted-foreground">
            {locale === 'ar' 
              ? 'لا توجد أحداث مجدولة. ركز على المهمة النشطة.' 
              : 'No scheduled events. Focus on the active task.'}
          </p>
        </div>
      </motion.div>
    );
  }

  if (!activeTask) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 mb-6"
      >
        <h3 className="text-[14px] font-bold text-muted-foreground mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          {locale === 'ar' ? 'جدول اليوم' : 'Today & Tomorrow'}
        </h3>
        <div className="text-center py-4">
          <p className="text-[12px] text-muted-foreground/60">
            {locale === 'ar' 
              ? 'الجدول يظهر عندما يوجد قرار نشط' 
              : 'Calendar activates when a decision exists'}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 mb-6"
    >
      <h3 className="text-[14px] font-bold text-foreground mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-accent" />
        {locale === 'ar' ? 'جدول اليوم' : 'Today & Tomorrow'}
      </h3>
      
      <div className="space-y-2">
        {events.map((event) => {
          const eventTime = new Date(event.start_time);
          const isRelated = event.title?.toLowerCase().includes(activeTask.title?.toLowerCase().split(' ')[0]) || 
                           event.description?.toLowerCase().includes(activeTask.title?.toLowerCase().split(' ')[0]);
          
          return (
            <div 
              key={event.id}
              className={cn(
                "p-3 rounded-[12px] border transition-all",
                isRelated 
                  ? "bg-accent/10 border-accent/30" 
                  : "bg-muted/20 border-muted/30 opacity-60"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <p className={cn(
                  "text-[13px] font-semibold",
                  isRelated ? "text-accent" : "text-muted-foreground"
                )}>
                  {event.title}
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {eventTime.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              {isRelated && (
                <p className="text-[10px] text-accent font-medium uppercase tracking-wider">
                  {locale === 'ar' ? 'مرتبط بالمهمة النشطة' : 'Related to active task'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}