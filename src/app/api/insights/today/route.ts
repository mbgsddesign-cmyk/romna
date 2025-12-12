import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: true, insights: [] }, { status: 200 });
    }

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