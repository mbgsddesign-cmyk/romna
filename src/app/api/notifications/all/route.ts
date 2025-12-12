import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    // For server-side API routes, we use service role to bypass RLS
    // Frontend should pass user context if needed, or we rely on auth cookie
    
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Only fetch notifications that are scheduled for now or in the past
    query = query.lte('scheduled_for', new Date().toISOString());

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Notifications query error:', error);
      return NextResponse.json({ success: true, notifications: [] }, { status: 200 });
    }

    return NextResponse.json({ success: true, notifications: notifications || [] });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ success: true, notifications: [] }, { status: 200 });
  }
}
