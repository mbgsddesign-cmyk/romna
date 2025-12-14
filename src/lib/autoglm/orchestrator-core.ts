/**
 * AI Day Orchestrator - Core Decision Engine
 * Converts ROMNA from task manager into AI-driven day planning system
 * 
 * Key Principles:
 * - ONE active task max at any time
 * - All decisions tracked with ai_reason
 * - Policies drive behavior (not raw data)
 * - Ask ROMNA acts as override layer only
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const openai = new OpenAI({
  baseURL: process.env.DASHSCOPE_BASE_URL,
  apiKey: process.env.DASHSCOPE_API_KEY,
});

export type TaskState = 'pending' | 'active' | 'blocked' | 'done';

export interface TaskWorkflow {
  id: string;
  user_id: string;
  title: string;
  state: TaskState;
  ai_priority: number; // 1-5
  ai_reason: string; // Required if state != pending
  due_date?: string;
  priority?: string;
  estimated_duration?: number;
}

export interface DayDecision {
  active_task: TaskWorkflow | null;
  active_task_reason: string;
  next_actions: string[];
  blocked_tasks: Array<{ task_id: string; reason: string }>;
  recommendations: string[];
}

export interface AutoGLMContext {
  user_id: string;
  trigger: 'day_start' | 'task_complete' | 'override' | 'manual';
  timezone: string;
  current_time: Date;
}

/**
 * Main orchestration function - runs AutoGLM policies and decides on ONE active task
 */
export async function runDayOrchestrator(context: AutoGLMContext): Promise<DayDecision> {
  // Fetch all pending/active/blocked tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', context.user_id)
    .in('state', ['pending', 'active', 'blocked'])
    .order('created_at', { ascending: false });

  if (!tasks || tasks.length === 0) {
    return {
      active_task: null,
      active_task_reason: 'No tasks to work on right now.',
      next_actions: ['Create new tasks to get started'],
      blocked_tasks: [],
      recommendations: [],
    };
  }

  // Get today's events for context
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', context.user_id)
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay);

  // Apply Policy P-001: Next Action Recommendation
  const decision = await selectActiveTask(tasks, events || [], context);

  // Update task states in database
  await applyTaskStateUpdates(decision, context.user_id);

  // Log decision to autoglm_runs
  await logDecision(context, decision);

  return decision;
}

/**
 * Policy P-001 Implementation: Select ONE active task
 * Based on priority, deadlines, and available time
 */
async function selectActiveTask(
  tasks: any[],
  events: any[],
  context: AutoGLMContext
): Promise<DayDecision> {
  // Score each task based on multiple factors
  const scoredTasks = tasks.map(task => ({
    ...task,
    ai_priority: calculateAIPriority(task, context.current_time),
  })).sort((a, b) => b.ai_priority - a.ai_priority);

  // Check if any task is already active
  const currentActive = scoredTasks.find(t => t.state === 'active');

  // If active task exists and is still valid, keep it
  if (currentActive && currentActive.ai_priority >= 3) {
    return {
      active_task: currentActive,
      active_task_reason: currentActive.ai_reason || buildActiveReason(currentActive, events, context),
      next_actions: ['Continue with current task', 'Mark complete when done'],
      blocked_tasks: scoredTasks.filter(t => t.state === 'blocked').map(t => ({
        task_id: t.id,
        reason: t.ai_reason || 'Waiting on dependencies',
      })),
      recommendations: buildRecommendations(scoredTasks, events, context),
    };
  }

  // Select new active task (highest priority pending task)
  const topTask = scoredTasks.find(t => t.state === 'pending' && t.ai_priority >= 3);

  if (!topTask) {
    return {
      active_task: null,
      active_task_reason: 'No high-priority tasks available right now.',
      next_actions: ['Review lower-priority tasks', 'Plan tomorrow'],
      blocked_tasks: [],
      recommendations: ['Consider breaking down large tasks', 'Schedule focus time'],
    };
  }

  const reason = buildActiveReason(topTask, events, context);

  return {
    active_task: { ...topTask, state: 'active', ai_reason: reason },
    active_task_reason: reason,
    next_actions: ['Start', 'Reschedule', 'Skip'],
    blocked_tasks: scoredTasks.filter(t => t.state === 'blocked').map(t => ({
      task_id: t.id,
      reason: t.ai_reason || 'Blocked by other tasks',
    })),
    recommendations: buildRecommendations(scoredTasks, events, context),
  };
}

/**
 * Calculate AI priority score (1-5) based on multiple factors
 */
function calculateAIPriority(task: any, currentTime: Date): number {
  let score = 0;

  // Base priority from user input
  if (task.priority === 'urgent') score += 2;
  else if (task.priority === 'high') score += 1.5;
  else if (task.priority === 'medium') score += 1;
  else score += 0.5;

  // Due date urgency
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const hoursUntilDue = (dueDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDue < 0) score += 2; // Overdue
    else if (hoursUntilDue <= 2) score += 1.5;
    else if (hoursUntilDue <= 6) score += 1;
    else if (hoursUntilDue <= 24) score += 0.5;
  }

  // Existing workflow_state influence
  if (task.workflow_state === 'auto_ready') score += 0.5;

  return Math.min(Math.max(Math.round(score), 1), 5);
}

