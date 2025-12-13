import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface HandleRequest {
  input: string;
  source: 'ask-romna' | 'tasks' | 'insights' | 'home' | 'notifications' | 'calendar';
  userId?: string;
  timezone?: string;
  context?: Record<string, unknown>;
}

type ResponseType = 'suggest' | 'question' | 'execute' | 'nothing' | 'error';

interface HandleResponse {
  type: ResponseType;
  message: string;
  data?: unknown;
  action?: string;
  result?: unknown;
  code?: string;
}

const DASHSCOPE_BASE_URL = process.env.DASHSCOPE_BASE_URL;
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_MODEL = process.env.DASHSCOPE_MODEL || 'qwen-plus';

export async function POST(req: NextRequest): Promise<NextResponse<HandleResponse>> {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  console.log(`[AUTOGLM] Request ${requestId} started`);

  try {
    const body: HandleRequest = await req.json();
    const { input, source, userId, timezone = 'UTC', context = {} } = body;

    if (!input || typeof input !== 'string') {
      return NextResponse.json({
        type: 'error',
        message: 'Invalid input',
        code: 'INVALID_INPUT'
      }, { status: 200 });
    }

    if (!userId) {
      return NextResponse.json({
        type: 'question',
        message: 'Please log in to use ROMNA AI features.'
      }, { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Classify intent using LLM
    const t_classify_start = Date.now();
    const intent = await classifyIntent(input, context);
    const t_classify = Date.now() - t_classify_start;
    
    console.log(`[AUTOGLM] ${requestId} - Intent: ${intent.action} (${t_classify}ms)`);

    // Execute based on intent
    let response: HandleResponse;
    const t_execute_start = Date.now();

    switch (intent.action) {
      case 'create_task':
        response = await executeCreateTask(supabase, userId, intent.params, input);
        break;
      
      case 'create_event':
        response = await executeCreateEvent(supabase, userId, intent.params, input);
        break;
      
      case 'mark_task_done':
        response = await executeMarkTaskDone(supabase, userId, intent.params);
        break;
      
      case 'snooze_task':
        response = await executeSnoozeTask(supabase, userId, intent.params);
        break;
      
      case 'add_focus_block':
        response = await executeAddFocusBlock(supabase, userId, intent.params);
        break;
      
      case 'suggest':
        response = await executeSuggest(supabase, userId, input);
        break;
      
      case 'question':
        response = { type: 'question', message: intent.message || 'Could you provide more details?' };
        break;
      
      default:
        response = { type: 'nothing', message: 'I\'m not sure how to help with that yet.' };
    }

    const t_execute = Date.now() - t_execute_start;
    const t_total = Date.now() - startTime;

    // Log to autoglm_runs
    await supabase.from('autoglm_runs').insert({
      id: requestId,
      user_id: userId,
      trigger: source,
      input,
      decision_type: response.type,
      action_type: intent.action,
      success: response.type !== 'error',
      error: response.type === 'error' ? response.message : null,
      status: response.type === 'error' ? 'failed' : 'completed',
      latency_ms: t_total,
      started_at: new Date(startTime).toISOString(),
      finished_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    console.log(`[AUTOGLM] ${requestId} - Complete: ${response.type} (total: ${t_total}ms, classify: ${t_classify}ms, execute: ${t_execute}ms)`);

    // Revalidate paths if execution succeeded
    if (response.type === 'execute') {
      revalidatePath('/tasks');
      revalidatePath('/calendar');
      revalidatePath('/insights');
      revalidatePath('/notifications');
      revalidatePath('/');
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error: unknown) {
    const t_total = Date.now() - startTime;
    console.error(`[AUTOGLM] ${requestId} - Error (${t_total}ms):`, error);

    return NextResponse.json({
      type: 'error',
      message: 'Something went wrong. Please try again.',
      code: 'INTERNAL_ERROR'
    }, { status: 200 });
  }
}

// ==================== Intent Classification ====================

interface Intent {
  action: 'create_task' | 'create_event' | 'mark_task_done' | 'snooze_task' | 'add_focus_block' | 'suggest' | 'question' | 'unknown';
  params: Record<string, unknown>;
  message?: string;
}

async function classifyIntent(input: string, context: Record<string, unknown>): Promise<Intent> {
  if (!DASHSCOPE_BASE_URL || !DASHSCOPE_API_KEY) {
    // Fallback to rule-based
    return classifyIntentRuleBased(input);
  }

  try {
    const systemPrompt = `You are ROMNA, an AI productivity assistant. Analyze the user input and classify the intent.

Return JSON ONLY in this format:
{
  "action": "create_task" | "create_event" | "mark_task_done" | "snooze_task" | "add_focus_block" | "suggest" | "question",
  "params": {
    "title"?: string,
    "priority"?: "low" | "medium" | "high" | "urgent",
    "due_date"?: string (ISO 8601),
    "estimated_duration"?: number (minutes),
    "event_start"?: string (ISO 8601),
    "event_end"?: string (ISO 8601),
    "task_id"?: string,
    "snooze_until"?: string (ISO 8601),
    "duration"?: number (minutes)
  },
  "message"?: string
}

Examples:
- "Add task: Prepare proposal, high priority, today" → {"action":"create_task","params":{"title":"Prepare proposal","priority":"high","due_date":"2024-12-13T23:59:59Z"}}
- "Schedule meeting at 3pm tomorrow" → {"action":"create_event","params":{"title":"Meeting","event_start":"2024-12-14T15:00:00Z","event_end":"2024-12-14T16:00:00Z"}}
- "What should I do now?" → {"action":"suggest","params":{}}
- "Add 45 minute focus block before noon" → {"action":"add_focus_block","params":{"duration":45}}

Current context: ${JSON.stringify(context)}`;

    const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DASHSCOPE_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input }
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.warn('[AUTOGLM] LLM classify failed, using rule-based');
      return classifyIntentRuleBased(input);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return classifyIntentRuleBased(input);
    }

    const parsed = JSON.parse(content);
    return parsed;
  } catch (error) {
    console.warn('[AUTOGLM] LLM parse error, using rule-based:', error);
    return classifyIntentRuleBased(input);
  }
}

function classifyIntentRuleBased(input: string): Intent {
  const lower = input.toLowerCase();
  
  if (lower.includes('add task') || lower.includes('create task') || lower.includes('new task')) {
    const title = input.replace(/add task:?|create task:?|new task:?/i, '').trim();
    return {
      action: 'create_task',
      params: { title: title || 'New task' }
    };
  }
  
  if (lower.includes('schedule') || lower.includes('meeting') || lower.includes('event')) {
    return {
      action: 'create_event',
      params: { title: 'New event' }
    };
  }
  
  if (lower.includes('focus block') || lower.includes('deep work')) {
    return {
      action: 'add_focus_block',
      params: { duration: 45 }
    };
  }
  
  if (lower.includes('what should') || lower.includes('suggest') || lower.includes('recommend')) {
    return {
      action: 'suggest',
      params: {}
    };
  }
  
  return {
    action: 'question',
    params: {},
    message: 'Could you be more specific?'
  };
}

// ==================== Action Executors ====================

async function executeCreateTask(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  params: Record<string, unknown>,
  originalInput: string
): Promise<HandleResponse> {
  try {
    const taskData = {
      id: uuidv4(),
      user_id: userId,
      title: String(params.title || 'New task'),
      priority: params.priority || 'medium',
      due_date: params.due_date || null,
      estimated_duration: params.estimated_duration || null,
      status: 'pending',
      ai_state: 'planned',
      source: 'ai',
      source_intent: originalInput,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('[AUTOGLM] Creating task:', taskData);
    const { error } = await supabase.from('tasks').insert(taskData);

    if (error) {
      console.error('[AUTOGLM] Create task DB error:', error);
      throw error;
    }

    return {
      type: 'execute',
      message: `✅ Created task: "${params.title}"`,
      action: 'create_task',
      result: { title: params.title }
    };
  } catch (error: unknown) {
    console.error('[AUTOGLM] Create task error:', error);
    return {
      type: 'error',
      message: 'Failed to create task',
      code: 'DB_ERROR'
    };
  }
}

async function executeCreateEvent(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  params: Record<string, unknown>,
  originalInput: string
): Promise<HandleResponse> {
  try {
    const { error } = await supabase.from('events').insert({
      id: uuidv4(),
      user_id: userId,
      title: String(params.title || 'New event'),
      start_time: params.event_start || new Date().toISOString(),
      end_time: params.event_end || new Date(Date.now() + 3600000).toISOString(),
      source: 'ai',
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    return {
      type: 'execute',
      message: `✅ Created event: "${params.title}"`,
      action: 'create_event',
      result: { title: params.title }
    };
  } catch (error: unknown) {
    console.error('[AUTOGLM] Create event error:', error);
    return {
      type: 'error',
      message: 'Failed to create event',
      code: 'DB_ERROR'
    };
  }
}

async function executeMarkTaskDone(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  params: Record<string, unknown>
): Promise<HandleResponse> {
  try {
    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(params.task_id))
      .eq('user_id', userId);

    if (error) throw error;

    return {
      type: 'execute',
      message: '✅ Task marked as done',
      action: 'mark_task_done'
    };
  } catch (error: unknown) {
    console.error('[AUTOGLM] Mark task done error:', error);
    return {
      type: 'error',
      message: 'Failed to update task',
      code: 'DB_ERROR'
    };
  }
}

async function executeSnoozeTask(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  params: Record<string, unknown>
): Promise<HandleResponse> {
  try {
    const snoozeUntil = params.snooze_until || new Date(Date.now() + 3600000).toISOString();
    
    const { error } = await supabase
      .from('tasks')
      .update({
        due_date: snoozeUntil,
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(params.task_id))
      .eq('user_id', userId);

    if (error) throw error;

    return {
      type: 'execute',
      message: '✅ Task snoozed',
      action: 'snooze_task'
    };
  } catch (error: unknown) {
    console.error('[AUTOGLM] Snooze task error:', error);
    return {
      type: 'error',
      message: 'Failed to snooze task',
      code: 'DB_ERROR'
    };
  }
}

async function executeAddFocusBlock(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  params: Record<string, unknown>
): Promise<HandleResponse> {
  try {
    const duration = Number(params.duration) || 45;
    const now = new Date();
    const startTime = new Date(now.getTime() + 600000); // 10 minutes from now
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const { error } = await supabase.from('events').insert({
      id: uuidv4(),
      user_id: userId,
      title: 'Focus Block',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      source: 'ai',
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    return {
      type: 'execute',
      message: `✅ Added ${duration}-minute focus block`,
      action: 'add_focus_block',
      result: { duration }
    };
  } catch (error: unknown) {
    console.error('[AUTOGLM] Add focus block error:', error);
    return {
      type: 'error',
      message: 'Failed to add focus block',
      code: 'DB_ERROR'
    };
  }
}

async function executeSuggest(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  input: string
): Promise<HandleResponse> {
  try {
    // Fetch user context
    const [tasksRes, eventsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .limit(10),
      supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5),
    ]);

    const tasks = tasksRes.data || [];
    const events = eventsRes.data || [];

    // Simple suggestion logic
    if (tasks.length === 0) {
      return {
        type: 'suggest',
        message: 'You have no pending tasks. Great job! Maybe add some new goals?',
      };
    }

    const highPriorityTasks = tasks.filter(t => t.priority === 'high' || t.priority === 'urgent');
    if (highPriorityTasks.length > 0) {
      return {
        type: 'suggest',
        message: `Focus on "${highPriorityTasks[0].title}" - it's high priority. ${events.length > 0 ? 'But you have ' + events.length + ' upcoming events, so plan accordingly.' : ''}`,
        data: { task: highPriorityTasks[0].title, events: events.length }
      };
    }

    return {
      type: 'suggest',
      message: `You have ${tasks.length} tasks. Start with "${tasks[0].title}" to build momentum.`,
      data: { task: tasks[0].title }
    };
  } catch (error: unknown) {
    console.error('[AUTOGLM] Suggest error:', error);
    return {
      type: 'suggest',
      message: 'You\'re doing great! Keep focusing on your priorities.',
    };
  }
}