import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runAutoGLM } from '@/lib/autoglm/orchestrator';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const revalidate = 0;


/**
 * POST /api/autoglm/run
 * Triggers AutoGLM orchestrator
 * 
 * Body: {
 *   trigger: 'daily_scan' | 'voice_intent' | 'on_open_app' | 'manual',
 *   user_id: string
 * }
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  try {
    const { trigger, user_id } = await req.json();

    if (!user_id || !trigger) {
      return NextResponse.json(
        { error: 'user_id and trigger required' },
        { status: 400 }
      );
    }

    // Fetch user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Check opt-in status
    const aiOptIn = preferences?.ai_opt_in ?? false;

    // Check if should run (rate limiting)
    if (trigger === 'on_open_app') {
      const { data: lastRun } = await supabase
        .from('autoglm_runs')
        .select('started_at')
        .eq('user_id', user_id)
        .eq('trigger', 'on_open_app')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (lastRun) {
        const hoursSinceLastRun =
          (Date.now() - new Date(lastRun.started_at).getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastRun < 6) {
          return NextResponse.json({
            success: true,
            skipped: true,
            reason: 'Last run was less than 6 hours ago',
          });
        }
      }
    }

    // Run AutoGLM
    const output = await runAutoGLM({
      user_id,
      trigger,
      context: {
        timezone: preferences?.timezone,
        working_hours: {
          start: preferences?.working_hours_start || '09:00',
          end: preferences?.working_hours_end || '17:00',
        },
        focus_block_minutes: preferences?.focus_block_minutes || 90,
        ai_opt_in: aiOptIn,
      },
    });

    return NextResponse.json({
      success: true,
      output,
    });
  } catch (error: any) {
    console.error('AutoGLM run error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run AutoGLM' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/autoglm/run?userId=xxx
 * Get latest AutoGLM run results
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  try {
    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Get latest successful run
    const { data: run } = await supabase
      .from('autoglm_runs')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'success')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (!run) {
      return NextResponse.json({
        success: true,
        run: null,
        suggestions: [],
      });
    }

    // Get suggestions from this run
    const { data: suggestions } = await supabase
      .from('autoglm_suggestions')
      .select('*')
      .eq('run_id', run.id)
      .is('accepted_at', null)
      .is('rejected_at', null)
      .order('confidence', { ascending: false });

    return NextResponse.json({
      success: true,
      run,
      suggestions: suggestions || [],
    });
  } catch (error: any) {
    console.error('Get AutoGLM run error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get AutoGLM run' },
      { status: 500 }
    );
  }
}
