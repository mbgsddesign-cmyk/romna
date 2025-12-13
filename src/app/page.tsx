'use client';

import { useAutoGLMDecision } from '@/contexts/autoglm-decision-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { format, isToday, isTomorrow, parseISO, addMinutes, addHours, addDays, startOfTomorrow } from 'date-fns';
import { BottomNav } from '@/components/bottom-nav';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { toast } from 'sonner'; // Assuming sonner is installed/used

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  tags?: string[];
  due_date?: string;
  estimated_duration?: number;
}

export default function HomePage() {
  const { decision, refetch } = useAutoGLMDecision();
  const { user, session } = useAuth();
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [tomorrowTasks, setTomorrowTasks] = useState<Task[]>([]);
  const [showExecute, setShowExecute] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSnoozing, setIsSnoozing] = useState(false);

  useEffect(() => {
    if (decision?.active_task) {
       const timer = setTimeout(() => setShowExecute(true), 500); // 500ms delay
       return () => clearTimeout(timer);
    } else {
       setShowExecute(false);
    }
  }, [decision?.active_task]);

  useEffect(() => {
    if (!user?.id) return;

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const fetchTasks = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'active'])
        .gte('due_date', today)
        .lte('due_date', tomorrow + 'T23:59:59')
        .order('due_date', { ascending: true })
        .limit(4);

      if (data) {
        setTodayTasks(data.filter(t => t.due_date && isToday(parseISO(t.due_date))));
        setTomorrowTasks(data.filter(t => t.due_date && isTomorrow(parseISO(t.due_date))));
      }
    };

    fetchTasks();
  }, [user?.id, decision]);

  const activeTask = decision?.active_task;
  const hasActiveTask = !!activeTask;

  // Zen Mode Logic: If no active task, show "Focus" prompt
  const displayTask = hasActiveTask ? activeTask : {
    title: "System Idle",
    description: "Listening for commands.",
    state: "Idle",
    ai_priority: 0,
    ai_reason: "Nothing requires action. I'm listening."
  };

  // Execution Handlers
  const handleExecute = async () => {
    if (!activeTask || isExecuting) return;
    setIsExecuting(true);

    try {
      const isTaskUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeTask.id);

      if (isTaskUUID) {
        // Mark existing task as done
        const { error } = await supabase
          .from('tasks')
          .update({ status: 'done' })
          .eq('id', activeTask.id);
        
        if (error) throw error;
      } else {
        // Create execution plan for abstract directive
        const res = await fetch('/api/actions/plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            intent: decision?.primary_action?.includes('reminder') ? 'reminder' : 'task',
            payload: {
              title: activeTask.title,
              description: activeTask.ai_reason,
            },
            source: 'button',
          }),
        });

        if (!res.ok) throw new Error('Execution planning failed');
      }

      // Optimistic / Immediate Update
      setShowExecute(false);
      await refetch();
      
    } catch (error) {
      console.error('Execution failed:', error);
      // Silent fail as per requirements
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSnooze = async (minutes: number = 15) => {
    if (!activeTask || isSnoozing) return;
    setIsSnoozing(true);

    try {
      const newTime = addMinutes(new Date(), minutes).toISOString();
      const isTaskUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeTask.id);

      if (isTaskUUID) {
        await supabase
          .from('tasks')
          .update({ due_date: newTime })
          .eq('id', activeTask.id);
      } else {
        // For non-DB tasks, we can't easily snooze persistence without creating it first.
        // Assuming primarily DB tasks for now as per prompt context of "System Surface".
        // If it's a suggestion, we skip.
      }
      
      await refetch();
    } catch (error) {
      console.error('Snooze failed:', error);
    } finally {
      setIsSnoozing(false);
    }
  };

  const handleAdjust = async (newDate?: Date, newPriority?: number) => {
    if (!activeTask) return;
    
    try {
      const isTaskUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeTask.id);
      if (isTaskUUID) {
        const updates: any = {};
        if (newDate) updates.due_date = newDate.toISOString();
        if (newPriority !== undefined) updates.priority = newPriority > 50 ? 'high' : 'medium'; // Simplistic mapping

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('tasks')
            .update(updates)
            .eq('id', activeTask.id);
          
          await refetch();
        }
      }
    } catch (error) {
      console.error('Adjust failed:', error);
    }
  };

  // Mock Timeline Data (Real data would come from execution logs)
  const timelineItems = [
    { type: 'past', label: 'Reminder sent', icon: 'check' },
    { type: 'current', label: hasActiveTask ? 'Active Directive' : 'Listening', icon: 'notifications_active' },
    { type: 'future', label: tomorrowTasks[0]?.title || 'Email follow-up', icon: 'schedule' }
  ];

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-void pb-24 font-sans selection:bg-volt selection:text-black">
      {/* 1. Header: Date Awareness */}
      <header className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-center opacity-60">
        <h1 className="text-sm font-bold tracking-[0.2em] text-white/30 font-space uppercase">
          ROMNA
        </h1>
        <div className="text-xs font-mono text-white/40 tracking-wide">
          {format(new Date(), 'EEEE · MMM d')}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-0">
        
        {/* 2. Center Stage: Active Decision Card */}
        <div className="relative w-full max-w-md aspect-[3/4] max-h-[60vh] rounded-hyper bg-obsidian border border-white/5 shadow-2xl shadow-black/50 overflow-hidden flex flex-col animate-breathe group">
          
          {/* Ambient Glow */}
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(217,253,0,0.03)_0%,transparent_50%)] pointer-events-none group-hover:opacity-100 transition-opacity duration-1000"></div>

          {/* Card Content */}
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center z-10">
            {hasActiveTask && (
               <div className="mb-6 px-3 py-1 rounded-full border border-volt/20 bg-volt/5 text-volt text-[10px] font-bold tracking-widest uppercase font-space animate-pulse">
                 Current Directive
               </div>
            )}
            
            <h2 className="text-4xl md:text-5xl font-bold text-white leading-[1.1] mb-6 font-space tracking-tight">
              {displayTask.title}
            </h2>
            
            {displayTask.ai_reason && (
              <p className="text-sm text-gray-400 max-w-[260px] leading-relaxed font-light">
                {displayTask.ai_reason}
              </p>
            )}
          </div>

          {/* 3. The Action: Massive Execute Slide-Button + Controls */}
          <div className="p-4 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-3">
             {hasActiveTask ? (
               <AnimatePresence>
                 {showExecute && (
                   <motion.div
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 20 }}
                     className="w-full flex flex-col gap-3"
                   >
                     {/* Primary Execute */}
                     <button 
                        onClick={handleExecute}
                        disabled={isExecuting}
                        className="relative w-full h-16 rounded-[20px] bg-volt text-black font-bold text-lg font-space tracking-wide overflow-hidden group/btn hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_30px_rgba(217,253,0,0.15)] disabled:opacity-70 disabled:pointer-events-none"
                     >
                        <span className="relative z-10 flex items-center justify-center gap-3">
                          {isExecuting ? (
                            <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                          ) : (
                            <span className="material-symbols-outlined text-[24px]">play_circle</span>
                          )}
                          {isExecuting ? 'EXECUTING...' : 'EXECUTE'}
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 rounded-[20px]"></div>
                     </button>
                     
                     {/* Secondary Controls: Snooze & Adjust */}
                     <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => handleSnooze(15)}
                          disabled={isSnoozing}
                          className="h-12 rounded-[16px] bg-white/5 border border-white/10 text-white/70 font-space text-xs font-bold uppercase tracking-widest hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                           <span className="material-symbols-outlined text-[16px]">snooze</span>
                           +15m
                        </button>
                        
                        <Drawer>
                          <DrawerTrigger asChild>
                            <button className="h-12 rounded-[16px] bg-white/5 border border-white/10 text-white/70 font-space text-xs font-bold uppercase tracking-widest hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                               <span className="material-symbols-outlined text-[16px]">tune</span>
                               Adjust
                            </button>
                          </DrawerTrigger>
                          <DrawerContent className="bg-obsidian border-t border-white/10">
                             <div className="p-6 pb-12">
                                <DrawerHeader className="mb-6 p-0 text-left">
                                   <DrawerTitle className="text-white font-space text-xl">Adjust Directive</DrawerTitle>
                                </DrawerHeader>
                                
                                <div className="space-y-6">
                                   {/* Quick Time Adjust */}
                                   <div className="space-y-3">
                                      <label className="text-xs text-white/40 font-bold uppercase tracking-widest">Reschedule</label>
                                      <div className="grid grid-cols-3 gap-3">
                                         <button onClick={() => handleSnooze(60)} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10">
                                            +1 Hour
                                         </button>
                                         <button onClick={() => handleSnooze(180)} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10">
                                            +3 Hours
                                         </button>
                                         <button onClick={() => handleAdjust(addHours(startOfTomorrow(), 9))} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10">
                                            Tomorrow
                                         </button>
                                      </div>
                                   </div>

                                   {/* Priority Adjust */}
                                   <div className="space-y-3">
                                      <label className="text-xs text-white/40 font-bold uppercase tracking-widest">Priority</label>
                                      <div className="grid grid-cols-2 gap-3">
                                         <button onClick={() => handleAdjust(undefined, 100)} className={`p-3 rounded-xl border text-sm font-bold ${activeTask.ai_priority > 50 ? 'bg-volt text-black border-volt' : 'bg-white/5 border-white/10 text-white'}`}>
                                            High Priority
                                         </button>
                                         <button onClick={() => handleAdjust(undefined, 10)} className={`p-3 rounded-xl border text-sm font-bold ${activeTask.ai_priority <= 50 ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white'}`}>
                                            Normal
                                         </button>
                                      </div>
                                   </div>
                                </div>

                                <DrawerFooter className="mt-8 p-0">
                                  <DrawerClose asChild>
                                    <button className="w-full py-4 rounded-xl bg-white/5 text-white/60 font-space text-sm font-bold uppercase tracking-widest hover:text-white">
                                      Close
                                    </button>
                                  </DrawerClose>
                                </DrawerFooter>
                             </div>
                          </DrawerContent>
                        </Drawer>
                     </div>

                   </motion.div>
                 )}
               </AnimatePresence>
             ) : (
                <div className="w-full h-20 flex items-center justify-center text-gray-500 text-sm font-space tracking-widest uppercase opacity-50">
                   System Idle
                </div>
             )}
          </div>
        </div>

        {/* 4. Timeline Strip */}
        <div className="mt-8 w-full max-w-md">
           <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
              {timelineItems.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <TimelineItem 
                    icon={item.icon} 
                    label={item.label} 
                    status={item.type as 'past' | 'current' | 'future'} 
                  />
                  {index < timelineItems.length - 1 && <div className="w-px h-8 bg-white/10"></div>}
                </div>
              ))}
           </div>
           
           {/* Achievements Line */}
           <div className="mt-4 text-center">
             <p className="text-[10px] text-white/20 font-space uppercase tracking-[0.2em]">
               3 actions handled today
             </p>
           </div>
        </div>

      </main>

      <BottomNav />
    </div>
  );
}

function TimelineItem({ icon, label, status }: { icon: string; label: string; status: 'past' | 'current' | 'future' }) {
  const isCurrent = status === 'current';
  const isPast = status === 'past';
  
  return (
    <div className={`flex flex-col items-center gap-1 ${status === 'future' ? 'opacity-30' : ''}`}>
      <span className={`material-symbols-outlined text-[16px] ${isCurrent ? 'text-volt animate-pulse' : isPast ? 'text-white' : 'text-white/50'}`}>
        {icon}
      </span>
      <span className="text-[9px] text-white/60 font-medium tracking-wide uppercase max-w-[80px] text-center truncate">
        {label}
      </span>
    </div>
  );
}