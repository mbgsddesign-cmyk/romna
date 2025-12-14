import { NextRequest, NextResponse } from 'next/server';
import { GmailProvider } from '@/lib/email/gmail';
import { createClient } from '@supabase/supabase-js';
import { CryptoUtils } from '@/lib/security/crypto';

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');

    if (!code || !state) return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });

    try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        const userIdFromState = decodedState.userId;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY! // Use Service Role to write encrypted creds safely? Or just Anon if RLS allows.
            // RLS "Users can insert their own" allows Anon. But we need to ensure we are that user.
            // We can reuse the `cookie` approach to get the current authenticated user session.
        );

        // Verify Session
        const supabaseAuth = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { cookie: req.headers.get('cookie')! } } }
        );
        const { data: { user } } = await supabaseAuth.auth.getUser();

        if (!user || user.id !== userIdFromState) {
            return NextResponse.redirect(new URL('/auth/login?error=state_mismatch', req.nextUrl));
        }

        // Exchange Tokens
        const tokens = await GmailProvider.getTokens(code);

        // Encrypt Tokens
        const encrypted = CryptoUtils.encryptJson({
            refresh_token: tokens.refresh_token,
            access_token: tokens.access_token,
            expiry_date: tokens.expiry_date
        });

        // Insert/Update Account
        // Check if exists? Upsert on email address?
        // We don't have email address yet. 
        // Ideally fetch from Google UserInfo endpoint, but GmailProvider needs update for that.
        // For now, save as 'Pending Gmail' or generic.

        // Let's assume user wants to connect *this* generic Gmail.
        await supabase.from('email_accounts').insert({
            user_id: user.id,
            provider: 'gmail',
            email_address: 'gmail_connected@google.com', // Placeholder, ideally fetch real one
            display_name: 'Gmail',
            is_default: true,
            credentials_encrypted: encrypted
        });

        return NextResponse.redirect(new URL('/settings?success=gmail_connected', req.nextUrl));

    } catch (error) {
        console.error("Auth Callback Error", error);
        return NextResponse.redirect(new URL('/settings?error=gmail_failed', req.nextUrl));
    }
}