/**
 * Build human-readable reason for why this task is active
 */
function buildActiveReason(task: any, events: any[], context: AutoGLMContext): string {
  const reasons: string[] = [];

  // Priority-based reason
  if (task.ai_priority >= 4) {
    reasons.push('High priority');
  }

  // Deadline-based reason
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const hoursUntilDue = (dueDate.getTime() - context.current_time.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDue < 0) {
      reasons.push('Overdue');
    } else if (hoursUntilDue <= 6) {
      reasons.push('Due soon');
    } else if (hoursUntilDue <= 24) {
      reasons.push('Due today');
    }
  }

  // Time availability reason
  const nextEvent = events.find(e => new Date(e.start_time) > context.current_time);
  if (nextEvent) {
    const minutesUntilEvent = (new Date(nextEvent.start_time).getTime() - context.current_time.getTime()) / (1000 * 60);
    if (task.estimated_duration && task.estimated_duration <= minutesUntilEvent) {
      reasons.push(`Can fit before ${new Date(nextEvent.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`);
    }
  }

  return reasons.length > 0 ? reasons.join(', ') : 'Best task to work on now';
}

/**
 * Build recommendations based on overall day state
 */
function buildRecommendations(tasks: any[], events: any[], context: AutoGLMContext): string[] {
  const recommendations: string[] = [];

  // Check for overload
  const highPriorityCount = tasks.filter(t => t.ai_priority >= 4).length;
  if (highPriorityCount > 3) {
    recommendations.push('Day is packed - focus on top 3 priorities');
  }

  // Check for scheduling opportunities
  if (events.length < 2 && tasks.length > 5) {
    recommendations.push('Add focus blocks to protect deep work time');
  }

  // Check for overdue tasks
  const overdueCount = tasks.filter(t =>
    t.due_date && new Date(t.due_date) < context.current_time
  ).length;
  if (overdueCount > 0) {
    recommendations.push(`${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} need attention`);
  }

  return recommendations;
}

/**
 * Apply state updates to tasks based on decision
 */
async function applyTaskStateUpdates(decision: DayDecision, userId: string) {
  // Set all active tasks to pending first (enforce ONE active task rule)
  await supabase
    .from('tasks')
    .update({ state: 'pending' })
    .eq('user_id', userId)
    .eq('state', 'active');

  // Set new active task
  if (decision.active_task) {
    await supabase
      .from('tasks')
      .update({
        state: 'active',
        ai_priority: decision.active_task.ai_priority,
        ai_reason: decision.active_task_reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', decision.active_task.id);
  }

  // Update blocked tasks
  for (const blocked of decision.blocked_tasks) {
    await supabase
      .from('tasks')
      .update({
        state: 'blocked',
        ai_reason: blocked.reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', blocked.task_id);
  }
}

/**
 * Log decision to autoglm_runs for observability
 */
async function logDecision(context: AutoGLMContext, decision: DayDecision) {
  await getSupabaseAdmin().from('autoglm_runs').insert({
    user_id: context.user_id,
    trigger: context.trigger,
    started_at: context.current_time.toISOString(),
    finished_at: new Date().toISOString(),
    status: 'success',
    context_snapshot: {
      decision_type: 'day_orchestration',
      active_task_id: decision.active_task?.id,
      active_task_reason: decision.active_task_reason,
      recommendations: decision.recommendations,
      trigger: context.trigger,
    },
  });
}

/**
 * Handle Ask ROMNA override commands
 * This is the ONLY way users manually change priorities/scheduling
 */
export async function handleROMNAOverride(
  userId: string,
  command: string,
  commandType: 'change_priority' | 'reschedule' | 'skip' | 'explain'
): Promise<{ success: boolean; message: string }> {
  // Get current active task
  const { data: activeTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('state', 'active')
    .limit(1);

  const activeTask = activeTasks?.[0];

  switch (commandType) {
    case 'skip':
      if (!activeTask) {
        return { success: false, message: 'No active task to skip' };
      }

      // Set active task to pending, run orchestrator again
      await supabase
        .from('tasks')
        .update({ state: 'pending', ai_reason: 'Manually skipped' })
        .eq('id', activeTask.id);

      // Re-run orchestrator
      await runDayOrchestrator({
        user_id: userId,
        trigger: 'override',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        current_time: new Date(),
      });

      return { success: true, message: 'Skipped current task, selecting next priority' };

    case 'explain':
      if (!activeTask) {
        return { success: false, message: 'No active task to explain' };
      }

      return {
        success: true,
        message: `Current task: "${activeTask.title}". Reason: ${activeTask.ai_reason || 'AutoGLM selected this as highest priority'}`,
      };

    case 'change_priority':
    case 'reschedule':
      // These would be handled by specific policies (T-001, T-005, etc.)
      return {
        success: false,
        message: 'Override type not yet implemented',
      };

    default:
      return { success: false, message: 'Unknown command type' };
  }
}
