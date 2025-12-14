import { useAppStore } from './store';
import { FEEDBACK_PROFILES, FeedbackType } from './feedback-types';
import { BackgroundNotificationEngine } from './background-notification-engine';

export class FeedbackEngine {
    private static audioCtx: AudioContext | null = null;

    private static getContext(): AudioContext {
        if (typeof window === 'undefined') {
            // Return dummy or null during SSR, though callers should check
            throw new Error("[FeedbackEngine] AudioContext cannot be initialized on server");
        }
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.audioCtx?.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx!;
    }

    private static playTone(frequency: number, type: OscillatorType, duration: number, startTime: number = 0) {
        try {
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(frequency, ctx.currentTime + startTime);

            gain.gain.setValueAtTime(0.1, ctx.currentTime + startTime); // Low volume
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + startTime);
            osc.stop(ctx.currentTime + startTime + duration);
        } catch (e) {
            console.warn('[FeedbackEngine] Audio playback failed', e);
        }
    }

    private static vibrate(pattern: number | number[]) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }

    // --- PUBLIC METHODS ---

    /**
     * Unified dispatch method for all feedback
     */
    static async dispatch(type: FeedbackType, customNotificationBody?: string) {
        // Check Visibility
        const isHidden = typeof document !== 'undefined' && document.hidden;
        const { feedback } = useAppStore.getState();

        if (isHidden) {
            // Background Strategy
            if (feedback.backgroundNotifications) {
                await BackgroundNotificationEngine.trigger(type, customNotificationBody);
            }

            // If background sound/vibration is enabled, we can TRY to play it,
            // but browsers usually block audio in background execution unless wake-locked/PWA logic is specific.
            // We will attempt it if flags allow.
            // Note: 'feedback.soundEnabled' is treated as universal for now, or we can add specific background flags later.
            // For now, let's respect the existing flags but note functionality limits.
        }

        // Always attempt Sensor Feedback (Sound/Haptics) if enabled,
        // even if hidden (some browsers allow small haptics or audio if recent interaction).
        // Plus, if we just Backgrounded, we might still have a grace period.

        const profile = FEEDBACK_PROFILES[type];
        if (!profile) return;

        // Sound
        if (feedback.soundEnabled && profile.tone) {
            this.playTone(
                profile.tone.frequency,
                profile.tone.type,
                profile.tone.duration,
                profile.tone.startTime
            );
            if (profile.tone.next) {
                this.playTone(
                    profile.tone.next.frequency,
                    profile.tone.next.type,
                    profile.tone.next.duration,
                    profile.tone.next.startTime
                );
            }
        }

        // Haptics
        if (feedback.hapticsEnabled && profile.vibration) {
            this.vibrate(profile.vibration);
        }
    }

    // Legacy aliases for backward compatibility if needed, mapped to new dispatch
    static success() { this.dispatch('EXECUTED'); }
    static scheduled() { this.dispatch('SCHEDULED'); }
    static approval() { this.dispatch('APPROVAL_REQUIRED'); }
    static error() { this.dispatch('ERROR'); }
}

