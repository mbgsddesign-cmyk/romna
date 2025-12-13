import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 30; // Revalidate every 30 seconds

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    // Fetch all tasks with AI state computation
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Tasks query error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Compute AI state for each task
    const tasksWithAIState = (tasks || []).map(task => ({
      ...task,
      ai_state: computeAIState(task),
      smart_action: computeSmartAction(task)
    }));

    // Filter to show only actionable tasks by default
    const actionableTasks = tasksWithAIState.filter(t => 
      t.ai_state === 'actionable_now' || t.ai_state === 'scheduled' || t.ai_state === 'overdue'
    );

    return NextResponse.json({ 
      success: true, 
      tasks: actionableTasks,
      all_tasks: tasksWithAIState 
    });
  } catch (error: any) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function computeAIState(task: any): string {
  const now = new Date();
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  
  if (task.status === 'done') return 'completed';
  
  if (!dueDate) {
    // No due date - determine by priority and age
    if (task.priority === 'high') return 'actionable_now';
    return 'low_priority';
  }
  
  // Has due date
  if (dueDate < now) return 'overdue';
  
  const hoursDiff = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursDiff <= 2) return 'actionable_now';
  if (hoursDiff <= 24) return 'scheduled';
  
  return 'low_priority';
}

function computeSmartAction(task: any): string {
  const aiState = task.ai_state || computeAIState(task);
  
  switch (aiState) {
    case 'overdue':
      return 'reschedule';
    case 'actionable_now':
      return 'mark_done';
    case 'scheduled':
      return 'snooze';
    case 'low_priority':
      return 'ask_romna';
    case 'blocked':
      return 'ask_romna';
    default:
      return 'mark_done';
  }
}
