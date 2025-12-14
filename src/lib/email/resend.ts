import { Resend } from 'resend';
import { AppConfig } from '@/lib/config';

// Lazy init to avoid build errors if env missing
// const resend = new Resend(AppConfig.resendApiKey);

export interface SendEmailOptions {
    from: string;
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    reply_to?: string;
}

export const ResendProvider = {
    send: async (options: SendEmailOptions) => {
        try {
            const { Resend } = await import('resend');
            const resend = new Resend(AppConfig.resendApiKey);

            const data = await resend.emails.send({
                from: options.from,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
                reply_to: options.reply_to as any // Force snake_case for API compatibility
            });

            if (data.error) throw data.error;

            return { success: true, id: data.data?.id, provider: 'resend' };
        } catch (error) {
            console.error("[Resend] Send Failed:", error);
            throw error;
        }
    }
};
