import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  ai_state?: string;
}

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
}

interface DailyPlan {
  date: string;
  top_now: Task[];
  next: Task[];
  later: Task[];
  focus_blocks: FocusBlock[];
  conflicts: Conflict[];
  summary?: string;
}

interface FocusBlock {
  time: string;
  duration: number;
  task_ids: string[];
  reason: string;
}

interface Conflict {
  type: 'overlap' | 'overdue' | 'high_priority_clash';
  items: string[];
  suggestion: string;
}

export const revalidate = 60;

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const targetDate = new Date(dateParam);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString();

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('due_date', { ascending: true });

    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .order('start_time', { ascending: true });

    const plan = generateDailyPlan(tasks || [], events || [], dateParam);

    const { error: upsertError } = await supabase
      .from('daily_plans')
      .upsert({
        user_id: userId,
        date: dateParam,
        plan_json: plan,
        generated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,date',
      });

    if (upsertError) {
      console.error('Failed to save plan:', upsertError);
    }

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error('AutoGLM plan generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate plan' },
      { status: 500 }
    );
  }
}

function generateDailyPlan(tasks: Task[], events: Event[], date: string): DailyPlan {
  const now = new Date();
  const targetDate = new Date(date);
  const isToday = targetDate.toDateString() === now.toDateString();

  const scoredTasks = tasks.map(task => ({
    ...task,
    score: calculateTaskScore(task, now, isToday),
  })).sort((a, b) => b.score - a.score);

  const topNow = scoredTasks.filter(t => t.score >= 80).slice(0, 3);
  const next = scoredTasks.filter(t => t.score >= 50 && t.score < 80).slice(0, 5);
  const later = scoredTasks.filter(t => t.score < 50).slice(0, 10);

  const focusBlocks = generateFocusBlocks(topNow, events, isToday);
  const conflicts = detectConflicts(tasks, events);

  return {
    date,
    top_now: topNow,
    next,
    later,
    focus_blocks: focusBlocks,
    conflicts,
  };
}

function calculateTaskScore(task: Task, now: Date, isToday: boolean): number {
  let score = 0;

  if (task.status === 'done') return 0;

  if (task.priority === 'urgent') score += 50;
  else if (task.priority === 'high') score += 30;
  else if (task.priority === 'medium') score += 15;
  else score += 5;

  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDue < 0) {
      score += 40;
    } else if (hoursUntilDue <= 2) {
      score += 35;
    } else if (hoursUntilDue <= 6) {
      score += 25;
    } else if (hoursUntilDue <= 24) {
      score += 10;
    }
  }

  if (isToday && task.ai_state === 'actionable_now') score += 20;

  return Math.min(score, 100);
}

function generateFocusBlocks(topTasks: Task[], events: Event[], isToday: boolean): FocusBlock[] {
  if (!isToday || topTasks.length === 0) return [];

  const blocks: FocusBlock[] = [];
  const now = new Date();
  const currentHour = now.getHours();

  const availableSlots = [
    { time: '09:00', hour: 9 },
    { time: '14:00', hour: 14 },
    { time: '16:00', hour: 16 },
  ];

  for (const slot of availableSlots) {
    if (slot.hour > currentHour) {
      const eventConflict = events.some(e => {
        const eventHour = new Date(e.start_time).getHours();
        return Math.abs(eventHour - slot.hour) < 2;
      });

      if (!eventConflict && topTasks.length > 0) {
        const task = topTasks.shift();
        if (task) {
          blocks.push({
            time: slot.time,
            duration: 90,
            task_ids: [task.id],
            reason: 'High priority focus block',
          });
        }
      }
    }
  }

  return blocks;
}

function detectConflicts(tasks: Task[], events: Event[]): Conflict[] {
  const conflicts: Conflict[] = [];

  const overlappingEvents = events.filter((e1, i) => 
    events.slice(i + 1).some(e2 => 
      new Date(e1.start_time) < new Date(e2.end_time) && 
      new Date(e2.start_time) < new Date(e1.end_time)
    )
  );

  if (overlappingEvents.length > 0) {
    conflicts.push({
      type: 'overlap',
      items: overlappingEvents.map(e => e.title),
      suggestion: 'Reschedule one of these events',
    });
  }

  const overdueTasks = tasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && t.status === 'pending'
  );

  if (overdueTasks.length > 0) {
    conflicts.push({
      type: 'overdue',
      items: overdueTasks.map(t => t.title),
      suggestion: `${overdueTasks.length} tasks are overdue. Review and reschedule.`,
    });
  }

  return conflicts;
}