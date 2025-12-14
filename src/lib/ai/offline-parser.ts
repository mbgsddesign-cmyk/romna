import { ParsedIntent } from "../decision-engine";

export class OfflineParser {
    static parse(text: string): ParsedIntent {
        const lower = text.toLowerCase();

        // [V5] Arabic Keywords
        const isArabicReminder = lower.includes('ذكرني') || lower.includes('نبهني') || lower.includes('فكرني');
        const isArabicSchedule = lower.includes('موعد') || lower.includes('اجتماع') || lower.includes('مقابلة');
        const isArabicTime = lower.includes('ساعة') || lower.includes('بكرة') || lower.includes('اليوم') || lower.includes('غدا');


        // 1. Finish / Complete
        if (lower.includes('finish') || lower.includes('done') || lower.includes('complete')) {
            return {
                intent: 'task',
                action: 'do',
                content: text,
                confidence: 1.0
            };
        }

        // 2. Remind / Later
        if (isArabicReminder || isArabicSchedule || isArabicTime || lower.includes('remind') || lower.includes('later') || lower.includes('schedule')) {
            return {
                intent: 'reminder',
                action: 'schedule',
                content: text,
                time: (isArabicSchedule || isArabicTime) ? null : 'tomorrow', // Let logic decide time or default
                confidence: 0.8
            };
        }

        // 3. Email / Message (Fallback to Note)
        if (lower.includes('email') || lower.includes('message') || lower.includes('send')) {
            return {
                intent: 'note',
                action: 'do', // Capture as generic task
                content: `(Offline) ${text}`,
                confidence: 0.7
            };
        }

        // Default: Capture as Note
        return {
            intent: 'note',
            action: 'do',
            content: text,
            confidence: 0.5
        };
    }
}
