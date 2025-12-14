import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const { data: insights, error } = await supabase
      .from('insights')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, insights: insights || [] });
  } catch (error: any) {
    console.error('Get week insights error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
