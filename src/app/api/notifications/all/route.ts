import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 30; // Revalidate every 30 seconds

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json({ 
        success: false,
        error: 'userId is required' 
      }, { status: 400 });
    }
    
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
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