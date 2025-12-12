
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NotificationDispatcher } from '@/lib/notification-dispatcher';
import { AutoGLM } from '@/lib/autoglm';

export async function POST(req: NextRequest) {
  // Security check
  const secret = req.headers.get('x-admin-secret');
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const report: any = {
    scenarios: [],
    risks: [],
    readiness: 'PENDING'
  };

  const log = (scenario: string, passed: boolean, details?: string) => {
    report.scenarios.push({ scenario, passed, details });
  };

  try {
    // 0. Setup Test User
    const testEmail = 'qa_notification_tester@orchids.ai';
    // Use upsert to ensure user exists
    // Actually creating a user in auth is harder via script without admin API if not enabled?
    // We have service role key, so auth.admin is available.
    
    let userId = '';
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === testEmail);
    
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: { name: 'QA Tester' }
      });
      if (error) throw error;
      if (!newUser.user) throw new Error('Failed to create user');
      userId = newUser.user.id;
    }

    // Ensure user_preferences exist
    await supabase.from('user_preferences').upsert({
        user_id: userId,
        plan_tier: 'pro',
        ai_opt_in: true,
        timezone: 'UTC'
    });

    // Cleanup
    await supabase.from('notifications').delete().eq('user_id', userId);
    await supabase.from('user_activity').delete().eq('user_id', userId);
    await supabase.from('ai_sessions').delete().eq('user_id', userId);

    const dispatcher = new NotificationDispatcher(supabase);

    // --- SCENARIO 1: AI Insight -> Notification -> Push (Success) ---
    // Test: Pro user, Opt-in, High Priority
    const s1_payload = {
        title: 'S1 Test',
        body: 'Success Scenario',
        priority: 'high' as const,
        category: 'ai'
    };
    const s1_res = await dispatcher.dispatch(userId, s1_payload, { 
        plan_tier: 'pro', ai_opt_in: true, timezone: 'UTC' 
    });
    
    // Verify DB
    const { data: s1_notifs } = await supabase.from('notifications').select('*').eq('user_id', userId).eq('title', 'S1 Test');
    if (s1_res.success && s1_notifs && s1_notifs.length === 1) {
        log('1. AI Insight -> Notification -> Push', true, 'Dispatched and found in DB');
    } else {
        log('1. AI Insight -> Notification -> Push', false, `Result: ${s1_res.success}, DB count: ${s1_notifs?.length}`);
    }

    // --- SCENARIO 2: Duplicate Insight -> No Push ---
    // Note: AutoGLM logic includes 'current_time' in hash, so simple re-run won't trigger duplicate.
    // We will flag this risk if we confirm it doesn't dedup.
    // Let's try to run AutoGLM twice with same context input (but internally it adds timestamp).
    // If it fails to dedup (which we expect), we flag the risk.
    
    // We can't easily test AutoGLM dedup without mocking Date or modifying code.
    // Instead, we will simulate the requirement check:
    // Does NotificationDispatcher dedup? No.
    // Does AutoGLM dedup? Yes, but flawed implementation.
    // We will skip actual execution of AutoGLM to avoid OpenAI calls/errors and just flag the code analysis result.
    // OR we can test inserting a session manually with a hash we can control if we could control the input to AutoGLM completely.
    // Since we can't control 'current_time' inside AutoGLM, we mark this as RISK.
    log('2. Duplicate Insight -> No Push', false, 'RISK: AutoGLM includes timestamp in context hash, likely preventing deduplication.');
    report.risks.push('AutoGLM duplication logic includes current_time, making context hash unique every ms.');


    // --- SCENARIO 3: Free user over limit -> Blocked ---
    // Setup: Free Tier
    // Reset notifications
    await supabase.from('notifications').delete().eq('user_id', userId);
    
    const freePrefs = { plan_tier: 'free', ai_opt_in: true, timezone: 'UTC' };
    // 1st (Allowed)
    await dispatcher.dispatch(userId, { title: 'F1', body: 'b', priority: 'high', category: 'ai' }, freePrefs);
    // 2nd (Allowed)
    await dispatcher.dispatch(userId, { title: 'F2', body: 'b', priority: 'high', category: 'ai' }, freePrefs);
    // 3rd (Blocked)
    const s3_res = await dispatcher.dispatch(userId, { title: 'F3', body: 'b', priority: 'high', category: 'ai' }, freePrefs);

    if (!s3_res.success && s3_res.skipped && s3_res.reason === 'daily_limit_reached') {
        log('3. Free user over limit -> Blocked', true, 'Correctly blocked 3rd notification');
    } else {
        log('3. Free user over limit -> Blocked', false, `Failed to block. Result: ${JSON.stringify(s3_res)}`);
    }

    // --- SCENARIO 4: ai_opt_in = false -> No Push ---
    const s4_res = await dispatcher.dispatch(userId, { title: 'OptOut', body: 'b', priority: 'high', category: 'ai' }, {
        plan_tier: 'pro', ai_opt_in: false
    });
    
    if (!s4_res.success && s4_res.skipped && s4_res.reason === 'ai_opt_out') {
        log('4. ai_opt_in = false -> No Push', true, 'Correctly skipped');
    } else {
        log('4. ai_opt_in = false -> No Push', false, `Failed to skip. Result: ${JSON.stringify(s4_res)}`);
    }

    // --- SCENARIO 5: Quiet hours -> Delayed Push ---
    // Calculate a window that includes NOW.
    const now = new Date();
    const utcHour = now.getUTCHours();
    // Start = 1 hour ago, End = 1 hour from now. 
    // Example: Now 14:00. Start 13:00, End 15:00.
    // If Now 23:30. Start 22:30. End 00:30. (Cross day boundary).
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    const startD = new Date(now.getTime() - 60 * 60 * 1000); // -1h
    const endD = new Date(now.getTime() + 60 * 60 * 1000);   // +1h
    
    const startStr = `${pad(startD.getUTCHours())}:${pad(startD.getUTCMinutes())}`;
    const endStr = `${pad(endD.getUTCHours())}:${pad(endD.getUTCMinutes())}`;
    
    const quietPrefs = {
        plan_tier: 'pro',
        ai_opt_in: true,
        timezone: 'UTC',
        quiet_hours_enabled: true,
        quiet_hours_start: startStr,
        quiet_hours_end: endStr
    };

    const s5_res = await dispatcher.dispatch(userId, { 
        title: 'Quiet', body: 'Shh', priority: 'normal', category: 'ai' 
    }, quietPrefs);

    if (s5_res.success && s5_res.reason === 'scheduled_for_later') {
         // Verify scheduled_for > now
         const { data: s5_notif } = await supabase.from('notifications').select('*').eq('user_id', userId).eq('title', 'Quiet').single();
         if (s5_notif && new Date(s5_notif.scheduled_for!) > now) {
             log('5. Quiet hours -> Delayed Push', true, `Scheduled for ${s5_notif.scheduled_for}`);
         } else {
             log('5. Quiet hours -> Delayed Push', false, 'Scheduled time invalid or not found');
         }
    } else {
         log('5. Quiet hours -> Delayed Push', false, `Failed to delay. Result: ${JSON.stringify(s5_res)}`);
    }

    // Summary
    const passedCount = report.scenarios.filter((s: any) => s.passed).length;
    report.readiness = (passedCount >= 4 && report.risks.length === 0) ? 'READY' : 'RISKS_IDENTIFIED';
    
    return NextResponse.json(report);

  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
