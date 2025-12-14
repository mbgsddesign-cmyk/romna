export type FeedbackType =
    | 'EXECUTED'
    | 'SCHEDULED'
    | 'APPROVAL_REQUIRED'
    | 'ERROR'
    | 'CANCELLED';

export type Pattern = number | number[];

export interface FeedbackProfile {
    tone: {
        frequency: number;
        type: OscillatorType;
        duration: number;
        startTime?: number;
        // Optional second tone
        next?: {
            frequency: number;
            type: OscillatorType;
            duration: number;
            startTime: number;
        };
    } | null;
    vibration: Pattern | null;
    priority: 'high' | 'normal' | 'low';
}

export const FEEDBACK_PROFILES: Record<FeedbackType, FeedbackProfile> = {
    EXECUTED: {
        tone: {
            frequency: 800,
            type: 'sine',
            duration: 0.15,
        },
        vibration: 50,
        priority: 'normal',
    },
    SCHEDULED: {
        tone: {
            frequency: 600,
            type: 'sine',
            duration: 0.1,
            next: {
                frequency: 900,
                type: 'sine',
                duration: 0.1,
                startTime: 0.15,
            },
        },
        vibration: [50, 50, 50],
        priority: 'normal',
    },
    APPROVAL_REQUIRED: {
        tone: {
            frequency: 300,
            type: 'triangle',
            duration: 0.4,
        },
        vibration: 200,
        priority: 'high',
    },
    ERROR: {
        tone: {
            frequency: 400,
            type: 'sine',
            duration: 0.2,
            next: {
                frequency: 200,
                type: 'sine',
                duration: 0.3,
                startTime: 0.2,
            }
        },
        vibration: null, // Calm
        priority: 'high',
    },
    CANCELLED: {
        tone: {
            frequency: 400,
            type: 'sine',
            duration: 0.2,
            next: {
                frequency: 200,
                type: 'sine',
                duration: 0.3,
                startTime: 0.2,
            }
        },
        vibration: 200, // Long single pulse
        priority: 'normal',
    }
};
