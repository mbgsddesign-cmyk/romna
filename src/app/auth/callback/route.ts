import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, onboarding_completed')
        .eq('id', data.user.id)
        .single();

      if (!existingProfile) {
        const name = data.user.user_metadata?.name || 
                     data.user.user_metadata?.full_name || 
                     data.user.email?.split('@')[0] || 
                     'User';

        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email,
          name: name,
          role: 'USER',
          status: 'active',
          onboarding_completed: false,
        });

        await supabase.from('subscriptions').insert({
          user_id: data.user.id,
          plan: 'free',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

        const monthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        await supabase.from('usage_tracking').insert({
          user_id: data.user.id,
          month_year: monthYear,
          ai_tokens_used: 0,
          voice_minutes_used: 0,
          whatsapp_messages_sent: 0,
          emails_sent: 0,
        });

        await supabase.from('audit_logs').insert({
          user_id: data.user.id,
          action: 'user_oauth_signup',
          entity_type: 'user',
          entity_id: data.user.id,
        });

        return NextResponse.redirect(new URL('/onboarding', origin));
      }

      if (!existingProfile.onboarding_completed) {
        return NextResponse.redirect(new URL('/onboarding', origin));
      }

      return NextResponse.redirect(new URL('/', origin));
    }
  }

  return NextResponse.redirect(new URL('/auth/login?error=auth_failed', origin));
}