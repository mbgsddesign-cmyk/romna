'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { BottomNav } from '@/components/bottom-nav';
import { useTranslation } from '@/hooks/use-translation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  MessageSquare,
  Bell,
  Calendar,
  RefreshCw,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface ExecutionPlan {
  id: string;
  user_id: string;
  source: 'voice' | 'text';
  intent_type: 'reminder' | 'alarm' | 'email' | 'whatsapp' | 'notification';
  scheduled_for: string;
  requires_approval: boolean;
  status: 'pending' | 'waiting_approval' | 'scheduled' | 'executed' | 'cancelled' | 'failed';
  payload: Record<string, any>;
  created_at: string;
  executed_at?: string;
  error_message?: string;
}

export default function NotificationsPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [plans, setPlans] = useState<ExecutionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPlans([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/execution/plans?userId=${user.id}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        setPlans([]);
        return;
      }

      const data = await response.json();
      if (data.success && data.plans) {
        setPlans(data.plans);
      } else {
        setPlans([]);
      }
    } catch (error) {
      console.error('[Notifications] Failed to fetch execution plans:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();

    const channel = supabase
      .channel('execution_plans_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'execution_plans' },
        () => fetchPlans()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPlans]);

  const handleApprove = async (planId: string) => {
    if (actionLoading) return;
    setActionLoading(planId);

    try {
      const response = await fetch('/api/actions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      if (response.ok) {
        await fetchPlans();
      }
    } catch (error) {
      console.error('Approve failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (planId: string) => {
    if (actionLoading) return;
    setActionLoading(planId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('execution_plans')
        .update({ status: 'cancelled' })
        .eq('id', planId)
        .eq('user_id', user.id);

      if (!error) {
        await fetchPlans();
      }
    } catch (error) {
      console.error('Cancel failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = async (planId: string) => {
    if (actionLoading) return;
    setActionLoading(planId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('execution_plans')
        .update({ 
          status: 'scheduled',
          error_message: null,
          scheduled_for: new Date().toISOString(),
        })
        .eq('id', planId)
        .eq('user_id', user.id);

      if (!error) {
        await fetchPlans();
      }
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const filterPlans = (status: ExecutionPlan['status'][]) => 
    plans.filter(p => status.includes(p.status));

  const scheduledPlans = filterPlans(['scheduled']);
  const waitingApproval = filterPlans(['waiting_approval']);
  const failedPlans = filterPlans(['failed']);

  const hasActions = scheduledPlans.length > 0 || waitingApproval.length > 0 || failedPlans.length > 0;

  return (
    <>
      <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto shadow-2xl overflow-hidden bg-[#f6f8f7] dark:bg-[#112117] text-foreground font-sans">
        {/* Header */}
        <header className="flex items-center p-6 pb-4 justify-between shrink-0 z-20">
          <button 
            onClick={() => router.back()}
            className="text-white hover:text-[#30e87a] transition-colors flex size-10 items-center justify-center rounded-full active:bg-white/5"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-white text-xl font-bold leading-tight tracking-tight">
            {locale === 'ar' ? 'صندوق التنفيذ' : 'Execution Inbox'}
          </h2>
          <button
            onClick={fetchPlans}
            className="text-white hover:text-[#30e87a] transition-colors flex size-10 items-center justify-center rounded-full active:bg-white/5"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 space-y-4 z-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : !hasActions ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="w-16 h-16 text-accent/30 mb-4" />
              <p className="text-white/60 text-sm">
                {locale === 'ar' 
                  ? 'لا توجد إجراءات قادمة أو موافقات مطلوبة.' 
                  : 'No upcoming actions or approvals.'}
              </p>
            </div>
          ) : (
            <>
              {/* Waiting Approval */}
              {waitingApproval.length > 0 && (
                <>
                  <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest px-2 py-2">
                    {locale === 'ar' ? 'في انتظار الموافقة' : 'Needs Approval'}
                  </h3>
                  {waitingApproval.map(plan => (
                    <ExecutionCard
                      key={plan.id}
                      plan={plan}
                      locale={locale}
                      actionLoading={actionLoading === plan.id}
                      onApprove={() => handleApprove(plan.id)}
                      onCancel={() => handleCancel(plan.id)}
                    />
                  ))}
                </>
              )}

              {/* Scheduled */}
              {scheduledPlans.length > 0 && (
                <>
                  <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest px-2 py-2 mt-4">
                    {locale === 'ar' ? 'مجدول' : 'Scheduled'}
                  </h3>
                  {scheduledPlans.map(plan => (
                    <ExecutionCard
                      key={plan.id}
                      plan={plan}
                      locale={locale}
                      actionLoading={actionLoading === plan.id}
                      onCancel={() => handleCancel(plan.id)}
                    />
                  ))}
                </>
              )}

              {/* Failed */}
              {failedPlans.length > 0 && (
                <>
                  <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest px-2 py-2 mt-4">
                    {locale === 'ar' ? 'فشل' : 'Failed'}
                  </h3>
                  {failedPlans.map(plan => (
                    <ExecutionCard
                      key={plan.id}
                      plan={plan}
                      locale={locale}
                      actionLoading={actionLoading === plan.id}
                      onRetry={() => handleRetry(plan.id)}
                      onCancel={() => handleCancel(plan.id)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Background Gradient */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#112117] to-transparent pointer-events-none z-10"></div>
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#112117] via-[#112117]/80 to-transparent pointer-events-none z-10"></div>
      </div>
      <BottomNav />
    </>
  );
}

function ExecutionCard({ 
  plan, 
  locale, 
  actionLoading,
  onApprove,
  onRetry,
  onCancel,
}: {
  plan: ExecutionPlan;
  locale: string;
  actionLoading: boolean;
  onApprove?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
}) {
  const icon = getIconForType(plan.intent_type);
  const Icon = icon;

  const scheduledDate = new Date(plan.scheduled_for);
  const formattedDate = scheduledDate.toLocaleString(
    locale === 'ar' ? 'ar-EG' : 'en-US',
    { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  );

  const title = plan.payload?.title || plan.payload?.subject || plan.payload?.message || 
                (locale === 'ar' ? 'إجراء' : 'Action');

  const isApprovalNeeded = plan.status === 'waiting_approval';
  const isFailed = plan.status === 'failed';
  const isScheduled = plan.status === 'scheduled';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full"
    >
      <div className={cn(
        "flex flex-col gap-4 p-5 rounded-2xl shadow-lg border transition-all",
        isApprovalNeeded && "bg-[#2d3b21] border-[#30e87a]/30",
        isFailed && "bg-[#3b2121] border-red-500/30",
        isScheduled && "bg-[#1A2C22] border-white/5"
      )}>
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={cn(
            "flex items-center justify-center rounded-xl size-12 shrink-0",
            isApprovalNeeded && "bg-[#30e87a]/20 text-[#30e87a]",
            isFailed && "bg-red-500/20 text-red-400",
            isScheduled && "bg-[#23362b] text-[#9db8a8]"
          )}>
            <Icon className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-base mb-1 truncate">{title}</p>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Clock className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Preview for Email/WhatsApp */}
        {(plan.intent_type === 'email' || plan.intent_type === 'whatsapp') && plan.payload?.message && (
          <div className="p-3 rounded-lg bg-black/20 border border-white/5">
            <p className="text-white/80 text-sm line-clamp-3">{plan.payload.message}</p>
          </div>
        )}

        {/* Error Message */}
        {isFailed && plan.error_message && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-xs">{plan.error_message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {isApprovalNeeded && onApprove && (
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={actionLoading}
                onClick={onApprove}
                className="flex-1 px-4 py-3 rounded-xl bg-[#30e87a] text-[#052e16] font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {locale === 'ar' ? 'موافقة وتنفيذ' : 'Approve & Execute'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={actionLoading}
                onClick={onCancel}
                className="px-4 py-3 rounded-xl bg-[#23362b] text-white/80 font-semibold text-sm disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
              </motion.button>
            </>
          )}

          {isFailed && onRetry && (
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={actionLoading}
                onClick={onRetry}
                className="flex-1 px-4 py-3 rounded-xl bg-[#30e87a] text-[#052e16] font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={actionLoading}
                onClick={onCancel}
                className="px-4 py-3 rounded-xl bg-[#23362b] text-white/80 font-semibold text-sm disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
              </motion.button>
            </>
          )}

          {isScheduled && onCancel && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              disabled={actionLoading}
              onClick={onCancel}
              className="w-full px-4 py-3 rounded-xl bg-[#23362b] text-white/80 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function getIconForType(type: string) {
  switch (type) {
    case 'email': return Mail;
    case 'whatsapp': return MessageSquare;
    case 'alarm': return Bell;
    case 'reminder': return Calendar;
    case 'notification': return AlertCircle;
    default: return Bell;
  }
}