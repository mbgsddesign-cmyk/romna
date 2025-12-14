import { NextRequest, NextResponse } from 'next/server';
import { GmailProvider } from '@/lib/email/gmail';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
    // Generate state with userId + random token for CSRF?
    // User auth required
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { cookie: req.headers.get('cookie')! } } }
    );
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.redirect(new URL('/auth/login', req.nextUrl));
    }

    // Embed userId in state for callback verification (simple version)
    // Production should use server-side stored state or signed JWT state
    const state = Buffer.from(JSON.stringify({ userId: user.id, nonce: Math.random() })).toString('base64');

    const url = GmailProvider.getAuthUrl(state);
    return NextResponse.redirect(url);
}
