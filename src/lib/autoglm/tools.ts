import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Tool schemas for strict validation
const CreateTaskSchema = z.object({
  title: z.string().min(1).max(500),
  due_at: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  state: z.enum(['inbox', 'planned', 'suggested', 'auto_ready', 'completed']).optional(),
  description: z.string().max(2000).optional(),
});

const UpdateTaskSchema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    title: z.string().min(1).max(500).optional(),
    due_date: z.string().datetime().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    status: z.string().optional(),
    ai_state: z.string().optional(),
  }),
});

const CreateEventSchema = z.object({
  title: z.string().min(1).max(500),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional(),
  location: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
});

const CreateNotificationSchema = z.object({
  message: z.string().min(1).max(1000),
  category: z.enum(['reminder', 'suggestion', 'alert', 'achievement']),
  scheduled_for: z.string().datetime().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  audit_id?: string;
}

export interface ToolContext {
  user_id: string;
  run_id: string;
  source: 'autoglm' | 'user';
}

/**
 * Create a new task
 * - Validates input schema
 * - Enforces user ownership
 * - Writes to audit log
 */
export async function createTask(
  input: z.infer<typeof CreateTaskSchema>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const validated = CreateTaskSchema.parse(input);

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        user_id: context.user_id,
        title: validated.title,
        due_date: validated.due_at || null,
        priority: validated.priority || 'medium',
        status: 'pending',
        ai_state: validated.state || 'inbox',
        description: validated.description || null,
        source: 'ai',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    const audit_id = await logAudit({
      user_id: context.user_id,
      action: 'create',
      entity_type: 'task',
      entity_id: task.id,
      before_state: null,
      after_state: task,
      source: context.source,
    });

    return { success: true, data: task, audit_id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Update an existing task
 * - Validates ownership before update
 * - Logs before/after state
 */
export async function updateTask(
  input: z.infer<typeof UpdateTaskSchema>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const validated = UpdateTaskSchema.parse(input);

    // Fetch current state (verify ownership)
    const { data: before, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', validated.id)
      .eq('user_id', context.user_id)
      .single();

    if (fetchError || !before) {
      return { success: false, error: 'Task not found or unauthorized' };
    }

    // Apply update
    const { data: after, error: updateError } = await supabase
      .from('tasks')
      .update({
        ...validated.patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.id)
      .eq('user_id', context.user_id)
      .select()
      .single();

    if (updateError) throw updateError;

    const audit_id = await logAudit({
      user_id: context.user_id,
      action: 'update',
      entity_type: 'task',
      entity_id: validated.id,
      before_state: before,
      after_state: after,
      source: context.source,
    });

    return { success: true, data: after, audit_id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Complete a task (soft delete / mark done)
 */
export async function completeTask(
  id: string,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { data: before } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', context.user_id)
      .single();

    if (!before) {
      return { success: false, error: 'Task not found' };
    }

    const { data: after, error } = await supabase
      .from('tasks')
      .update({
        status: 'done',
        ai_state: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', context.user_id)
      .select()
      .single();

    if (error) throw error;

    const audit_id = await logAudit({
      user_id: context.user_id,
      action: 'complete',
      entity_type: 'task',
      entity_id: id,
      before_state: before,
      after_state: after,
      source: context.source,
    });

    return { success: true, data: after, audit_id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Create a calendar event
 */
export async function createEvent(
  input: z.infer<typeof CreateEventSchema>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const validated = CreateEventSchema.parse(input);

    const endTime = validated.end_time ||
      new Date(new Date(validated.start_time).getTime() + 60 * 60 * 1000).toISOString();

    const { data: event, error } = await supabase
      .from('events')
      .insert({
        user_id: context.user_id,
        title: validated.title,
        start_time: validated.start_time,
        end_time: endTime,
        location: validated.location || null,
        description: validated.description || null,
        source: 'ai',
      })
      .select()
      .single();

    if (error) throw error;

    const audit_id = await logAudit({
      user_id: context.user_id,
      action: 'create',
      entity_type: 'event',
      entity_id: event.id,
      before_state: null,
      after_state: event,
      source: context.source,
    });

    return { success: true, data: event, audit_id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Reschedule an event
 */
export async function rescheduleEvent(
  id: string,
  new_start_time: string,
  new_end_time?: string,
  context?: ToolContext
): Promise<ToolResult> {
  try {
    const { data: before } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('user_id', context!.user_id)
      .single();

    if (!before) {
      return { success: false, error: 'Event not found' };
    }

    const endTime = new_end_time ||
      new Date(new Date(new_start_time).getTime() + 60 * 60 * 1000).toISOString();

    const { data: after, error } = await supabase
      .from('events')
      .update({
        start_time: new_start_time,
        end_time: endTime,
      })
      .eq('id', id)
      .eq('user_id', context!.user_id)
      .select()
      .single();

    if (error) throw error;

    const audit_id = await logAudit({
      user_id: context!.user_id,
      action: 'reschedule',
      entity_type: 'event',
      entity_id: id,
      before_state: before,
      after_state: after,
      source: context!.source,
    });

    return { success: true, data: after, audit_id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Create a notification
 */
export async function createNotification(
  input: z.infer<typeof CreateNotificationSchema>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const validated = CreateNotificationSchema.parse(input);

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: context.user_id,
        title: `AutoGLM: ${validated.category}`,
        message: validated.message,
        category: validated.category,
        priority: validated.priority || 'normal',
        scheduled_for: validated.scheduled_for || new Date().toISOString(),
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    const audit_id = await logAudit({
      user_id: context.user_id,
      action: 'create',
      entity_type: 'notification',
      entity_id: notification.id,
      before_state: null,
      after_state: notification,
      source: context.source,
    });

    return { success: true, data: notification, audit_id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Log a decision made by AutoGLM
 */
export async function logDecision(
  type: string,
  payload: any,
  explanation: string,
  confidence: number,
  context: ToolContext
): Promise<string> {
  const { data } = await supabase
    .from('autoglm_suggestions')
    .insert({
      run_id: context.run_id,
      user_id: context.user_id,
      suggestion_type: type,
      payload,
      explanation,
      confidence,
    })
    .select('id')
    .single();

  return data?.id || '';
}

/**
 * Internal audit logging
 */
async function logAudit(params: {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_state: any;
  after_state: any;
  source: string;
}): Promise<string> {
  const { data } = await supabase
    .from('audit_logs')
    .insert({
      user_id: params.user_id,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      metadata: {
        before: params.before_state,
        after: params.after_state,
      },
      before_state: params.before_state,
      after_state: params.after_state,
      source: params.source,
    })
    .select('id')
    .single();

  return data?.id || '';
}
