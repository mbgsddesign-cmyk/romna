import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  createTask,
  updateTask,
  completeTask,
  createEvent,
  createNotification,
  ToolContext,
} from '@/lib/autoglm/tools';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const revalidate = 0;


/**
 * GET /api/autoglm/suggestions?userId=xxx
 * Get pending suggestions for user
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  try {
    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const { data: suggestions } = await supabase
      .from('autoglm_suggestions')
      .select('*')
      .eq('user_id', userId)
      .is('accepted_at', null)
      .is('rejected_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      suggestions: suggestions || [],
    });
  } catch (error: any) {
    console.error('Get suggestions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/autoglm/suggestions
 * Accept or reject a suggestion
 * 
 * Body: {
 *   suggestion_id: string,
 *   action: 'accept' | 'reject',
 *   user_id: string
 * }
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  try {
    const { suggestion_id, action, user_id } = await req.json();

    if (!suggestion_id || !action || !user_id) {
      return NextResponse.json(
        { error: 'suggestion_id, action, and user_id required' },
        { status: 400 }
      );
    }

    // Fetch suggestion
    const { data: suggestion } = await supabase
      .from('autoglm_suggestions')
      .select('*')
      .eq('id', suggestion_id)
      .eq('user_id', user_id)
      .single();

    if (!suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      );
    }

    if (action === 'reject') {
      // Just mark as rejected
      await supabase
        .from('autoglm_suggestions')
        .update({ rejected_at: new Date().toISOString() })
        .eq('id', suggestion_id);

      return NextResponse.json({
        success: true,
        action: 'rejected',
      });
    }

    // Accept: execute the proposed action
    if (action === 'accept' && suggestion.suggestion_type === 'action') {
      const payload = suggestion.payload as any;
      const context: ToolContext = {
        user_id,
        run_id: suggestion.run_id,
        source: 'autoglm',
      };

      let result;

      switch (payload.action) {
        case 'create_task':
          result = await createTask(payload.params, context);
          break;
        case 'update_task':
          result = await updateTask(payload.params, context);
          break;
        case 'complete_task':
          result = await completeTask(payload.params.id, context);
          break;
        case 'create_event':
          result = await createEvent(payload.params, context);
          break;
        case 'create_notification':
          result = await createNotification(payload.params, context);
          break;
        default:
          return NextResponse.json(
            { error: 'Unknown action type' },
            { status: 400 }
          );
      }

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Action execution failed' },
          { status: 500 }
        );
      }

      // Mark as accepted
      await supabase
        .from('autoglm_suggestions')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', suggestion_id);

      return NextResponse.json({
        success: true,
        action: 'accepted',
        result: result.data,
        audit_id: result.audit_id,
      });
    }

    // For non-action suggestions (plan, recommendation), just mark as accepted
    await supabase
      .from('autoglm_suggestions')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', suggestion_id);

    return NextResponse.json({
      success: true,
      action: 'accepted',
    });
  } catch (error: any) {
    console.error('Accept/reject suggestion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process suggestion' },
      { status: 500 }
    );
  }
}
