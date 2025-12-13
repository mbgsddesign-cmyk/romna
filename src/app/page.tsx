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
    title: "System Idle",
    description: "Listening for commands.",
    state: "Idle",
    ai_priority: 0,
    ai_reason: "Nothing requires action. I'm listening."
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
                     <button className="relative w-full h-20 rounded-[24px] bg-volt text-black font-bold text-xl font-space tracking-wide overflow-hidden group/btn hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_30px_rgba(217,253,0,0.15)]">
                        <span className="relative z-10 flex items-center justify-center gap-3">
                          <span className="material-symbols-outlined text-[28px]">play_circle</span>
                          EXECUTE
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 rounded-[24px]"></div>
                     </button>
                     <p className="text-center text-[10px] text-white/30 font-space tracking-widest uppercase mt-2">
                       This will perform the action now
                     </p>
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