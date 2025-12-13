import { NextRequest, NextResponse } from 'next/server';
import { handleROMNAOverride, runDayOrchestrator } from '@/lib/autoglm/orchestrator-core';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

/**
 * POST /api/autoglm/action
 * Handles user actions on the active task (start, reschedule, skip)
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, action, taskId } = await req.json();

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'userId and action required' },
        { status: 400 }
      );
    }

    let result: { success: boolean; message: string };

    switch (action) {
      case 'start':
        if (!taskId) {
          return NextResponse.json({ error: 'taskId required for start action' }, { status: 400 });
        }
        
        await supabase
          .from('tasks')
          .update({
            status: 'in_progress',
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        result = { success: true, message: 'Task started' };
        break;

      case 'skip':
        result = await handleROMNAOverride(userId, '', 'skip');
        break;

      case 'reschedule':
        if (!taskId) {
          return NextResponse.json({ error: 'taskId required for reschedule action' }, { status: 400 });
        }
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        await supabase
          .from('tasks')
          .update({
            due_date: tomorrow.toISOString(),
            state: 'pending',
            ai_reason: 'Manually rescheduled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        await runDayOrchestrator({
          user_id: userId,
          trigger: 'override',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          current_time: new Date(),
        });

        result = { success: true, message: 'Task rescheduled to tomorrow' };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Action error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute action' },
      { status: 500 }
    );
  }
}
