/**
 * AutoGLM Context Builder
 * 
 * Gathers all necessary context for AI decision-making:
 * - Tasks (today + upcoming)
 * - Events (conflicts, travel time)
 * - User preferences & patterns
 * - Load assessment
 * 
 * NO LLM calls - pure data aggregation
 */

import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface Task {
  id: string;
  title: string;
  due_date?: string;
  priority?: string;
  status?: string;
  estimated_duration?: number;
  workflow_state?: string;
  ai_priority?: string;
  energy_cost?: string;
  time_flexibility?: string;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
}

export interface UserPreferences {
  working_hours_start?: number;
  working_hours_end?: number;
  focus_block_minutes?: number;
  preferred_task_length?: number;
  timezone?: string;
}

export interface AutoGLMContext {
  user_id: string;
  current_time: Date;
  timezone: string;

  // Tasks breakdown
  tasks_today: Task[];
  tasks_overdue: Task[];
  tasks_upcoming: Task[];
  tasks_inbox: Task[];

  // Events
  events_today: Event[];
  events_upcoming: Event[];

  // Load assessment
  total_tasks_today: number;
  estimated_workload_minutes: number;
  available_time_minutes: number;
  is_overloaded: boolean;

  // User profile
  preferences: UserPreferences;

  // Metadata
  fetched_at: string;
}

/**
 * Build complete context for AutoGLM decision-making
 */
export async function buildAutoGLMContext(userId: string): Promise<AutoGLMContext> {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Fetch user preferences
  const { data: prefsData } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  const preferences: UserPreferences = {
    working_hours_start: prefsData?.working_hours_start || 9,
    working_hours_end: prefsData?.working_hours_end || 17,
    focus_block_minutes: prefsData?.focus_block_minutes || 90,
    preferred_task_length: prefsData?.preferred_task_length || 30,
    timezone: prefsData?.timezone || 'UTC',
  };

  // Fetch all active tasks
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'done')
    .order('due_date', { ascending: true, nullsFirst: false });

  const tasks = (allTasks || []) as Task[];

  // Categorize tasks
  const tasks_today = tasks.filter(t =>
    t.due_date && new Date(t.due_date) >= today && new Date(t.due_date) < tomorrow
  );

  const tasks_overdue = tasks.filter(t =>
    t.due_date && new Date(t.due_date) < today
  );

  const tasks_upcoming = tasks.filter(t =>
    t.due_date && new Date(t.due_date) >= tomorrow
  ).slice(0, 10); // Next 10 tasks

  const tasks_inbox = tasks.filter(t =>
    !t.due_date || t.workflow_state === 'inbox'
  );

  // Fetch today's events
  const { data: eventsData } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', today.toISOString())
    .lt('start_time', tomorrow.toISOString())
    .order('start_time', { ascending: true });

  const events_today = (eventsData || []) as Event[];

  // Fetch upcoming events (next 7 days)
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const { data: upcomingEventsData } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', tomorrow.toISOString())
    .lt('start_time', nextWeek.toISOString())
    .order('start_time', { ascending: true });

  const events_upcoming = (upcomingEventsData || []) as Event[];

  // Calculate workload
  const estimated_workload_minutes = tasks_today.reduce((sum, task) => {
    return sum + (task.estimated_duration || preferences.preferred_task_length || 30);
  }, 0);

  // Calculate available time (working hours minus events)
  const working_hours = (preferences.working_hours_end || 17) - (preferences.working_hours_start || 9);
  const working_minutes = working_hours * 60;

  const event_minutes = events_today.reduce((sum, event) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    return sum + Math.floor((end.getTime() - start.getTime()) / 60000);
  }, 0);

  const available_time_minutes = working_minutes - event_minutes;
  const is_overloaded = estimated_workload_minutes > available_time_minutes * 0.8; // 80% threshold

  return {
    user_id: userId,
    current_time: now,
    timezone: preferences.timezone || 'UTC',

    tasks_today,
    tasks_overdue,
    tasks_upcoming,
    tasks_inbox,

    events_today,
    events_upcoming,

    total_tasks_today: tasks_today.length,
    estimated_workload_minutes,
    available_time_minutes,
    is_overloaded,

    preferences,

    fetched_at: now.toISOString(),
  };
}
