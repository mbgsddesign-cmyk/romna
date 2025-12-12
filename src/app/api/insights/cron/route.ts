import { NextRequest, NextResponse } from 'next/server';
import { AIInsightsService } from '@/services/ai-insights.service';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('status', 'active');

    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, message: 'No active users' });
    }

    const results = await Promise.allSettled(
      users.map(user => AIInsightsService.generateDailyInsight(user.id))
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
    
    return NextResponse.json({ 
      success: true, 
      processed: users.length,
      successful: successCount 
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}