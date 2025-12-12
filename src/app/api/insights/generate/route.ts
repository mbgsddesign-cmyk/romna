import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { generateDailyInsight } from '@/services/ai-insights.service';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const insight = await generateDailyInsight(user.id);
    
    return NextResponse.json({ success: true, insight });
  } catch (error: any) {
    console.error('Generate insight error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate insight' },
      { status: 500 }
    );
  }
}
