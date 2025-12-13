'use client';

import { BottomNav } from '@/components/bottom-nav';
import { useTranslation } from '@/hooks/use-translation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

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
  error_message?: string;
}

interface ExecutionCardProps {
  plan: ExecutionPlan;
  index: number;
  onApprove: () => void;
  onCancel: () => void;
  loading: boolean;
}

export default function NotificationsPage() {
  const { locale } = useTranslation();
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
      const response = await fetch(`/api/execution/plans?userId=${user.id}`, { cache: 'no-store' });
      if (!response.ok) { setPlans([]); return; }
      const data = await response.json();
      if (data.success && data.plans) setPlans(data.plans);
      else setPlans([]);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    const channel = supabase.channel('execution_plans_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'execution_plans' }, () => fetchPlans())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
      if (response.ok) await fetchPlans();
    } catch (error) { console.error(error); } finally { setActionLoading(null); }
  };

  const handleCancel = async (planId: string) => {
    if (actionLoading) return;
    setActionLoading(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('execution_plans').update({ status: 'cancelled' }).eq('id', planId).eq('user_id', user.id);
      await fetchPlans();
    } catch (error) { console.error(error); } finally { setActionLoading(null); }
  };

  // Group plans
  const waitingApproval = plans.filter(p => p.status === 'waiting_approval');
  const scheduled = plans.filter(p => p.status === 'scheduled');
  const activePlans = [...waitingApproval, ...scheduled];

  return (
    <div className="relative min-h-screen w-full bg-void pb-32 overflow-hidden flex flex-col font-sans selection:bg-volt selection:text-black">
      
      <header className="px-6 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-white font-space tracking-tight">
           Inbox
           <span className="text-volt text-3xl ml-1">.</span>
        </h1>
        <p className="text-white/40 text-xs font-medium uppercase tracking-widest mt-1">Action Center</p>
      </header>

      <main className="flex-1 px-4 flex flex-col items-center">
        {loading ? (
           <div className="mt-20 w-8 h-8 rounded-full border-2 border-volt/20 border-t-volt animate-spin"></div>
        ) : activePlans.length === 0 ? (
           <div className="mt-32 flex flex-col items-center text-center opacity-40">
              <div className="w-16 h-1 bg-white/10 rounded-full mb-4"></div>
              <p className="text-white/50 font-space text-lg">
                {locale === 'ar' ? 'لا شيء يحتاجك الآن.' : 'All quiet now.'}
              </p>
              <p className="text-white/20 text-xs mt-2">Nothing requires your attention.</p>
           </div>
        ) : (
           <div className="w-full max-w-md space-y-4 mt-4">
              <AnimatePresence>
                 {activePlans.map((plan, index) => (
                    <ExecutionCard 
                       key={plan.id} 
                       plan={plan} 
                       index={index}
                       onApprove={() => handleApprove(plan.id)}
                       onCancel={() => handleCancel(plan.id)}
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
  const isApproval = plan.status === 'waiting_approval';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.1 }}
      className={`relative w-full rounded-2xl overflow-hidden border transition-all duration-300 ${
         isApproval 
           ? 'bg-obsidian border-volt/30 shadow-[0_0_20px_rgba(217,253,0,0.05)]' 
           : 'bg-white/5 border-white/5 opacity-80'
      }`}
    >
       <div className="p-5 flex flex-col gap-4">
          <div className="flex justify-between items-start">
             <div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md mb-2 inline-block ${
                   isApproval ? 'bg-volt text-black' : 'bg-white/10 text-white/60'
                }`}>
                   {isApproval ? 'Approval Required' : 'Scheduled'}
                </span>
                <h3 className="text-white font-medium text-lg leading-tight mt-1">
                   {plan.payload?.title || plan.payload?.subject || 'Unnamed Action'}
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
             <span>{format(new Date(plan.scheduled_for), 'MMM d, h:mm a')}</span>
             <span>•</span>
             <span className="capitalize">{plan.intent_type}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
             {isApproval && (
                <button 
                   disabled={loading}
                   onClick={onApprove}
                   className="flex-1 h-10 rounded-xl bg-volt text-black text-sm font-bold tracking-wide hover:bg-[#c2e200] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                   {loading ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span> : 'APPROVE'}
                </button>
             )}
             <button 
                disabled={loading}
                onClick={onCancel}
                className={`h-10 px-4 rounded-xl border border-white/10 text-white/60 text-xs font-medium hover:bg-white/5 active:scale-95 transition-all ${!isApproval && 'flex-1'}`}
             >
                {isApproval ? 'Dismiss' : 'Cancel'}
             </button>
          </div>
       </div>
    </motion.div>
  );
}