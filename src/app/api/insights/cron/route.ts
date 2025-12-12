import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { generateDailyInsight } from '@/services/ai-insights.service';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(100);

    if (error) throw error;

    const results = [];
    for (const user of users || []) {
      try {
        const insight = await generateDailyInsight(user.id);
        results.push({ userId: user.id, success: true, insight });
      } catch (err: any) {
        results.push({ userId: user.id, success: false, error: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: results.length,
      results 
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    );
  }
}
