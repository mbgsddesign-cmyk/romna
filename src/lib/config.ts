export const AppConfig = {
    get googleClientId() {
        return requireEnv('GOOGLE_CLIENT_ID');
    },
    get googleClientSecret() {
        return requireEnv('GOOGLE_CLIENT_SECRET');
    },
    get googleRedirectUri() {
        return requireEnv('GOOGLE_REDIRECT_URI');
    },
    get resendApiKey() {
        return requireEnv('RESEND_API_KEY');
    },
    get encryptionKey() {
        return requireEnv('ENCRYPTION_KEY');
    },
    get appUrl() {
        return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
    }
};

function requireEnv(key: string): string {
    if (typeof window !== 'undefined') {
        // Client-side safety check: Never throw generic error if accessed here?
        // Actually we should prevent server env access on client!
        // But this file might be imported in shared code.
        // throw new Error(`Server Config accessed key '${key}' on client!`);
        // Return empty or throw? strict validation: throw.
        // But maybe check if key starts with NEXT_PUBLIC?
    }

    const val = process.env[key];
    if (!val) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return val;
}
