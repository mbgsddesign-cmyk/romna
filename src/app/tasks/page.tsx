'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore, Task, Priority } from '@/lib/store';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Plus, Check, Trash2, CheckSquare, Filter, X, ChevronDown, AlertCircle, Clock, Zap } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, isToday, isFuture, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SectionHeader, EmptyState, PriorityBadge } from '@/components/romna';
import { Card } from '@/components/ui/card';

type PriorityFilter = 'all' | Priority;

interface TaskWithAI extends Task {
  ai_priority?: string;
  energy_cost?: string;
  time_flexibility?: string;
  workflow_state?: string;
  ai_explanation?: string;
  warnings?: string[];
}

function TasksContent() {
  const { t, locale } = useTranslation();
  const searchParams = useSearchParams();
  const { tasks: zustandTasks, addTask, toggleTaskStatus, deleteTask } = useAppStore();
  const [aiTasks, setAiTasks] = useState<TaskWithAI[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', dueDate: '', priority: 'medium' as Priority });
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [loading, setLoading] = useState(true);
  const [showLater, setShowLater] = useState(false);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsSheetOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchAITasks();
  }, []);

  const fetchAITasks = async () => {
    try {
      const userId = '3a4bf508-5423-4f8c-87eb-8d9f63e20893';
      
      const res = await fetch(`/api/tasks?userId=${userId}`, { cache: 'no-store' });
      const data = await res.json();
      
      if (data.success) {
        setAiTasks(data.tasks || []);
        setInsights(data.insights);
      }
    } catch (error) {
      console.error('Failed to fetch AI tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = (taskList: TaskWithAI[]) => {
    if (priorityFilter === 'all') return taskList;
    return taskList.filter(task => task.priority === priorityFilter);
  };

  const groupedTasks = {
    inbox: filterTasks(aiTasks.filter(t => t.workflow_state === 'inbox')),
    planned: filterTasks(aiTasks.filter(t => t.workflow_state === 'planned')),
    suggested: filterTasks(aiTasks.filter(t => t.workflow_state === 'suggested')),
    auto_ready: filterTasks(aiTasks.filter(t => t.workflow_state === 'auto_ready')),
    completed: filterTasks(aiTasks.filter(t => t.workflow_state === 'completed')),
  };

  const handleAddTask = () => {
    if (newTask.title.trim()) {
      addTask({
        title: newTask.title,
        dueDate: newTask.dueDate || new Date().toISOString(),
        priority: newTask.priority,
        status: 'pending',
      });
      setNewTask({ title: '', dueDate: '', priority: 'medium' });
      setIsSheetOpen(false);
      setTimeout(fetchAITasks, 500);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
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
        <motion.header variants={itemVariants} className="pt-6 pb-4 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">{t('tasks')}</h1>
          <div className="flex items-center gap-2">
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}>
              <SelectTrigger className="w-auto h-9 rounded-xl border-0 bg-muted gap-2 px-3">
                <Filter className="w-4 h-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{locale === 'ar' ? 'الكل' : 'All'}</SelectItem>
                <SelectItem value="high">{t('high')}</SelectItem>
                <SelectItem value="medium">{t('medium')}</SelectItem>
                <SelectItem value="low">{t('low')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.header>

        {priorityFilter !== 'all' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4"
          >
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setPriorityFilter('all')}
              className="text-xs text-muted-foreground"
            >
              <X className="w-3 h-3 mr-1" />
              {locale === 'ar' ? 'مسح الفلتر' : 'Clear filter'}
            </Button>
          </motion.div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted/20 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {insights && (insights.overdue_count > 0 || insights.conflicts_count > 0) && (
              <motion.div variants={itemVariants} className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Attention needed</p>
                    {insights.overdue_count > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{insights.overdue_count} tasks are overdue</p>
                    )}
                    {insights.conflicts_count > 0 && (
                      <p className="text-xs text-muted-foreground">{insights.conflicts_count} scheduling conflicts detected</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {groupedTasks.inbox.length > 0 && (
              <motion.section variants={itemVariants} className="mb-6">
                <SectionHeader title="Inbox" subtitle="Needs your review" />
                <SwipeableTaskList tasks={groupedTasks.inbox} onToggle={toggleTaskStatus} onDelete={deleteTask} />
              </motion.section>
            )}

            <motion.section variants={itemVariants} className="mb-6">
              <SectionHeader title="Planned" subtitle="Scheduled tasks" />
              {groupedTasks.planned.length > 0 ? (
                <SwipeableTaskList tasks={groupedTasks.planned} onToggle={toggleTaskStatus} onDelete={deleteTask} showDate showAIHints />
              ) : (
                <EmptyState message="No planned tasks" icon={CheckSquare} />
              )}
            </motion.section>

            {groupedTasks.suggested.length > 0 && (
              <motion.section variants={itemVariants} className="mb-6">
                <SectionHeader title="Suggested" subtitle="AI recommendations" />
                <SwipeableTaskList tasks={groupedTasks.suggested} onToggle={toggleTaskStatus} onDelete={deleteTask} showDate showAIHints />
              </motion.section>
            )}

            {groupedTasks.auto_ready.length > 0 && (
              <motion.section variants={itemVariants} className="mb-6">
                <SectionHeader title="Ready for Automation" subtitle="High priority, fixed time" />
                <SwipeableTaskList tasks={groupedTasks.auto_ready} onToggle={toggleTaskStatus} onDelete={deleteTask} showDate showAIHints />
              </motion.section>
            )}

            {groupedTasks.completed.length > 0 && (
              <motion.section variants={itemVariants} className="mb-6">
                <div 
                  onClick={() => setShowLater(!showLater)}
                  className="flex items-center justify-between cursor-pointer mb-4"
                >
                  <h3 className="text-lg font-bold">{t('done')} ({groupedTasks.completed.length})</h3>
                  <ChevronDown className={cn(
                    "w-5 h-5 transition-transform",
                    showLater && "rotate-180"
                  )} />
                </div>
                {showLater && (
                  <SwipeableTaskList tasks={groupedTasks.completed.slice(0, 5)} onToggle={toggleTaskStatus} onDelete={deleteTask} />
                )}
              </motion.section>
            )}
          </>
        )}
      </motion.div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsSheetOpen(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg romna-glow-primary"
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[22px] pb-8">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-xl font-semibold">{t('newTask')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <Input
              placeholder={t('title')}
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
            <Input
              type="date"
              value={newTask.dueDate}
              onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
            />
            <Select
              value={newTask.priority}
              onValueChange={(value: Priority) => setNewTask({ ...newTask, priority: value })}
            >
              <SelectTrigger className="h-12 rounded-[12px]">
                <SelectValue placeholder={t('priority')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('low')}</SelectItem>
                <SelectItem value="medium">{t('medium')}</SelectItem>
                <SelectItem value="high">{t('high')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddTask} className="w-full" size="lg" variant="teal">
              {t('save')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<PageWrapper className="px-5"><div className="pt-6"><div className="h-8 w-24 bg-muted rounded animate-pulse" /></div></PageWrapper>}>
      <TasksContent />
    </Suspense>
  );
}

function SwipeableTaskItem({
  task,
  onToggle,
  onDelete,
  showDate,
  showAIHints,
}: {
  task: TaskWithAI;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  showDate?: boolean;
  showAIHints?: boolean;
}) {
  const x = useMotionValue(0);
  const background = useTransform(x, [-100, 0, 100], ['#22c55e', '#transparent', '#ef4444']);
  const leftOpacity = useTransform(x, [0, 60], [0, 1]);
  const rightOpacity = useTransform(x, [-60, 0], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 80) {
      onToggle(task.id);
    } else if (info.offset.x < -80) {
      onDelete(task.id);
    }
  };

  const getEnergyCostIcon = () => {
    switch (task.energy_cost) {
      case 'high': return <Zap className="w-3 h-3 text-orange-500" />;
      case 'low': return <Zap className="w-3 h-3 text-green-500" />;
      default: return null;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[18px]">
      <motion.div 
        className="absolute inset-0 flex items-center justify-between px-6"
        style={{ background }}
      >
        <motion.div style={{ opacity: leftOpacity }} className="text-white">
          <Check className="w-6 h-6" />
        </motion.div>
        <motion.div style={{ opacity: rightOpacity }} className="text-white">
          <Trash2 className="w-6 h-6" />
        </motion.div>
      </motion.div>
      
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileTap={{ cursor: 'grabbing' }}
      >
        <Card className={cn(
          'p-4 flex items-center gap-3',
          task.status === 'done' && 'opacity-60'
        )}>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => onToggle(task.id)}
            className={cn(
              'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200',
              task.status === 'done' 
                ? 'bg-accent border-accent' 
                : 'border-border hover:border-primary'
            )}
          >
            <AnimatePresence>
              {task.status === 'done' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Check className="w-3.5 h-3.5 text-accent-foreground" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={cn(
                'text-sm font-medium truncate transition-all duration-200',
                task.status === 'done' && 'line-through text-muted-foreground'
              )}>
                {task.title}
              </p>
              {getEnergyCostIcon()}
            </div>
            {showDate && task.dueDate && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(parseISO(task.dueDate), 'MMM d')}
              </p>
            )}
            {showAIHints && task.ai_explanation && (
              <p className="text-xs text-accent mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {task.ai_explanation}
              </p>
            )}
            {task.warnings && task.warnings.length > 0 && (
              <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {task.warnings[0]}
              </p>
            )}
          </div>
          <PriorityBadge priority={task.priority as 'high' | 'medium' | 'low'} variant="dot" />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onDelete(task.id)}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        </Card>
      </motion.div>
    </div>
  );
}

function SwipeableTaskList({
  tasks,
  onToggle,
  onDelete,
  showDate,
  showAIHints,
}: {
  tasks: TaskWithAI[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  showDate?: boolean;
  showAIHints?: boolean;
}) {
  return (
    <AnimatePresence mode="popLayout">
      <div className="space-y-2">
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, x: -100 }}
          >
            <SwipeableTaskItem
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
              showDate={showDate}
              showAIHints={showAIHints}
            />
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}