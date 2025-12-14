import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ExecutionService } from '@/lib/execution/execution-service';
import { EmailManager } from '@/lib/email/manager'; // [NEW]

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Approval Flow API
 * User approves/cancels execution plans (email, whatsapp)
 */
export async function POST(req: NextRequest) {
  try {
    const { planId, action, payload } = await req.json(); // Accept payload

    if (!planId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing planId or action' },
        { status: 400 }
      );
    }

    if (!['approve', 'cancel'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use approve or cancel' },
        { status: 400 }
      );
    }

    // Get auth token from header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 }
      );
    }

    const executionService = new ExecutionService(supabase);

    if (action === 'approve') {
      // [V5] Pre-Approval Validation for WhatsApp
      if (payload && payload.to && typeof payload.to === 'object' && payload.to.unresolved) {
        return NextResponse.json(
          { success: false, error: 'Cannot approve plan with unresolved recipient.' },
          { status: 400 }
        );
      }

      const success = await executionService.approvePlan(planId, user.id, payload);

      if (!success) {
        return NextResponse.json(
          { success: false, error: 'Failed to approve plan' },
          { status: 500 }
        );
      }

      // [V5] Immediate Execution for Emails (Simulate Worker)
      // Check if plan was email type?
      // We need to fetch plan again or check payload if we trust it?
      // Better to check DB, but for speed let's just try EmailManager if payload has email fields.
      // Actually `approvePlan` returns boolean. 
      // We will perform a "Post-Approval Hook" based on plan type. 
      // Fetch plan type safely:
      const { data: plan } = await supabase.from('execution_plans').select('*').eq('id', planId).single();

      if (plan && plan.intent_type === 'email') {
        console.log('[Approve API] Executing Email immediately...');
        try {
          // Pass userId to resolve default account if needed
          const result = await EmailManager.sendPlan(plan.payload, user.id);

          // Log Success
          await supabase.from('execution_events').insert({
            execution_plan_id: planId,
            user_id: user.id,
            event_type: 'EXECUTED',
            metadata: { provider: result.provider, id: result.id }
          });
          // Status -> executed
          await supabase.from('execution_plans').update({ status: 'executed' }).eq('id', planId);
          await supabase.from('execution_queue').update({ status: 'executed' }).eq('execution_plan_id', planId);

          return NextResponse.json({ success: true, message: 'Email approved and sent' });

        } catch (execErr: any) {
          console.error('[Approve API] Execution Failed:', execErr);
          // Log Failure
          await supabase.from('execution_events').insert({
            execution_plan_id: planId,
            user_id: user.id,
            event_type: 'FAILED',
            metadata: { error: execErr.message }
          });
          await supabase.from('execution_queue').update({ status: 'failed', last_error: execErr.message }).eq('execution_plan_id', planId);

          // Return success true generally because approval worked, but warn?
          return NextResponse.json({ success: false, error: 'Approved but failed to send: ' + execErr.message }, { status: 500 });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Plan approved and scheduled for execution',
      });
    } else {
      // cancel
      const success = await executionService.cancelPlan(planId, user.id);

      if (!success) {
        return NextResponse.json(
          { success: false, error: 'Failed to cancel plan' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Plan cancelled',
      });
    }
  } catch (error) {
    console.error('[Approve API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Approval failed',
      },
      { status: 500 }
    );
  }
}
