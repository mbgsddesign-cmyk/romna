import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { plan_json } = await req.json();

    if (!plan_json) {
      return NextResponse.json({ error: 'plan_json required' }, { status: 400 });
    }

    const insight = generateAIInsight(plan_json);
    const suggestion = generateAISuggestion(plan_json);

    return NextResponse.json({
      success: true,
      insight,
      suggestion,
    });
  } catch (error: any) {
    console.error('AutoGLM summary error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    );
  }
}

function generateAIInsight(plan: any): string {
  const { top_now, next, conflicts } = plan;
  
  if (conflicts && conflicts.length > 0) {
    return `⚠️ You have ${conflicts.length} scheduling conflict(s) that need attention.`;
  }
  
  if (top_now && top_now.length > 0) {
    return `🎯 Focus on ${top_now.length} high-priority task${top_now.length > 1 ? 's' : ''} right now.`;
  }
  
  if (next && next.length > 0) {
    return `📋 ${next.length} task${next.length > 1 ? 's' : ''} scheduled for later today.`;
  }
  
  return `✅ All clear! No urgent tasks at the moment.`;
}

function generateAISuggestion(plan: any): string {
  const { top_now, next, focus_blocks, conflicts } = plan;
  
  if (conflicts && conflicts.length > 0) {
    return `Review your schedule and resolve ${conflicts[0].type} conflicts first.`;
  }
  
  if (focus_blocks && focus_blocks.length > 0) {
    const nextBlock = focus_blocks[0];
    return `Consider blocking ${nextBlock.time} for deep work on: ${nextBlock.reason}`;
  }
  
  if (top_now && top_now.length > 2) {
    return `You have ${top_now.length} urgent tasks. Tackle the most important one first.`;
  }
  
  if (next && next.length > 0) {
    return `Plan your next ${Math.min(next.length, 3)} tasks to stay ahead.`;
  }
  
  return `Take a break or plan tomorrow's priorities.`;
}
