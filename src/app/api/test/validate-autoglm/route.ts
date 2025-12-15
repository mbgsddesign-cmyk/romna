import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic to prevent build-time env access
export const dynamic = 'force-dynamic';

// Lazy import to avoid build-time errors
async function getAutoGLM() {
  const { AutoGLM } = await import('@/lib/autoglm');
  return AutoGLM;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const logs: string[] = [];
  const log = (msg: string) => logs.push(msg);

  try {
    // 1. Get or Create Test User
    const testEmail = 'romna_validator@test.com';
    let { data: { users } } = await supabase.auth.admin.listUsers();
    let user = users.find(u => u.email === testEmail);

    if (!user) {
      log('Creating test user...');
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'password123',
        email_confirm: true,
        user_metadata: { name: 'Romna Validator' }
      });
      if (error) throw error;
      if (!newUser.user) throw new Error('Failed to create user');
      user = newUser.user;

      // Ensure profile exists
      await supabase.from('profiles').upsert({ id: user.id, email: testEmail, name: 'Romna Validator' });
    }
    log(`Test user: ${user.id}`);

    // Cleanup previous test data
    await supabase.from('voice_notes').delete().eq('user_id', user.id);
    await supabase.from('notifications').delete().eq('user_id', user.id);
    await supabase.from('user_activity').delete().eq('user_id', user.id);
    await supabase.from('tasks').delete().eq('user_id', user.id);
    await supabase.from('ai_sessions').delete().eq('user_id', user.id);

    // --- Scenario 1: Voice Trigger ---
    log('--- Scenario 1: Voice Trigger ---');
    const { data: voiceNote } = await supabase.from('voice_notes').insert({
      user_id: user.id,
      transcription: "Remind me to call John at 5pm today about the project.",
      intent: "reminder",
      confidence: 0.85,
      processed: false
    }).select().single();

    if (voiceNote) {
      log(`Created voice note: ${voiceNote.id}`);
      // Run AutoGLM (lazy loaded)
      const AutoGLM = await getAutoGLM();
      const result = await AutoGLM.run(user.id, 'voice_intent', { voice_note_id: voiceNote.id });
      log(`AutoGLM Result: ${JSON.stringify(result)}`);

      // Verify side effects
      const { data: notifications } = await supabase.from('notifications').select().eq('user_id', user.id);
      log(`Notifications generated: ${notifications?.length}`);
      if (notifications?.length) {
        log(`Notification[0]: ${notifications[0].title} - ${notifications[0].message}`);
      }
    }

    // --- Scenario 2: Daily Task Scan ---
    log('--- Scenario 2: Daily Task Scan ---');
    await supabase.from('tasks').insert([
      { user_id: user.id, title: "Submit Q3 Report", due_date: new Date().toISOString(), status: 'pending' },
      { user_id: user.id, title: "Buy Groceries", due_date: new Date().toISOString(), status: 'pending' },
      { user_id: user.id, title: "Call Mom", due_date: new Date().toISOString(), status: 'pending' }
    ]);

    const AutoGLMClass = await getAutoGLM();
    const scanResult = await AutoGLMClass.run(user.id, 'daily_scan');
    log(`Daily Scan Result: ${JSON.stringify(scanResult)}`);

    // --- Scenario 4: Duplication Control ---
    log('--- Scenario 4: Duplication Control ---');
    const dupResult = await AutoGLMClass.run(user.id, 'daily_scan');
    log(`Duplication Result: ${JSON.stringify(dupResult)}`);

    return NextResponse.json({ success: true, logs });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message, stack: error.stack, logs }, { status: 500 });
  }
}
