import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get user from auth header to respect RLS or filter manually
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
         return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id) // Explicitly filter by user_id
      .order('created_at', { ascending: false })
      .limit(50);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

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
