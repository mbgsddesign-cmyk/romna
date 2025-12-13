'use client';

import { useAutoGLMDecision } from '@/contexts/autoglm-decision-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { BottomNav } from '@/components/bottom-nav';

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
  const { decision, loading: decisionLoading } = useAutoGLMDecision();
  const { user } = useAuth();
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [tomorrowTasks, setTomorrowTasks] = useState<Task[]>([]);

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

  const calendarEvents = [...todayTasks.slice(0, 2), ...tomorrowTasks.slice(0, 2)];

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden pb-24" style={{ background: '#09140f' }}>
      <header className="pt-12 pb-2 px-6 flex flex-col items-start justify-end z-10">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-0.5">
          ROMNA
          <span className="inline-block w-2 h-2 ml-1 rounded-full mb-1" style={{ backgroundColor: '#f9f506', boxShadow: '0 0 15px rgba(249, 245, 6, 0.15)' }}></span>
        </h1>
        <p className="text-gray-400 text-sm font-light tracking-wide opacity-80 uppercase">AI Decision Center</p>
      </header>

      <main className="flex-1 px-4 space-y-6 overflow-y-auto no-scrollbar pb-10">
        {hasActiveTask && (
          <div className="group relative w-full rounded-[2.5rem] p-1 transition-transform duration-300 active:scale-[0.99]" style={{ 
            backgroundColor: '#121e18',
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div className="absolute inset-0 rounded-[2.5rem] pointer-events-none" style={{
              background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.1), transparent)'
            }}></div>
            
            <div className="relative flex flex-col h-full rounded-[2.2rem] p-6 overflow-hidden" style={{ backgroundColor: '#121e18' }}>
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(249, 245, 6, 0.05)' }}></div>
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-wider animate-pulse" style={{ color: '#f9f506' }}>NOW</span>
                  <div className="h-1.5 w-1.5 rounded-full" style={{ 
                    backgroundColor: '#f9f506',
                    boxShadow: '0 0 8px rgba(249, 245, 6, 0.8)' 
                  }}></div>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 font-medium border rounded-full px-3 py-1" style={{
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                }}>
                  <span>Focus Mode</span>
                </div>
              </div>

              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 rounded-full text-white ring-1" style={{
                    backgroundColor: '#1a2921',
                    ringColor: 'rgba(255, 255, 255, 0.1)'
                  }}>
                    <span className="material-symbols-outlined material-symbols-outlined-fill">notifications_active</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold leading-tight text-white mb-2">{activeTask.title}</h2>
                    <div className="flex flex-wrap gap-2">
                      {activeTask.ai_priority >= 80 && (
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-black" style={{
                          backgroundColor: 'rgba(249, 245, 6, 0.9)'
                        }}>
                          <span className="material-symbols-outlined text-[16px] font-bold">flag</span>
                          <span className="text-[10px] font-bold uppercase">High Priority</span>
                        </div>
                      )}
                      <div className="inline-flex items-center gap-1 border px-3 py-1 rounded-full text-gray-300" style={{
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)'
                      }}>
                        <span className="text-[10px] font-medium uppercase tracking-wide">{activeTask.state}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {activeTask.ai_reason && (
                  <div className="flex items-center gap-3 mt-1 pl-14">
                    <span className="material-symbols-outlined text-gray-500 text-[18px]">psychology</span>
                    <p className="text-sm text-gray-400 font-light">{activeTask.ai_reason}</p>
                  </div>
                )}
              </div>

              <div className="mt-auto space-y-4">
                <button className="relative w-full h-14 rounded-full flex items-center justify-center text-black font-bold text-lg tracking-wide overflow-hidden group/btn" style={{
                  backgroundColor: '#f9f506',
                  boxShadow: '0 0 20px rgba(249, 245, 6, 0.25)',
                  animation: 'pulse-ring 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}>
                  <div className="absolute inset-0 scale-x-0 group-hover/btn:scale-x-100 transition-transform duration-500 origin-left" style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.3)'
                  }}></div>
                  <span className="relative z-10 flex items-center gap-2">
                    <span className="material-symbols-outlined">play_arrow</span>
                    Execute
                  </span>
                </button>
                
                <div className="flex justify-center gap-8 opacity-80">
                  <button className="text-xs font-medium text-gray-400 hover:text-[#f9f506] transition-colors flex items-center gap-1.5 py-2 px-4 rounded-full hover:bg-white/5">
                    <span className="material-symbols-outlined text-[16px]">snooze</span>
                    Snooze
                  </button>
                  <button className="text-xs font-medium text-gray-400 hover:text-[#f9f506] transition-colors flex items-center gap-1.5 py-2 px-4 rounded-full hover:bg-white/5">
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    Adjust
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {hasActiveTask && calendarEvents.length > 0 && (
          <div className="border rounded-3xl p-5 space-y-3" style={{
            backgroundColor: '#121e18',
            borderColor: 'rgba(255, 255, 255, 0.05)'
          }}>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              Today &amp; Tomorrow
            </h3>
            <div className="space-y-2">
              {calendarEvents.slice(0, 2).map((task) => {
                const isRelated = task.id === activeTask?.id || (activeTask?.title && task.title.toLowerCase().includes(activeTask.title.toLowerCase()));
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-opacity"
                    style={{
                      backgroundColor: 'rgba(26, 41, 33, 0.3)',
                      borderColor: 'rgba(255, 255, 255, 0.05)',
                      opacity: isRelated ? 1 : 0.6
                    }}
                  >
                    <div className="w-1 h-10 rounded-full" style={{
                      backgroundColor: task.priority === 'high' ? '#f9f506' : 'rgba(255, 255, 255, 0.2)'
                    }}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-gray-500">{format(parseISO(task.due_date), 'h:mm a')}</p>
                      )}
                      {isRelated && (
                        <p className="text-[10px] text-[#f9f506] mt-0.5">Related to current focus</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!hasActiveTask && (
          <div className="border rounded-3xl p-8 text-center space-y-2" style={{
            backgroundColor: '#121e18',
            borderColor: 'rgba(255, 255, 255, 0.05)'
          }}>
            <span className="material-symbols-outlined text-4xl" style={{ color: 'rgba(249, 245, 6, 0.3)' }}>calendar_today</span>
            <p className="text-sm text-gray-500">Calendar activates when a decision exists.</p>
            <p className="text-sm text-gray-500" dir="rtl">يظهر الجدول عند وجود قرار نشط فقط.</p>
          </div>
        )}

        <div className="h-24"></div>
      </main>

      <button className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full border flex items-center justify-center group active:scale-90 transition-all duration-300" style={{
        backgroundColor: '#1a2921',
        borderColor: 'rgba(249, 245, 6, 0.2)',
        boxShadow: '0 0 15px rgba(249, 245, 6, 0.15)',
        color: '#f9f506'
      }}>
        <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: 'rgba(249, 245, 6, 0.05)' }}></span>
        <span className="material-symbols-outlined animate-rotate-slow group-hover:text-white transition-colors">smart_toy</span>
      </button>

      <BottomNav />
    </div>
  );
}