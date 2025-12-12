import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { detectMeetingConflicts } from '@/services/notification-intelligence.service';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conflicts = await detectMeetingConflicts(user.id);

    return NextResponse.json({ success: true, conflicts });
  } catch (error: any) {
    console.error('Detect conflicts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to detect conflicts' },
      { status: 500 }
    );
  }
}
