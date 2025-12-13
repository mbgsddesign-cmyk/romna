import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
  createTask,
  updateTask,
  completeTask,
  createEvent,
  createNotification,
  logDecision,
  ToolContext,
} from './tools';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Use DashScope (Qwen) as configured in env
const openai = new OpenAI({
  baseURL: process.env.DASHSCOPE_BASE_URL,
  apiKey: process.env.DASHSCOPE_API_KEY,
});

export interface AutoGLMInput {
  user_id: string;
  trigger: 'daily_scan' | 'voice_intent' | 'on_open_app' | 'manual';
  context?: {
    timezone?: string;
    working_hours?: { start: string; end: string };
    focus_block_minutes?: number;
    ai_opt_in?: boolean;
  };
}

export interface DailyPlan {
  date: string;
  timeline_blocks: TimelineBlock[];
  priority_stack: string[];
  summary: string;
}

export interface TimelineBlock {
  time: string;
  duration: number;
  task_ids: string[];
  type: 'focus' | 'event' | 'break';
  reason: string;
}

export interface Recommendation {
  id: string;
  type: 'productivity' | 'scheduling' | 'prioritization';
  reason: string;
  impact: string;
  confidence: number;
}

export interface ProposedAction {
  action: 'create_task' | 'update_task' | 'complete_task' | 'create_event' | 'reschedule_event' | 'create_notification';
  params: any;
  reason: string;
  confidence: number;
  reversible: boolean;
}

export interface AutoGLMOutput {
  daily_plan: DailyPlan;
  recommendations: Recommendation[];
  proposed_actions: ProposedAction[];
  explanations: string[];
}

/**
 * Main AutoGLM Orchestrator
 * Runs in two stages:
 * 1. Deterministic planning (rule-based, fast)
 * 2. LLM-assisted refinement (only if opted-in)
 */
export async function runAutoGLM(input: AutoGLMInput): Promise<AutoGLMOutput> {
  const startTime = Date.now();
  
  // Create run record
  const { data: run } = await supabase
    .from('autoglm_runs')
    .insert({
      user_id: input.user_id,
      trigger: input.trigger,
      started_at: new Date().toISOString(),
      status: 'running',
      context_snapshot: input.context,
    })
    .select()
    .single();

  const run_id = run?.id!;

  try {
    // Fetch user context
    const userContext = await fetchUserContext(input.user_id);
    
    // Stage 1: Deterministic Planning (always runs)
    const deterministicPlan = await generateDeterministicPlan(
      userContext,
      input.context || {}
    );

    let output: AutoGLMOutput = {
      daily_plan: deterministicPlan.daily_plan,
      recommendations: deterministicPlan.recommendations,
      proposed_actions: [],
      explanations: deterministicPlan.explanations,
    };

    // Stage 2: LLM Refinement (only if opted-in)
    const aiOptIn = input.context?.ai_opt_in ?? userContext.preferences?.ai_opt_in ?? false;
    
    if (aiOptIn) {
      const refinedOutput = await refinePlanWithLLM(
        deterministicPlan,
        userContext,
        run_id,
        input.user_id
      );
      output = { ...output, ...refinedOutput };
    }

    // Store all suggestions
    for (const rec of output.recommendations) {
      await logDecision(
        'recommendation',
        rec,
        rec.reason,
        rec.confidence,
        { user_id: input.user_id, run_id, source: 'autoglm' }
      );
    }

    for (const action of output.proposed_actions) {
      await logDecision(
        'action',
        action,
        action.reason,
        action.confidence,
        { user_id: input.user_id, run_id, source: 'autoglm' }
      );
    }

    // Mark run as success
    const latencyMs = Date.now() - startTime;
    await supabase
      .from('autoglm_runs')
      .update({
        finished_at: new Date().toISOString(),
        status: 'success',
        latency_ms: latencyMs,
      })
      .eq('id', run_id);

    return output;
  } catch (error: any) {
    // Mark run as failed
    await supabase
      .from('autoglm_runs')
      .update({
        finished_at: new Date().toISOString(),
        status: 'failed',
        error_message: error.message,
      })
      .eq('id', run_id);

    throw error;
  }
}

/**
 * Stage 1: Deterministic Planning (Rule-Based)
 * Fast, predictable, explainable
 */
