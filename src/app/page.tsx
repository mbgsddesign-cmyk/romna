'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, addDays, addHours, startOfTomorrow } from 'date-fns';
import { StorageAdapter } from '@/lib/storage-adapter';
import { HowRomnaWorks } from '@/components/how-it-works';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { useAppState } from '@/contexts/app-state-context';
import { useAppStore } from '@/lib/store';

interface Task {
  id: string;
  title: string;
  due_date?: string;
  status: string;
  priority?: string;
  [key: string]: any;
}

import { useTranslation } from '@/hooks/use-translation';
import { DecisionEngine } from '@/lib/decision-engine';
import { supabase } from '@/lib/supabase';
import { EmailDraftCard } from '@/components/cards/email-draft-card'; // [NEW]

export default function HomePage() {
  const { t } = useTranslation();
  const { user, userId, isLocal } = useAuth();
  const { state: appState, transitionTo } = useAppState();
  const router = useRouter();

  // State
  const [activeTask, setActiveTask] = useState<any>(null);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [tomorrowTasks, setTomorrowTasks] = useState<any[]>([]);
  const [inboxCount, setInboxCount] = useState(0); // Added for consistency check
  const [stats, setStats] = useState<{ completedToday: number, upNext: Task | null }>({ completedToday: 0, upNext: null });
  const [isLoading, setIsLoading] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSnoozing, setIsSnoozing] = useState(false);

  // Global Signal
  const refreshTick = useAppStore(state => state.refreshTick);

  // Load Content
  // Load Content
  useEffect(() => {
    // Determine user ID to use (Auth or Local)
    const currentUserId = userId; // Unified ID from Context

    if (!currentUserId && !isLocal) return; // Wait for ID

    const loadData = async () => {
      try {
        setIsLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

        // Fetch Tasks (Depends on Pulse)
        const tasksData = await StorageAdapter.getTasks(
          currentUserId!,
          isLocal,
          today,
          tomorrow + 'T23:59:59'
        );

        // Fetch Pending Plans (Inbox) - Server execution only for now
        const plansData = await StorageAdapter.getPendingPlans(currentUserId!, isLocal);
        setInboxCount(plansData.length || 0);

        setTodayTasks(tasksData.filter((t: any) => t.due_date?.startsWith(today)));
        setTomorrowTasks(tasksData.filter((t: any) => t.due_date?.startsWith(tomorrow)));

        // --- SILENT DECISION ENGINE ---
        // Dynamically decide what is most important right now
        const decision = DecisionEngine.decide(tasksData, plansData);

        if (decision.type !== 'empty') {
          setActiveTask({
            ...decision.originalItem,
            title: decision.title,
            ai_reason: decision.reason,
            intent_type: decision.type === 'plan' ? decision.originalItem.intent_type : 'task',
            ai_priority: decision.priority,
            isPlan: decision.type === 'plan'
          });
          transitionTo('active_decision');
        } else {
          setActiveTask(null);
          // Only switch to idle if not first launch
          if (appState !== 'first_launch') {
            transitionTo('idle_ready');
          }
        }

        // NEW: Fetch Stats
        const statsData = await StorageAdapter.getStats(currentUserId!, isLocal);
        setStats(statsData);

      } catch (e) {
        console.error("Home Load Error", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userId, isLocal, refreshTick]); // Pulse Dependent

  // Actions
  const handleExecute = async () => {
    if (!activeTask || isExecuting) return;
    setIsExecuting(true);

    try {
      // Optimistic Update
      const taskToComplete = activeTask;
      setActiveTask(null);
      transitionTo('idle_ready');

      // Calculate optimistic stats
      setStats(prev => ({ ...prev, completedToday: prev.completedToday + 1 }));

      if (taskToComplete.isPlan) {
        // EXECUTE PLAN (Approval)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No session");

        const response = await fetch('/api/actions/approve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ planId: taskToComplete.id, action: 'approve' }),
        });

        if (response.ok) {
          toast.success("Action Approved & Executed");
        } else {
          throw new Error("Approval failed");
        }

      } else {
        // COMPLETE TASK
        if (isLocal) {
          if (taskToComplete.id && !taskToComplete.id.includes('temp')) {
            await StorageAdapter.updateTask(taskToComplete.id, true, { status: 'done', updated_at: new Date().toISOString() });
            useAppStore.getState().triggerRefresh();
          } else {
            // Create new (if it was a suggestion)
            const newTask = {
              title: taskToComplete.title,
              description: taskToComplete.ai_reason,
              status: 'done',
              priority: 'medium',
              created_at: new Date().toISOString()
            };
            await StorageAdapter.createTask(userId!, true, newTask);
            useAppStore.getState().triggerRefresh();
          }
          toast.success("Task completed");
        } else {
          // Authenticated User: Call API
          if (taskToComplete.id) {
            await StorageAdapter.updateTask(taskToComplete.id, false, { status: 'done' });
            useAppStore.getState().triggerRefresh();
            toast.success("Task completed");
          }
        }
      }
    } catch (error) {
      console.error("Execution failed", error);
      toast.error("Execution failed");
      // Revert optimistic update ideally, but simpler to just reload for now or let stats correct on next load
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSnooze = async (minutes: number = 60) => {
    if (!activeTask || isSnoozing) return;
    setIsSnoozing(true);

    try {
      const newTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      setActiveTask(null); // Clear immediate UI
      transitionTo('idle_ready');

      if (activeTask.isPlan) {
        // Handle Plan Snooze (Ghost Card)
        await StorageAdapter.updatePlan(activeTask.id, isLocal, {
          skip_until: newTime
        });
        toast.success(`Snoozed for ${minutes}m`);
      } else if (isLocal && userId) {
        if (activeTask.id && !activeTask.id.includes('temp')) {
          await StorageAdapter.updateTask(activeTask.id, true, { due_date: newTime, status: 'pending' });
        } else {
          await StorageAdapter.createTask(userId, true, {
            title: activeTask.title,
            status: 'pending',
            due_date: newTime,
            priority: 'medium'
          });
        }
        toast.success(`Snoozed for ${minutes}m`);
      } else if (userId && activeTask.id) {
        await StorageAdapter.updateTask(activeTask.id, false, { due_date: newTime });
        toast.success(`Snoozed`);
      }
    } catch (e) {
      console.error("Snooze failed", e);
    } finally {
      setIsSnoozing(false);
      useAppStore.getState().triggerRefresh();
    }
  };

  const handleReject = async () => {
    if (!activeTask) return;

    // Optimistic remove
    setActiveTask(null);
    transitionTo('idle_ready');

    try {
      if (activeTask.isPlan) {
        await fetch('/api/actions/approve', {
          method: 'POST',
          body: JSON.stringify({ planId: activeTask.id, action: 'reject' })
        });
        toast.info("Plan rejected");
      } else {
        // Delete Task
        if (activeTask.id) {
          await StorageAdapter.deleteTask(activeTask.id, isLocal);
          toast.info("Task deleted");
        }
      }
    } catch (e) {
      console.error("Reject failed", e);
    } finally {
      useAppStore.getState().triggerRefresh();
    }
  };

  const handleAdjust = async (newDate?: Date, newPriority?: number) => {
    // Placeholder for adjust logic if needed
    toast.info("Adjustment saved");
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 relative overflow-x-hidden">
      {/* Background Ambient */}
      <div className="absolute top-[-20%] left-1/2 transform -translate-x-1/2 w-[600px] h-[600px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md flex flex-col items-center z-10 space-y-8">

        {/* 1. Header / Question */}
        <header className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both">
          <p className="text-white/40 font-mono text-xs tracking-[0.2em] uppercase min-h-[1em]">
            {isLoading ? '' : format(new Date(), 'EEEE, MMMM d')}
          </p>
          <h1 className="text-3xl font-bold font-space tracking-tight">
            {activeTask ? t('currentDirective') : t('imListening')}
          </h1>
        </header>

        {/* 2. The Active Card */}
        <div className="w-full relative min-h-[300px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {activeTask ? (
              <motion.div
                key="active"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="w-full"
              >
                {/* [V5] Email Draft Card */}
                {activeTask.intent_type === 'email' ? (
                  <EmailDraftCard
                    plan={activeTask}
                    onApprove={async (id, payload) => {
                      // If payload updated (edited), we might need to update plan first or pass payload to approve API
                      // For now, let's assume we update plan locally or pass payload in approve body?
                      // Let's pass payload in body to /api/actions/approve if supported, or updatePlan then approve.
                      setIsExecuting(true);
                      try {
                        if (payload) {
                          await StorageAdapter.updatePlan(id, isLocal, { payload: payload });
                        }
                        await handleExecute(); // Re-use main execute logic which calls approve
                      } finally {
                        setIsExecuting(false);
                      }
                    }}
                    onReject={handleReject}
                    isExecuting={isExecuting}
                  />
                ) : (
                  <div className="bg-[#111] border border-white/10 rounded-[32px] p-8 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-volt to-transparent opacity-50" />

                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                          <span className="material-symbols-outlined text-white/80">
                            {activeTask.intent_type === 'email' ? 'mail' :
                              activeTask.intent_type === 'whatsapp' ? 'chat' : 'radio_button_checked'}
                          </span>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-volt/10 border border-volt/20 text-volt text-xs font-bold uppercase tracking-wider">
                          {t('dueSoon')}
                        </div>
                      </div>

                      <div>
                        <h2 className="text-2xl font-bold font-space leading-tight mb-2 text-white/90">
                          {activeTask.title}
                        </h2>
                        <p className="text-white/50 text-base leading-relaxed">
                          {activeTask.ai_reason}
                        </p>
                      </div>

                      <div className="pt-4 flex gap-3">
                        <button
                          onClick={handleExecute}
                          disabled={isExecuting}
                          className="flex-1 bg-volt text-black h-14 rounded-2xl font-bold font-space text-lg tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(217,253,0,0.1)] disabled:opacity-50"
                        >
                          {isExecuting ? t('executing') : t('execute')}
                        </button>

                        <div className="w-full text-center mt-2">
                          <span className="text-white/20 text-[10px] uppercase tracking-widest">{t('whenYoureReady')}</span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSnooze(60)}
                            className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                          >
                            <span className="material-symbols-outlined">update</span>
                          </button>

                          <button
                            onClick={handleReject}
                            className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30 transition-colors"
                          >
                            <span className="material-symbols-outlined">close</span>
                          </button>

                          <Drawer>
                            <DrawerTrigger asChild>
                              <button className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-colors">
                                <span className="material-symbols-outlined">tune</span>
                              </button>
                            </DrawerTrigger>
                            <DrawerContent className="bg-[#111] border-t border-white/10 text-white">
                              <DrawerHeader>
                                <DrawerTitle>Adjust Task</DrawerTitle>
                              </DrawerHeader>
                              <div className="p-4 space-y-4">
                                <p className="text-sm text-white/50">{t('rescheduleFor')}</p>
                                <div className="grid grid-cols-3 gap-3">
                                  <button onClick={() => handleSnooze(180)} className="p-3 bg-white/5 rounded-xl border border-white/10 text-sm hover:bg-white/10">{t('plus3Hours')}</button>
                                  <button onClick={() => handleSnooze(24 * 60)} className="p-3 bg-white/5 rounded-xl border border-white/10 text-sm hover:bg-white/10">{t('tomorrow')}</button>
                                  <button onClick={() => handleSnooze(48 * 60)} className="p-3 bg-white/5 rounded-xl border border-white/10 text-sm hover:bg-white/10">{t('twoDays')}</button>
                                </div>
                              </div>
                              <DrawerFooter>
                                <DrawerClose asChild>
                                  <button className="w-full py-3 bg-white/5 rounded-xl text-sm font-bold">{t('cancel')}</button>
                                </DrawerClose>
                              </DrawerFooter>
                            </DrawerContent>
                          </Drawer>
                        </div>
                      </div>
                    </div>
                  </div>

                )}
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-transparent w-full text-center flex flex-col items-center justify-center gap-6 min-h-[300px]"
              >
                {/* Pulse Mic */}
                <div className="relative">
                  <div className="absolute inset-0 bg-volt/5 rounded-full animate-ping opacity-20" />
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md relative z-10 shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                    <span className="material-symbols-outlined text-white/40 text-3xl">check_circle</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-medium font-space text-white/80 tracking-tight">
                    {inboxCount > 0 ? t('inboxWaiting') :
                      todayTasks.length > 0 ? t('tasksPending') :
                        t('allClear')}
                  </h2>
                  <p className="text-white/30 text-xs tracking-widest uppercase font-mono">
                    {inboxCount > 0 ? t('inboxWaitingDesc') :
                      todayTasks.length > 0 ? t('tasksPendingDesc') :
                        t('allClearDesc')}
                  </p>
                </div>

                <button
                  onClick={() => router.push('/voice')}
                  className="text-white/20 text-xs hover:text-white/60 transition-colors mt-4 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[14px]">mic</span>
                  {t('tapToSpeak')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. Value Expansion: Progress & Upcoming */}
        {!activeTask && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full grid grid-cols-2 gap-4"
          >
            {/* Progress Card */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <span className="text-volt font-bold font-mono text-2xl">{stats.completedToday}</span>
              <span className="text-white/30 text-xs font-mono uppercase tracking-wider mt-1">{t('completedToday')}</span>
            </div>

            {/* Up Next Card */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col justify-center text-left relative overflow-hidden">
              <span className="text-white/30 text-[10px] font-mono uppercase tracking-wider mb-1">{t('upNext')}</span>
              {stats.upNext ? (
                <>
                  <p className="text-white/80 font-bold text-sm truncate leading-tight">{stats.upNext.title}</p>
                  <p className="text-white/40 text-xs mt-1">
                    {stats.upNext.due_date ? format(new Date(stats.upNext.due_date), 'h:mm a') : t('tomorrow')}
                  </p>
                </>
              ) : (
                <p className="text-white/40 text-xs italic">{t('nothingScheduled')}</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Calendar Strip (Optional / Minimized) */}
        <div className="w-full pt-4 border-t border-white/5">
          <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-none">
            {[...todayTasks, ...tomorrowTasks].slice(0, 5).map((t, i) => (
              <div key={i} className="flex-shrink-0 w-24 p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1">
                <div className="text-[10px] text-white/40 font-mono">
                  {t.due_date ? format(new Date(t.due_date), 'h:mm a') : 'Anytime'}
                </div>
                <div className="text-xs font-bold truncate text-white/80">
                  {t.title}
                </div>
              </div>
            ))}
            {todayTasks.length + tomorrowTasks.length === 0 && (
              <div className="text-center w-full text-white/20 text-xs py-2">
                {t('fullScheduleEmpty')}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* How It Works Guide */}
      <HowRomnaWorks open={showHowItWorks} onOpenChange={setShowHowItWorks} />

      <div className="absolute bottom-24 w-full text-center pointer-events-none opacity-30">
        <p className="text-[10px] font-space tracking-[0.3em] uppercase text-white/50">{t('philosophy')}</p>
      </div>

    </main >
  );
}