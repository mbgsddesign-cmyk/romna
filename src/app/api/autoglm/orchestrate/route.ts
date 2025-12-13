import { NextRequest, NextResponse } from 'next/server';
import { runDayOrchestrator } from '@/lib/autoglm/orchestrator-core';

export const revalidate = 0;

/**
 * GET /api/autoglm/orchestrate?userId=xxx
 * Runs the AI Day Orchestrator and returns the current active task decision
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const decision = await runDayOrchestrator({
      user_id: userId,
      trigger: 'manual',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      current_time: new Date(),
    });

    return NextResponse.json({
      success: true,
      decision,
    });
  } catch (error: any) {
    console.error('Orchestrator error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run orchestrator' },
      { status: 500 }
    );
  }
}
