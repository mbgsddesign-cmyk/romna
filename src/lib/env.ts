/**
 * Environment Validation Utility
 * Enforces strictly server-side access for secrets.
 */
export const Env = {
    get twilioAccountSid() {
        return requireServerEnv('TWILIO_ACCOUNT_SID');
    },
    get twilioAuthToken() {
        return requireServerEnv('TWILIO_AUTH_TOKEN');
    },
    get twilioWhatsappFrom() {
        return requireServerEnv('TWILIO_WHATSAPP_FROM');
    },
    get twilioMessagingServiceSid() {
        // Optional
        return process.env.TWILIO_MESSAGING_SERVICE_SID;
    },
    get cronSecret() {
        return requireServerEnv('CRON_SECRET');
    }
};

function requireServerEnv(key: string): string {
    if (typeof window !== 'undefined') {
        throw new Error(`CRITICAL: Attempted to access server secret '${key}' from client bundle.`);
    }
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
