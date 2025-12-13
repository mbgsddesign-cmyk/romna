import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
  }

  const supabase = createServerClient();

  try {
    const { data: plans, error } = await supabase
      .from('execution_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Execution Plans API] Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, plans: plans || [] });
  } catch (err: any) {
    console.error('[Execution Plans API] Unexpected error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
