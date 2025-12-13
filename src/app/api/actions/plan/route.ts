import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ExecutionService } from '@/lib/execution/execution-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Plan Creation API
 * Creates execution plans from user input (voice, UI, etc.)
 * POST /api/actions/plan
 */
export async function POST(req: NextRequest) {
  try {
    const {
      intent,
      naturalLanguage,
      payload,
      scheduledFor,
      source = 'ask',
    } = await req.json();

    if (!intent) {
      return NextResponse.json(
        { success: false, error: 'Missing intent' },
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

    // Determine if approval is required
    const requiresApproval = ['email', 'whatsapp'].includes(intent);

    // Determine scheduled_for
    let finalScheduledFor = scheduledFor || new Date().toISOString();
    
    // If it's a reminder with future time, use that
    if (intent === 'reminder' && payload?.scheduledFor) {
      finalScheduledFor = payload.scheduledFor;
    }

    // Create execution plan
    const plan = await executionService.createPlan({
      user_id: user.id,
      source: source as 'voice' | 'ask' | 'button',
      intent_type: intent,
      scheduled_for: finalScheduledFor,
      requires_approval: requiresApproval,
      payload: {
        ...payload,
        naturalLanguage,
        userId: user.id,
      },
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Failed to create execution plan' },
        { status: 500 }
      );
    }

    // If no approval required and scheduled for now, enqueue immediately
    if (!requiresApproval && new Date(finalScheduledFor) <= new Date()) {
      const typeMap: Record<string, 'notification' | 'alarm' | 'email' | 'whatsapp'> = {
        reminder: 'notification',
        alarm: 'alarm',
        email: 'email',
        whatsapp: 'whatsapp',
        notification: 'notification',
      };

      const executionType = typeMap[intent] || 'notification';

      await executionService.enqueue({
        execution_plan_id: plan.id,
        user_id: user.id,
        type: executionType,
        scheduled_for: finalScheduledFor,
        payload: plan.payload,
      });
    }

    // Determine next step for UI
    let nextStep: 'needs_approval' | 'scheduled' | 'executed' | 'failed';
    if (requiresApproval) {
      nextStep = 'needs_approval';
    } else if (new Date(finalScheduledFor) > new Date()) {
      nextStep = 'scheduled';
    } else {
      nextStep = 'executed';
    }

    return NextResponse.json({
      success: true,
      planId: plan.id,
      status: plan.status,
      nextStep,
      uiHints: {
        message: requiresApproval
          ? 'Plan created. Please approve to execute.'
          : new Date(finalScheduledFor) > new Date()
          ? `Scheduled for ${new Date(finalScheduledFor).toLocaleString()}`
          : 'Executing now...',
        requiresApproval,
        scheduledFor: finalScheduledFor,
      },
    });
  } catch (error) {
    console.error('[Plan API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Plan creation failed',
      },
      { status: 500 }
    );
  }
}
