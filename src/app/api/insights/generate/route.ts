import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { AIInsightsService } from '@/services/ai-insights.service';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    const insight = await AIInsightsService.generateDailyInsight(userId);
    
    if (!insight) {
      return NextResponse.json({ success: false, error: 'Failed to generate insight' }, { status: 500 });
    }

    return NextResponse.json({ success: true, insight });
  } catch (error: any) {
    console.error('Generate insight error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}