import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: insights, error } = await supabase
      .from('insights')
      .select('*')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Insights query error:', error);
      return NextResponse.json({ success: true, insights: [] }, { status: 200 });
    }

    return NextResponse.json({ success: true, insights: insights || [] });
  } catch (error: any) {
    console.error('Get today insights error:', error);
    return NextResponse.json({ success: true, insights: [] }, { status: 200 });
  }
}
