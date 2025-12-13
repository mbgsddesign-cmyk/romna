'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Clock, Calendar, Play, SkipForward, Repeat, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAutoGLMDecision } from '@/contexts/autoglm-decision-context';

export default function HomePage() {
  const { t, locale } = useTranslation();
  const { decision, loading, refetch } = useAutoGLMDecision();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (action: 'start' | 'reschedule' | 'skip') => {
    setActionLoading(action);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const response = await fetch('/api/autoglm/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action,
          taskId: decision?.active_task?.id,
        }),
      });

      if (response.ok) {
        await refetch();
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionLoading(null);
    }
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

        {loading ? (
          <div className="glass-card p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-accent/20 animate-pulse" />
              <div className="h-4 w-48 bg-muted/20 rounded animate-pulse" />
            </div>
          </div>
        ) : !decision?.active_task ? (
          <motion.div variants={itemVariants} className="glass-card p-8 text-center">
            <Brain className="w-16 h-16 text-accent/30 mx-auto mb-4" />
            <h2 className="text-[20px] font-bold text-foreground mb-2">
              {locale === 'ar' ? 'لا توجد مهام نشطة' : 'No active task'}
            </h2>
            <p className="text-[14px] text-muted-foreground mb-6">
              {decision?.active_task_reason || (locale === 'ar' 
                ? 'لا توجد مهام للعمل عليها الآن'
                : 'No tasks to work on right now.')}
            </p>
            <Link href="/tasks?action=new">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 rounded-[16px] bg-accent text-accent-foreground font-semibold text-[14px] neon-glow"
              >
                {locale === 'ar' ? 'إضافة مهمة جديدة' : 'Add New Task'}
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <>
            <motion.div variants={itemVariants} className="glass-card p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-accent" />
                <span className="text-[12px] font-bold text-accent uppercase tracking-wide">
                  {locale === 'ar' ? 'قرار اليوم' : 'Today\'s Focus'}
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
                      {decision.active_task.ai_reason}
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
                    <>Processing...</>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      {locale === 'ar' ? 'ابدأ' : 'Execute'}
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
                  {locale === 'ar' ? 'توصيات اليوم' : "AI Insights"}
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
          </>
        )}
      </motion.div>
    </PageWrapper>
  );
}