import { FeedbackType } from './feedback-types';

export class BackgroundNotificationEngine {

    static async requestPermission(): Promise<boolean> {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            console.warn('Notifications not supported');
            return false;
        }

        if (Notification.permission === 'granted') return true;

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }

    static async trigger(type: FeedbackType, customBody?: string) {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        // Use minimal text per requirements
        const payload = this.getPayload(type, customBody);

        try {
            // Check if service worker registration is available for mobile web push
            // Otherwise fall back to standard Notification API for desktop/some mobile
            const registration = await navigator.serviceWorker.getRegistration();

            if (registration && registration.showNotification) {
                await registration.showNotification(payload.title, {
                    body: payload.body,
                    icon: '/icon-192x192.png', // Assuming pwa icon exists
                    badge: '/icon-192x192.png',
                    tag: 'romna-feedback', // Stack notifications
                    renotify: true,
                    silent: false, // We handle sound ourselves usually, but let's allow system sound for background
                });
            } else {
                new Notification(payload.title, {
                    body: payload.body,
                    icon: '/icon-192x192.png',
                });
            }

        } catch (e) {
            console.error('[BackgroundNotificationEngine] Failed to trigger notification', e);
        }
    }

    private static getPayload(type: FeedbackType, customBody?: string) {
        const title = 'ROMNA';
        let body = '';

        switch (type) {
            case 'EXECUTED':
                body = 'Done.';
                break;
            case 'SCHEDULED':
                body = 'Scheduled.';
                break;
            case 'APPROVAL_REQUIRED':
                body = 'Needs approval.';
                break;
            case 'ERROR':
                body = 'Could not complete.';
                break;
            default:
                body = 'Update.';
        }

        // Allow overriding only if minimal text philosophy is respected (caller responsibility)
        if (customBody) {
            body = customBody;
        }

        return { title, body };
    }
}
