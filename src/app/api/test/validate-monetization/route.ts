import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { NotificationDispatcher } from '@/lib/notification-dispatcher';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const adminSecret = req.headers.get('x-admin-secret');
    if (adminSecret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Setup Test User (Mock ID)
    const testUserId = 'test-user-monetization-' + Date.now();
    
    // Create mock user prefs (Free Tier)
    const { error: insertError } = await supabase.from('user_preferences').insert({
      user_id: testUserId,
      ai_opt_in: true,
      plan_tier: 'free',
      timezone: 'UTC'
    });

    if (insertError) {
        return NextResponse.json({ error: 'Setup failed', details: insertError }, { status: 500 });
    }

    // Verify prefs were saved
    const { data: verifyPrefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', testUserId)
        .single();
    
    console.log('Setup Prefs:', verifyPrefs);

    const dispatcher = new NotificationDispatcher(supabase);

    const results = [];

    // SCENARIO 1: Free Tier Limit & Upsell
    // Insert 2 dummy notifications to hit limit
    await supabase.from('notifications').insert([
        { user_id: testUserId, type: 'ai', category: 'ai', title: '1', message: '1', priority: 'high', scheduled_for: new Date().toISOString() },
        { user_id: testUserId, type: 'ai', category: 'ai', title: '2', message: '2', priority: 'high', scheduled_for: new Date().toISOString() }
    ]);

    // Dispatch 3rd notification -> Should block & Trigger Upsell
    const res1 = await dispatcher.dispatch(testUserId, {
        title: 'Blocked Notification',
        body: 'Should trigger upsell',
        priority: 'high',
        category: 'ai'
    });

    // Verify Blocked
    if (res1.success === false && res1.reason === 'daily_limit_reached') {
        results.push({ scenario: '1a. Rate Limit Block', passed: true });
    } else {
        results.push({ scenario: '1a. Rate Limit Block', passed: false, details: res1 });
    }

    // Verify Upsell Created
    const { data: upsells } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', testUserId)
        .eq('category', 'upgrade');
    
    if (upsells && upsells.length === 1) {
        results.push({ scenario: '1b. Upsell Triggered', passed: true, id: upsells[0].id });
    } else {
        results.push({ scenario: '1b. Upsell Triggered', passed: false, count: upsells?.length });
    }

    // Verify Upsell Impression Logged
    const { data: logs } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', testUserId)
        .eq('action', 'upsell_impression');
    
    if (logs && logs.length === 1) {
        results.push({ scenario: '1c. Upsell Logged', passed: true });
    } else {
        results.push({ scenario: '1c. Upsell Logged', passed: false });
    }

    // SCENARIO 2: Metadata Pass-through (Pro Eligible)
    const res2 = await dispatcher.dispatch(testUserId, { // This will be blocked by rate limit again, but dispatch logic check upsell limit
        title: 'High Impact',
        body: 'This is high impact',
        priority: 'high',
        category: 'ai',
        metadata: { pro_eligible: true }
    });
    
    // We expect it to be blocked again
    // And we expect NO new upsell because of 24h limit
    const { data: upsells2 } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', testUserId)
        .eq('category', 'upgrade');
    
    if (upsells2 && upsells2.length === 1) {
        results.push({ scenario: '2. Upsell Throttled (Max 1/24h)', passed: true });
    } else {
        results.push({ scenario: '2. Upsell Throttled (Max 1/24h)', passed: false, count: upsells2?.length });
    }


    // Cleanup
    await supabase.from('user_preferences').delete().eq('user_id', testUserId);
    await supabase.from('notifications').delete().eq('user_id', testUserId);
    await supabase.from('user_activity').delete().eq('user_id', testUserId);

    return NextResponse.json({ results });

  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}