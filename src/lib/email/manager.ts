import { GmailProvider } from './gmail';
import { ResendProvider } from './resend';
import { CryptoUtils } from '@/lib/security/crypto'; // [CHANGED]
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '@/lib/config';

const getSupabaseAdmin = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY! // Fallback
    );
};

export const EmailManager = {
    resolveAccount: async (userId: string, accountId?: string) => {
        const supabaseAdmin = getSupabaseAdmin();
        let query = supabaseAdmin.from('email_accounts').select('*').eq('user_id', userId);

        if (accountId) {
            query = query.eq('id', accountId);
        } else {
            query = query.eq('is_default', true);
        }

        const { data, error } = await query.single();
        if (error || !data) {
            // If no default, try getting *any* account? Logic says:
            // "if no default: return error 'No email account connected'"
            throw new Error("No connected email account found (or account not found).");
        }
        return data;
    },

    sendPlan: async (planPayload: any, userId: string) => { // userId required for resolving default
        const { to, subject, body, from_account_id } = planPayload;

        // 1. Resolve Account
        const account = await EmailManager.resolveAccount(userId, from_account_id);

        // 2. Decrypt Credentials
        // Schema: credentials_encrypted (text) contains JSON string of credentials
        const credentials = CryptoUtils.decryptJson<any>(account.credentials_encrypted);

        // 3. Route by Provider
        if (account.provider === 'gmail') {
            // gmail credentials: { refresh_token: ... }
            if (!credentials.refresh_token) throw new Error("Invalid Gmail credentials");
            return await GmailProvider.send(credentials.refresh_token, { to, subject, body });
        }
        else if (account.provider === 'resend') {
            // resend credentials: { apiKeyHint: 'resend', fromEmail: ... }
            // prompt: "store in email_accounts ... fromEmail"
            // Use "From" email in account (stored in `email_address` or `credentials.fromEmail`?)
            // Migration says `email_address text not null`. Use that as sender? 
            // Resend allows specific domains.
            return await ResendProvider.send({
                from: `${account.display_name || 'Romna User'} <${account.email_address}>`,
                to,
                subject,
                html: body
            });
        }
        else {
            throw new Error(`Unknown provider: ${account.provider}`);
        }
    }
};
