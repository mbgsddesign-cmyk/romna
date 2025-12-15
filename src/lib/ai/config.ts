// [V7 SECURITY] All AI keys are server-only. Never use NEXT_PUBLIC_ for API keys.
export const HF_CONFIG = {
    API_KEY: process.env.HF_API_KEY,
    GEMINI_KEY: process.env.GEMINI_API_KEY,
    MODELS: {
        STT: "openai/whisper-small",
        // Primary NLU (Gemini is preferred if key exists)
        GEMINI_NLU: "gemini-1.5-flash",
        // Secondary NLU (Hugging Face)
        HF_NLU: "mistralai/Mistral-7B-Instruct-v0.2",
        HF_NLU_FALLBACK: "google/flan-t5-large"
    },
    ENDPOINTS: {
        HF_INFERENCE: "https://api-inference.huggingface.co/models/",
        GEMINI_API: "https://generativelanguage.googleapis.com/v1beta/models/"
    }
};

export interface IntentResult {
    intent: 'task' | 'reminder' | 'note' | 'email' | 'whatsapp' | 'unknown' | 'clarification';
    action?: 'do' | 'schedule' | 'send';
    title: string; // Used as summary/content
    datetime?: string | null;
    limitDate?: string | null; // For deadlines
    target?: string | null; // For email/whatsapp
    to?: string; // Explicit recipient
    message?: string; // Explicit body key for whatsapp/email
    confidence: number;
    language: 'en' | 'ar';
    original_text?: string;
    model_used?: string;
    ai_response?: string;
}