async function generateDeterministicPlan(
  userContext: any,
  preferences: any
): Promise<{
  daily_plan: DailyPlan;
  recommendations: Recommendation[];
  explanations: string[];
}> {
  const { tasks, events, reminders } = userContext;
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Score and sort tasks
  const scoredTasks = tasks.map((task: any) => ({
    ...task,
    score: calculateTaskScore(task, now),
  })).sort((a: any, b: any) => b.score - a.score);

  // Build timeline blocks
  const timelineBlocks: TimelineBlock[] = [];
  const workingHours = {
    start: preferences.working_hours?.start || '09:00',
    end: preferences.working_hours?.end || '17:00',
  };

  // Schedule high-priority tasks in focus blocks
  const highPriorityTasks = scoredTasks.filter((t: any) => t.score >= 70).slice(0, 3);
  const focusBlockMinutes = preferences.focus_block_minutes || 90;

  let currentHour = parseInt(workingHours.start.split(':')[0]);
  for (const task of highPriorityTasks) {
    // Find next available slot (avoid events)
    while (hasEventConflict(events, currentHour)) {
      currentHour++;
    }

    if (currentHour >= parseInt(workingHours.end.split(':')[0])) break;

    timelineBlocks.push({
      time: `${String(currentHour).padStart(2, '0')}:00`,
      duration: focusBlockMinutes,
      task_ids: [task.id],
      type: 'focus',
      reason: `High priority: ${task.title}`,
    });

    currentHour += Math.ceil(focusBlockMinutes / 60);
  }

  // Detect conflicts and overload
  const recommendations: Recommendation[] = [];
  const explanations: string[] = [];

  // Check for overdue tasks
  const overdueTasks = tasks.filter(
    (t: any) => t.due_date && new Date(t.due_date) < now && t.status === 'pending'
  );
  if (overdueTasks.length > 0) {
    recommendations.push({
      id: crypto.randomUUID(),
      type: 'prioritization',
      reason: `${overdueTasks.length} overdue tasks need immediate attention`,
      impact: 'Completing these will reduce stress and free up mental space',
      confidence: 0.95,
    });
    explanations.push(`You have ${overdueTasks.length} overdue tasks. Consider tackling the most important one first.`);
  }

  // Check for daily overload
  const totalTaskMinutes = scoredTasks
    .filter((t: any) => t.score >= 50)
    .reduce((sum: number, t: any) => sum + (t.estimated_minutes || 30), 0);
  
  const availableMinutes = 
    (parseInt(workingHours.end.split(':')[0]) - parseInt(workingHours.start.split(':')[0])) * 60 -
    events.reduce((sum: number, e: any) => {
      const duration = (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 60000;
      return sum + duration;
    }, 0);

  if (totalTaskMinutes > availableMinutes * 0.8) {
    recommendations.push({
      id: crypto.randomUUID(),
      type: 'scheduling',
      reason: 'Your schedule is overloaded for today',
      impact: 'Consider rescheduling lower-priority tasks to tomorrow',
      confidence: 0.85,
    });
    explanations.push('Today looks packed. Focus on top 3 priorities and move others to tomorrow.');
  }

  const dailyPlan: DailyPlan = {
    date: today,
    timeline_blocks: timelineBlocks,
    priority_stack: highPriorityTasks.map((t: any) => t.id),
    summary: `${highPriorityTasks.length} high-priority tasks planned across ${timelineBlocks.length} focus blocks`,
  };

  return { daily_plan: dailyPlan, recommendations, explanations };
}

/**
 * Stage 2: LLM Refinement (Optional)
 * Adds natural language explanations and action proposals
 */
async function refinePlanWithLLM(
  deterministicPlan: any,
  userContext: any,
  run_id: string,
  user_id: string
): Promise<Partial<AutoGLMOutput>> {
  const prompt = buildLLMPrompt(deterministicPlan, userContext);

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.DASHSCOPE_MODEL || 'qwen-plus',
      messages: [
        {
          role: 'system',
          content: 'You are AutoGLM, an AI productivity orchestrator. Generate actionable suggestions based on the provided plan. Return JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(response);

    return {
      proposed_actions: parsed.proposed_actions || [],
      explanations: [
        ...(deterministicPlan.explanations || []),
        ...(parsed.explanations || []),
      ],
    };
  } catch (error) {
    console.error('LLM refinement failed:', error);
    return { proposed_actions: [], explanations: deterministicPlan.explanations };
  }
}

function buildLLMPrompt(plan: any, userContext: any): string {
  return `
Given the following context, suggest 1-3 specific actions to improve the user's day.

CONTEXT:
- Daily Plan: ${JSON.stringify(plan.daily_plan)}
- Tasks: ${userContext.tasks.length} total
- Events: ${userContext.events.length} today
- Recommendations: ${JSON.stringify(plan.recommendations)}

CONSTRAINTS:
- Only suggest actions that map to these types: create_task, update_task, complete_task, create_event, create_notification
- Each action MUST be reversible
- Provide clear explanations
- Confidence between 0.5 and 1.0

Return JSON in this format:
{
  "proposed_actions": [
    {
      "action": "create_notification",
      "params": { "message": "...", "category": "suggestion" },
      "reason": "...",
      "confidence": 0.8,
      "reversible": true
    }
  ],
  "explanations": ["Natural language explanation of what you're suggesting"]
}
  `.trim();
}

function calculateTaskScore(task: any, now: Date): number {
  let score = 0;

  if (task.status === 'done') return 0;

  if (task.priority === 'urgent') score += 50;
  else if (task.priority === 'high') score += 30;
  else if (task.priority === 'medium') score += 15;
  else score += 5;

  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDue < 0) score += 40;
    else if (hoursUntilDue <= 2) score += 35;
    else if (hoursUntilDue <= 6) score += 25;
    else if (hoursUntilDue <= 24) score += 10;
  }

  return Math.min(score, 100);
}

function hasEventConflict(events: any[], hour: number): boolean {
  return events.some((e: any) => {
    const eventHour = new Date(e.start_time).getHours();
    return Math.abs(eventHour - hour) < 2;
  });
}

async function fetchUserContext(user_id: string) {
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: preferences },
    { data: tasks },
    { data: events },
    { data: reminders },
    { data: activity },
  ] = await Promise.all([
    supabase.from('user_preferences').select('*').eq('user_id', user_id).single(),
    supabase.from('tasks').select('*').eq('user_id', user_id).eq('status', 'pending'),
    supabase
      .from('events')
      .select('*')
      .eq('user_id', user_id)
      .gte('start_time', today)
      .lte('start_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_read', false)
      .eq('category', 'reminder'),
    supabase
      .from('tasks')
      .select('id, status, completed_at')
      .eq('user_id', user_id)
      .eq('status', 'done')
      .gte('completed_at', sevenDaysAgo),
  ]);

  return {
    preferences,
    tasks: tasks || [],
    events: events || [],
    reminders: reminders || [],
    activity: activity || [],
  };
}
