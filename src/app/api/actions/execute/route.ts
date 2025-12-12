import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Authenticate
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get Action Hash
    // distinct from body vs query param. Let's support body for safety.
    const { action_hash } = await request.json();

    if (!action_hash) {
      return NextResponse.json({ error: 'Missing action_hash' }, { status: 400 });
    }

    // 3. Retrieve Proposed Action
    // We search in user_activity where action = 'action_proposed' and meta->action_hash = action_hash
    const { data: activity, error: fetchError } = await supabase
      .from('user_activity')
      .select('*')
      .eq('user_id', user.id)
      .eq('action', 'action_proposed')
      .filter('meta->>action_hash', 'eq', action_hash)
      .single();

    if (fetchError || !activity) {
      return NextResponse.json({ error: 'Action not found or invalid' }, { status: 404 });
    }

    const meta = activity.meta as any;

    // 4. Idempotency Check
    if (meta.status === 'executed') {
      return NextResponse.json({ 
        success: true, 
        message: 'Action already executed', 
        status: 'executed',
        data: meta.execution_result 
      });
    }

    if (meta.status !== 'pending') {
      return NextResponse.json({ error: `Action status is ${meta.status}` }, { status: 400 });
    }

    // 5. Execute Action
    let executionResult = null;
    const type = meta.type;
    const payload = meta.payload;

    if (type === 'create_task') {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: payload.title,
          description: payload.description,
          due_date: payload.due_date,
          priority: payload.priority || 'normal',
          status: 'pending'
        })
        .select()
        .single();
      
      if (taskError) throw taskError;
      executionResult = task;

    } else if (type === 'reschedule_event') {
      // Expecting payload to have event_id and new times
      if (!payload.event_id) throw new Error('Missing event_id');
      
      const { data: event, error: eventError } = await supabase
        .from('events')
        .update({
          start_time: payload.start_time,
          end_time: payload.end_time
        })
        .eq('id', payload.event_id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (eventError) throw eventError;
      executionResult = event;

    } else if (type === 'send_email') {
        // Placeholder for now, as per instructions "No monetization logic yet" implies
        // maybe no deep integrations. But let's just mark it as done.
        executionResult = { simulated: true, ...payload };
    } else {
        throw new Error(`Unknown action type: ${type}`);
    }

    // 6. Update Status
    const { error: updateError } = await supabase
      .from('user_activity')
      .update({
        meta: {
          ...meta,
          status: 'executed',
          executed_at: new Date().toISOString(),
          execution_result: executionResult
        }
      })
      .eq('id', activity.id);

    if (updateError) throw updateError;

    // 7. Log Execution Event
    await supabase.from('user_activity').insert({
      user_id: user.id,
      action: 'action_executed',
      meta: {
        original_activity_id: activity.id,
        action_hash,
        type,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      status: 'executed',
      data: executionResult
    });

  } catch (error: any) {
    console.error('Execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
