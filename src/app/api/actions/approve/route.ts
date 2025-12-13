import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ExecutionService } from '@/lib/execution/execution-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Approval Flow API
 * User approves/cancels execution plans (email, whatsapp)
 */
export async function POST(req: NextRequest) {
  try {
    const { planId, action } = await req.json();

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
      const success = await executionService.approvePlan(planId, user.id);
      
      if (!success) {
        return NextResponse.json(
          { success: false, error: 'Failed to approve plan' },
          { status: 500 }
        );
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
