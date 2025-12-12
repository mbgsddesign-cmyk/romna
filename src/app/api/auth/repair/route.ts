import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getCurrentMonthYear() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!existingProfile) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: 'USER',
          status: 'active',
          onboarding_completed: false,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!existingSubscription) {
      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan: 'free',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (subError) {
        console.error('Subscription creation error:', subError);
      }
    }

    const monthYear = getCurrentMonthYear();
    const { data: existingUsage } = await supabaseAdmin
      .from('usage_tracking')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_year', monthYear)
      .single();

    if (!existingUsage) {
      const { error: usageError } = await supabaseAdmin
        .from('usage_tracking')
        .insert({
          user_id: user.id,
          month_year: monthYear,
          ai_tokens_used: 0,
          voice_minutes_used: 0,
          whatsapp_messages_sent: 0,
          emails_sent: 0,
        });

      if (usageError) {
        console.error('Usage tracking creation error:', usageError);
      }
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: usage } = await supabaseAdmin
      .from('usage_tracking')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_year', monthYear)
      .single();

    const { data: integrations } = await supabaseAdmin
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      profile,
      subscription,
      usage,
      integrations: integrations || [],
    });
  } catch (error) {
    console.error('Auth repair error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
