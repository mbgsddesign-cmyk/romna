import { google } from 'googleapis';
import { AppConfig } from '@/lib/config';

// Setup OAuth2 Client
const createOAuthClient = () => {
    return new google.auth.OAuth2(
        AppConfig.googleClientId,
        AppConfig.googleClientSecret,
        AppConfig.googleRedirectUri // Now using new config
    );
};

export const GmailProvider = {
    getAuthUrl: (state: string) => {
        const oauth2Client = createOAuthClient();
        return oauth2Client.generateAuthUrl({
            access_type: 'offline', // Critical for refresh token
            scope: [
                'https://www.googleapis.com/auth/gmail.send',
                'email',
                'profile'
            ],
            prompt: 'consent', // Force refresh token
            state: state
        });
    },

    getTokens: async (code: string) => {
        const oauth2Client = createOAuthClient();
        const { tokens } = await oauth2Client.getToken(code);
        return tokens;
    },

    send: async (refreshToken: string, options: { to: string, subject: string, body: string, from?: string }) => {
        try {
            const oauth2Client = createOAuthClient();
            oauth2Client.setCredentials({ refresh_token: refreshToken });

            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

            // Construct MIME message
            const utf8Subject = `=?utf-8?B?${Buffer.from(options.subject).toString('base64')}?=`;
            const messageParts = [
                `To: ${options.to}`,
                'Content-Type: text/html; charset=utf-8',
                'MIME-Version: 1.0',
                `Subject: ${utf8Subject}`,
                '',
                options.body
            ];

            const message = messageParts.join('\n');
            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const res = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage
                }
            });

            return { success: true, id: res.data.id, provider: 'gmail' };

        } catch (error) {
            console.error("[Gmail] Send Failed:", error);
            throw error;
        }
    }
};
