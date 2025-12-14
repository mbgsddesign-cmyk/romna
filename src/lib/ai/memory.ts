'use client';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

const MEMORY_KEY = 'romna_local_memory';
const MAX_HISTORY = 5;

export const Memory = {
    saveInteraction: (userText: string, aiResponse: string) => {
        if (typeof window === 'undefined') return;

        try {
            const history = Memory.getHistory();
            const newMessages: ChatMessage[] = [
                { role: 'user', content: userText, timestamp: Date.now() },
                { role: 'assistant', content: aiResponse, timestamp: Date.now() }
            ];

            const updated = [...history, ...newMessages].slice(-MAX_HISTORY * 2); // Keep last N pairs
            localStorage.setItem(MEMORY_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error("Memory Save Error:", e);
        }
    },

    getHistory: (): ChatMessage[] => {
        if (typeof window === 'undefined') return [];
        try {
            const stored = localStorage.getItem(MEMORY_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    },

    getContextString: (): string => {
        const history = Memory.getHistory();
        if (history.length === 0) return "";

        return history.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n');
    },

    clear: () => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(MEMORY_KEY);
    }
};
