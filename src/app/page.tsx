'use client';

import { useAutoGLMDecision } from '@/contexts/autoglm-decision-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { BottomNav } from '@/components/bottom-nav';
import { motion, AnimatePresence } from 'framer-motion';

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
  const { decision } = useAutoGLMDecision();
  const { user } = useAuth();
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [tomorrowTasks, setTomorrowTasks] = useState<Task[]>([]);
  const [showExecute, setShowExecute] = useState(false);

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
  }, [user?.id]);

  const activeTask = decision?.active_task;
  const hasActiveTask = !!activeTask;

  // Zen Mode Logic: If no active task, show "Focus" prompt
  const displayTask = hasActiveTask ? activeTask : {
    title: "Ready to Focus?",
    description: "Tap the voice button to start your session.",
    state: "Idle",
    ai_priority: 0,
    ai_reason: "Awaiting your command."
  };

  const calendarEvents = [...todayTasks.slice(0, 2), ...tomorrowTasks.slice(0, 2)];

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-void pb-24 font-sans selection:bg-volt selection:text-black">
      {/* 1. Header: Invisible Watermark */}
      <header className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-center opacity-50">
        <h1 className="text-sm font-bold tracking-[0.2em] text-white/30 font-space uppercase">
          ROMNA
        </h1>
        <div className="h-2 w-2 rounded-full bg-volt/50 animate-pulse"></div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-0">
        
        {/* 2. Center Stage: Active Decision Card */}
        <div className="relative w-full max-w-md aspect-[3/4] max-h-[65vh] rounded-hyper bg-obsidian border border-white/5 shadow-2xl shadow-black/50 overflow-hidden flex flex-col animate-breathe group">
          
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

          {/* 3. The Action: Massive Execute Slide-Button */}
          <div className="p-4 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-3">
             {hasActiveTask ? (
               <AnimatePresence>
                 {showExecute && (
                   <motion.div
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 20 }}
                     className="w-full flex flex-col gap-2"
                   >
                     <p className="text-center text-xs text-white/40 font-space tracking-widest uppercase mb-1">
                       When you&apos;re ready.
                     </p>
                     <button className="relative w-full h-20 rounded-[24px] bg-volt text-black font-bold text-xl font-space tracking-wide overflow-hidden group/btn hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_30px_rgba(217,253,0,0.15)]">
                        <span className="relative z-10 flex items-center justify-center gap-3">
                          <span className="material-symbols-outlined text-[28px]">play_circle</span>
                          EXECUTE
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 rounded-[24px]"></div>
                     </button>
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

        {/* 4. Context: Subtle Timeline Strip */}
        <div className="mt-10 w-full max-w-md flex items-center justify-center gap-6 opacity-60">
           {calendarEvents.length > 0 ? (
             calendarEvents.map((task, i) => (
                <div key={task.id} className="flex flex-col items-center gap-2 group/event cursor-default">
                   <div className={`w-2 h-2 rounded-full transition-all duration-300 ${i === 0 ? 'bg-white shadow-[0_0_10px_white]' : 'bg-white/20'}`}></div>
                   <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium opacity-0 group-hover/event:opacity-100 transition-opacity absolute translate-y-4">
                      {format(parseISO(task.due_date!), 'h:mm a')}
                   </span>
                </div>
             ))
           ) : (
              <span className="text-[10px] text-gray-600 uppercase tracking-widest">No upcoming events</span>
           )}
           {/* Timeline Line */}
           <div className="absolute w-32 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent -z-10"></div>
        </div>

      </main>

      <BottomNav />
    </div>
  );
}