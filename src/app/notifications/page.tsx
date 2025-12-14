'use client';

import { BottomNav } from '@/components/bottom-nav';
import { useTranslation } from '@/hooks/use-translation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { WhatsAppCard } from '@/components/cards/whatsapp-card';
import { EmailDraftCard } from '@/components/cards/email-draft-card';

interface ExecutionPlan {
   id: string;
   user_id: string;
   source: 'voice' | 'text';
   intent_type: 'reminder' | 'alarm' | 'email' | 'whatsapp' | 'notification';
   scheduled_for: string;
   requires_approval: boolean;
   status: 'pending' | 'waiting_approval' | 'scheduled' | 'executed' | 'cancelled' | 'failed';
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   payload: Record<string, any>;
   created_at: string;
   executed_at?: string; // [V6] Added for 24h filter
   error_message?: string;
}

interface ExecutionCardProps {
   plan: ExecutionPlan;
   index: number;
   onApprove: (payload?: any) => void;
   onCancel: () => void;
   loading: boolean;
}

export default function NotificationsPage() {
   const { t } = useTranslation();
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
         // Direct Supabase Fetch (More Robust)
         const { data, error } = await supabase
            .from('execution_plans')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

         if (error) {
            console.error('Fetch plans error:', error);
            setPlans([]);
         } else {
            setPlans(data || []);
         }
      } catch (e) {
         console.error('Unexpected fetch error:', e);
         setPlans([]);
      } finally {
         setLoading(false);
      }
   }, []);

   const refreshTick = useAppStore(state => state.refreshTick);

   useEffect(() => {
      // Fetch on mount AND when global signal ticks
      fetchPlans();
   }, [fetchPlans, refreshTick]);

   // Removed local realtime subscription to avoid duplication and races
   // logic is now centralized in FeedbackListener + Global Store

   const handleAction = async (planId: string, action: 'approve' | 'cancel', payload?: any) => {
      if (actionLoading) return;
      setActionLoading(planId);
      try {
         const { data: { session } } = await supabase.auth.getSession();
         if (!session) return;

         const response = await fetch('/api/actions/approve', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ planId, action, payload }),
         });

         if (response.ok) {
            toast.success(action === 'approve' ? 'Approved' : 'Cancelled');
            useAppStore.getState().triggerRefresh(); // Signal Home/Badges to update
         } else {
            const err = await response.json();
            toast.error(err.error || 'Action failed');
         }
      } catch (error) {
         console.error(error);
         toast.error('Connection failed');
      } finally {
         setActionLoading(null);
      }
   };

   // Group plans with 24h filter for executed
   const now = new Date();
   const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

   const waitingApproval = plans.filter(p => p.status === 'waiting_approval');
   const scheduled = plans.filter(p => p.status === 'scheduled');
   // [V6] Only show executed plans from last 24h - prevents stale data
   const recentlyExecuted = plans.filter(p =>
      p.status === 'executed' &&
      p.executed_at &&
      new Date(p.executed_at) > twentyFourHoursAgo
   );
   const activePlans = [...waitingApproval, ...scheduled, ...recentlyExecuted];

   return (
      <div className="relative min-h-screen w-full bg-void pb-32 overflow-x-hidden flex flex-col font-sans selection:bg-volt selection:text-black">

         <header className="px-6 pt-12 pb-4">
            <h1 className="text-2xl font-bold text-white font-space tracking-tight">
               {t('inbox')}
               <span className="text-volt text-3xl ml-1">.</span>
            </h1>
            <p className="text-white/40 text-xs font-medium uppercase tracking-widest mt-1">{t('actionCenter')}</p>
         </header>

         <main className="flex-1 px-4 flex flex-col items-center">
            {loading ? (
               <div className="mt-20 w-8 h-8 rounded-full border-2 border-volt/20 border-t-volt animate-spin"></div>
            ) : activePlans.length === 0 ? (
               <div className="mt-32 flex flex-col items-center text-center opacity-40">
                  <div className="w-16 h-1 bg-white/10 rounded-full mb-4"></div>
                  <p className="text-white/50 font-space text-lg">
                     {t('nothingWaiting')}
                  </p>
                  <p className="text-white/20 text-xs mt-2">
                     {t('illNotifyYou')}
                  </p>
               </div>
            ) : (
               <div className="w-full max-w-md space-y-4 mt-4">
                  <AnimatePresence>
                     {activePlans.map((plan, index) => (
                        <ExecutionCard
                           key={plan.id}
                           plan={plan}
                           index={index}
                           onApprove={(payload) => handleAction(plan.id, 'approve', payload)}
                           onCancel={() => handleAction(plan.id, 'cancel')}
                           loading={actionLoading === plan.id}
                        />
                     ))}
                  </AnimatePresence>
               </div>
            )}
         </main>

         <BottomNav />
      </div>
   );
}

