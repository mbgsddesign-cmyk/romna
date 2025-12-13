import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { 
  computeWorkflowDecision, 
  detectEventConflicts, 
  flagUnrealisticDeadlines,
  groupTasksByWorkflowState,
  type TaskWithWorkflow 
} from '@/lib/ai-workflow-engine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 30;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    // Fetch all tasks
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (!includeCompleted) {
      query = query.neq('status', 'done');
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Tasks query error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Fetch today's events for conflict detection
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay);

    // Process each task with AI workflow engine
    const tasksWithWorkflow: TaskWithWorkflow[] = (tasks || []).map(task => {
      const decision = computeWorkflowDecision(task as TaskWithWorkflow, {
        allTasks: tasks as TaskWithWorkflow[],
        events: events || [],
        currentTime: new Date(),
      });

      return {
        ...task,
        source_intent: task.source_intent || decision.workflow_state === 'inbox' ? undefined : 'task',
        ai_priority: decision.ai_priority,
        energy_cost: decision.energy_cost,
        time_flexibility: decision.time_flexibility,
        deadline_confidence: decision.deadline_confidence,
        workflow_state: decision.workflow_state,
        ai_explanation: decision.explanation,
        warnings: decision.warnings,
      };
    });

    // Detect conflicts and unrealistic deadlines
    const conflicts = detectEventConflicts(tasksWithWorkflow, events || []);
    const unrealisticDeadlines = flagUnrealisticDeadlines(tasksWithWorkflow);

    // Group by workflow state
    const grouped = groupTasksByWorkflowState(tasksWithWorkflow);

    // Generate system insights
    const insights = {
      total_tasks: tasksWithWorkflow.length,
      inbox_count: grouped.inbox.length,
      planned_count: grouped.planned.length,
      suggested_count: grouped.suggested.length,
      auto_ready_count: grouped.auto_ready.length,
      conflicts_count: conflicts.length,
      unrealistic_count: unrealisticDeadlines.length,
      overdue_count: tasksWithWorkflow.filter(t => 
        t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
      ).length,
    };

    return NextResponse.json({ 
      success: true, 
      tasks: tasksWithWorkflow,
      grouped,
      insights,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      unrealistic_deadlines: unrealisticDeadlines.length > 0 ? unrealisticDeadlines : undefined,
    });
  } catch (error: any) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { taskId, updates } = await req.json();
    
    if (!taskId) {
      return NextResponse.json({ success: false, error: 'taskId required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Update task error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, task: data });
  } catch (error: any) {
    console.error('PATCH tasks error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
