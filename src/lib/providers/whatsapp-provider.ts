import twilio from 'twilio';
import { Env } from '@/lib/env';

// Initialize Twilio Client (Server-side only due to Env check)
// Lazy initialization to avoid instantiation on import if envs are missing in some contexts (e.g. build)
const getClient = () => {
    return twilio(Env.twilioAccountSid, Env.twilioAuthToken);
};

export interface SendWhatsAppOptions {
    to: string;
    body: string;
    mediaUrls?: string[];
    clientRefId?: string; // For idempotency / tracking
}

export const WhatsAppProvider = {
    /**
     * Send a WhatsApp message via Twilio
     */
    sendWhatsAppMessage: async (options: SendWhatsAppOptions) => {
        const client = getClient();

        // Enforce formatting
        let to = options.to;
        if (!to.startsWith('whatsapp:')) {
            // Check if it already has + or needs it. 
            // Twilio requires "whatsapp:+1234567890"
            // If just "1234567890", assume we need to prepend everything.
            // If "+123...", prepend "whatsapp:".

            // Simple Clean: Remove spaces, dashes, parens
            const cleanNumber = to.replace(/[\s\-\(\)]/g, '');

            if (cleanNumber.startsWith('whatsapp:')) {
                to = cleanNumber;
            } else if (cleanNumber.startsWith('+')) {
                to = `whatsapp:${cleanNumber}`;
            } else {
                // Assume standard international format without plus? Risky. 
                // Let's assume input should be E.164. 
                // But for robustness, prepend whatsapp:+ if missing.
                to = `whatsapp:+${cleanNumber}`;
            }
        }

        try {
            const messageOptions: any = {
                from: Env.twilioWhatsappFrom,
                to: to,
                body: options.body
            };

            if (options.mediaUrls && options.mediaUrls.length > 0) {
                messageOptions.mediaUrl = options.mediaUrls;
            }

            // Twilio doesn't support generic 'client reference id' for idempotency in the send call 
            // exactly like Stripe, but we can rely on our database state (execution_queue) for that.
            // However, we can store metadata if needed. 
            // StatusCallback can carry it.

            const message = await client.messages.create(messageOptions);

            return {
                success: true,
                provider_message_id: message.sid,
                status: message.status
            };

        } catch (error: any) {
            console.error("[WhatsAppProvider] Send Failed:", error);
            // Check for specific error codes if needed?
            // 21211 - Invalid Phone Number
            // 630xx - Template issues (if we used templates)
            throw new Error(`WhatsApp Send Failed: ${error.message}`);
        }
    }
};