function ExecutionCard({ plan, index, onApprove, onCancel, loading }: ExecutionCardProps) {
   const { t } = useTranslation();
   const isApproval = plan.status === 'waiting_approval';
   const isScheduled = plan.status === 'scheduled';

   // [V5] Specialized Cards
   if (isApproval && plan.intent_type === 'whatsapp') {
      return <WhatsAppCard
         plan={plan}
         onApprove={(id, payload) => Promise.resolve(onApprove(payload))}
         onReject={(id) => Promise.resolve(onCancel())}
         isExecuting={loading}
      />;
   }
   if (isApproval && plan.intent_type === 'email') {
      return <EmailDraftCard
         plan={plan}
         onApprove={(id, payload) => Promise.resolve(onApprove(payload))}
         onReject={(id) => Promise.resolve(onCancel())}
         isExecuting={loading}
      />;
   }

   // Safe Date Parsing
   let formattedDate = t('invalidDate');
   try {
      formattedDate = plan.scheduled_for ? format(new Date(plan.scheduled_for), 'MMM d, h:mm a') : t('tbd');
   } catch (e) {
      formattedDate = t('timeError');
   }


   // --- MICRO AI ASSISTANCE ---
   let microAiText = null;
   let displayTitle = plan.payload?.title || plan.payload?.subject || t('unnamedAction');

   const isClarification = plan.payload?.reason === 'needs clarification';

   if (isApproval) {
      if (isClarification) {
         displayTitle = t('needsClarification');
         microAiText = t('microClarification');
      } else if (plan.payload?.frequency === 'recurring' || plan.intent_type === 'reminder') {
         microAiText = t('microRecurring');
      } else {
         microAiText = t('microApproval');
      }
   } else if (isScheduled) {
      microAiText = t('microScheduled');
   }

   return (
      <motion.div
         initial={{ opacity: 0, y: 20, scale: 0.95 }}
         animate={{ opacity: 1, y: 0, scale: 1 }}
         exit={{ opacity: 0, scale: 0.9 }}
         transition={{ delay: index * 0.1 }}
         className={`relative w-full rounded-2xl overflow-hidden border transition-all duration-300 ${isApproval
            ? 'bg-obsidian border-volt/30 shadow-[0_0_20px_rgba(217,253,0,0.05)]'
            : 'bg-white/5 border-white/5 opacity-60'
            }`}
      >
         <div className="p-5 flex flex-col gap-4">
            <div className="flex justify-between items-start">
               <div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md mb-2 inline-block ${isApproval ? 'bg-volt text-black' : 'bg-white/10 text-white/60'
                     }`}>
                     {isClarification ? t('needsInfo') : (isApproval ? t('needsApproval') : t('scheduled'))}
                  </span>
                  <h3 className="text-white font-medium text-lg leading-tight mt-1">
                     {displayTitle}
                  </h3>
               </div>
               {plan.intent_type && (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                     <span className="material-symbols-outlined text-[18px]">
                        {plan.intent_type === 'email' ? 'mail' :
                           plan.intent_type === 'whatsapp' ? 'chat' : 'notifications'}
                     </span>
                  </div>
               )}
            </div>

            <div className="flex items-center gap-2 text-white/30 text-xs font-mono">
               <span>{formattedDate}</span>
               <span>•</span>
               <span className="capitalize">{plan.intent_type}</span>
            </div>

            {/* MICRO AI HINT */}
            {microAiText && (
               <div className="flex items-center gap-2 text-volt/60 text-[11px] font-medium font-space pt-1">
                  <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                  {microAiText}
               </div>
            )}

            {/* Action Buttons - ONLY render if actionable */}
            {isApproval && (
               <div className="flex gap-3 pt-2">
                  <button
                     disabled={loading}
                     onClick={onApprove}
                     className="flex-1 h-10 rounded-xl bg-volt text-black text-sm font-bold tracking-wide hover:bg-[#c2e200] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                     {loading ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span> : t('approve')}
                  </button>
                  <button
                     disabled={loading}
                     onClick={onCancel}
                     className="h-10 px-4 rounded-xl border border-white/10 text-white/60 text-xs font-medium hover:bg-white/5 active:scale-95 transition-all"
                  >
                     {t('cancel')}
                  </button>
               </div>
            )}

            {/* Cancel only for scheduled items */}
            {isScheduled && (
               <div className="pt-2">
                  <button
                     disabled={loading}
                     onClick={onCancel}
                     className="w-full h-10 rounded-xl border border-white/10 text-white/60 text-xs font-medium hover:bg-white/5 active:scale-95 transition-all"
                  >
                     {t('cancelSchedule')}
                  </button>
               </div>
            )}
         </div>
      </motion.div>
   );
}