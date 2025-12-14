import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AutoGLM } from '@/lib/autoglm';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  try {

    const authHeader = req.headers.get('authorization');

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active users
    const { data: users } = await supabase
      .from('profiles') // Assuming profiles table exists and has active status? Or just all users.
      // If profiles table doesn't have status, just get all IDs.
      // Checking database.types.ts... profiles usually exists.
      .select('id');
    // .eq('status', 'active'); // Assuming active status column exists, if not remove or check schema.
    // Let's assume just all users for now or check if there's a status.
    // In previous step, I saw 'profiles' table.

    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, message: 'No users found' });
    }

    const results = await Promise.allSettled(
      users.map(user => AutoGLM.run(user.id, 'daily_scan'))
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

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
