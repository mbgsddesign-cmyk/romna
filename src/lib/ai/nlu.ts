import { HF_CONFIG, IntentResult } from './config';

// Re-implement detectLanguage to avoid circular dependency or import issues
function detectLanguage(text: string): 'en' | 'ar' {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text) ? 'ar' : 'en';
}

export async function parseIntent(text: string): Promise<IntentResult> {
    // 1. Try Gemini First (Smarter, Faster)
    if (HF_CONFIG.GEMINI_KEY) {
        try {
            return await parseIntentWithGemini(text);
        } catch (err) {
            console.warn("[NLU] Gemini failed, falling back to Hugging Face:", err);
        }
    }

    // 2. Fallback to Hugging Face (Mistral)
    return await parseIntentWithHF(text);
}

// --- GEMINI IMPLEMENTATION ---

// Helper: Arabic Normalization
function normalizeArabic(text: string): string {
    return text
        .replace(/[\u064B-\u065F]/g, '') // Remove Tashkeel
        .replace(/[٠-٩]/g, d => '0123456789'.indexOf(d).toString()) // Arabic Numerals to Latin
        .replace(/أ|إ|آ/g, 'ا') // Normalize Alif
        .replace(/ة/g, 'ه') // Normalize Ta-Marbuta
        .replace(/ى/g, 'ي'); // Normalize Ya
}

async function parseIntentWithGemini(rawText: string): Promise<IntentResult> {
    const apiKey = HF_CONFIG.GEMINI_KEY;
    const text = normalizeArabic(rawText);
    const language = detectLanguage(text);

    console.log("[NLU] Using Gemini Flash on:", text);

    const url = `${HF_CONFIG.ENDPOINTS.GEMINI_API}${HF_CONFIG.MODELS.GEMINI_NLU}:generateContent?key=${apiKey}`;

    const now = new Date();
    const currentContext = `
    Current Time: ${now.toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric' })}
    Current Date: ${now.toISOString().split('T')[0]}
    Language: ${language === 'ar' ? 'Arabic' : 'English'}
    `;

    const prompt = `
    You are a strict execution parser for ROMNA. Extract intent from user speech.
    Return ONLY valid JSON. No markdown. No prose.
    
    Context:
    ${currentContext}
    
    STRICT V5 INTENT SCHEMA:
    intent: "task" | "reminder" | "approval" | "clarification" | "email" | "whatsapp"

    MANDATORY ARABIC MAPPINGS (Handle dialectal variations):
    - "واتساب" / "واتس" / "رسالة واتساب" → intent: "whatsapp", action: "send"
    - "أرسل" / "ابعث" / "وصل" → intent depends on context (email/whatsapp/task)
    - "ذكرني" / "فكرني" / "نبهني" → intent: "reminder"
    - "موعد" / "اجتماع" / "ميتنق" → intent: "reminder" (events → reminders)
    - "تذكير" / "منبه" → intent: "reminder"
    - "الساعة" / "بكرة" / "بعد ساعة" / "الظهر" → intent: "reminder" (time → reminder)
    - "مهمة" / "تاسك" / "شغلة" / "حاجة" → intent: "task"
    - "اشترِ" / "جيب" / "خذ" → intent: "task" (shopping tasks)
    - "اتصل" / "كلم" / "تواصل مع" → intent: "task" (call tasks)
    - "ابحث" / "دور على" → intent: "task"
    - Any unclear command → intent: "clarification"
    
    CLEANING RULES:
    - Remove polite phrases: "لو سمحت", "بالله", "من فضلك", "يا حبيبي"
    - Normalize ALIF (أ/إ/آ → ا) and HA (ة → ه)
    - Handle Moroccan/Gulf/Egyptian dialect variations
    
    Schema:
    {
      "intent": "task" | "reminder" | "approval" | "clarification" | "email" | "whatsapp",
      "action": "do" | "schedule" | "send",
      "title": "string (Cleaned title)",
      "datetime": "ISO 8601 string (UTC) or null",
      "to": "string (Recipient name or number if applicable)",
      "message": "string (Email/WhatsApp body content)",
      "confidence": 0.0 to 1.0,
      "language": "ar" | "en"
    }
    
    Examples:
    "Remind me to drink water" → { "intent": "reminder", "title": "Drink water", "confidence": 0.95, "language": "en" }
    "Send WhatsApp to Ahmed meeting delayed" → { "intent": "whatsapp", "to": "Ahmed", "message": "meeting delayed", "confidence": 0.9 }
    "رسالة واتساب لمحمد تأخرت" → { "intent": "whatsapp", "to": "محمد", "message": "تأخرت", "language": "ar", "confidence": 0.9 }
    "ذكرني أشرب موية" → { "intent": "reminder", "title": "أشرب موية", "confidence": 0.95, "language": "ar" }
    "موعد دكتور بكرة الساعة 10" → { "intent": "reminder", "title": "موعد دكتور", "datetime": "...", "confidence": 0.9, "language": "ar" }
    "اشتري حليب" → { "intent": "task", "action": "do", "title": "اشتري حليب", "confidence": 0.9, "language": "ar" }
    "كلم أحمد بخصوص المشروع" → { "intent": "task", "title": "كلم أحمد بخصوص المشروع", "confidence": 0.85, "language": "ar" }
    "فكرني أنام بدري" → { "intent": "reminder", "title": "أنام بدري", "confidence": 0.9, "language": "ar" }
    
    User Text: "${text}"
    `;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }]
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidate) {
        throw new Error("Gemini returned empty response");
    }

    const cleanJson = candidate.replace(/```json/g, '').replace(/```/g, '').trim();
    // [V5] Tolerant JSON Extractor: Find first { and last }
    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');

    let jsonStr = cleanJson;
    if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = cleanJson.substring(firstBrace, lastBrace + 1);
    }

    try {
        const parsed = JSON.parse(jsonStr);

        // [V5] Schema Validation / Normalization
        const validIntents = ["task", "reminder", "email", "message", "confirm", "cancel", "clarification", "whatsapp"];
        if (!parsed.intent || !validIntents.includes(parsed.intent)) {
            console.warn("[NLU] Invalid intent returned:", parsed.intent);
            parsed.intent = 'clarification';
        }

        // Final Safety Check for Arabic
        if (language === 'ar' && (parsed.intent === 'unknown' || !parsed.intent)) {
            parsed.intent = 'reminder';
            parsed.confidence = 0.6;
        }

        return {
            ...parsed,
            // Ensure schema default values
            confidence: parsed.confidence || 0.7,
            original_text: text,
            model_used: 'gemini-1.5-flash-ar'
        };
    } catch (e) {
        console.error("[NLU] Gemini JSON Parse Error:", e, cleanJson);
        // [V5] Parse Failure -> Clarification (Safe Default)
        return {
            intent: 'clarification',
            title: text,
            action: 'do',
            confidence: 0,
            language: language,
            original_text: text,
            model_used: 'gemini-parse-error-fallback'
        };
    }
}


// --- HUGGING FACE IMPLEMENTATION (Legacy/Fallback) ---
async function parseIntentWithHF(rawText: string): Promise<IntentResult> {
    const apiKey = HF_CONFIG.API_KEY;
    if (!apiKey) throw new Error("Missing HUGGINGFACE_API_KEY");

    const text = normalizeArabic(rawText);
    const language = detectLanguage(text);

    const model = HF_CONFIG.MODELS.HF_NLU;
    console.log(`[NLU] Using Mistral (HF) on: "${text}"`);

    const prompt = `<s>[INST] You are a productivity assistant. Extract intent from the user sentence.
Return VALID JSON only. No markdown.

Rules:
- If Arabic input contains "ذكرني" or "موعد", intent is "reminder" or "task".
- Default to "reminder" if unsure but input is Arabic.

Schema:
{
  "intent": "task" | "reminder" | "note" | "clarification" | "unknown",
  "action": "do" | "schedule" | "send",
  "title": "string (summary)",
  "datetime": "ISO string or null",
  "confidence": number (0-1),
  "language": "en" | "ar"
}

User: "${text}"
[/INST]`;

    try {
        const response = await fetch(`${HF_CONFIG.ENDPOINTS.HF_INFERENCE}${model}`, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 200,
                    return_full_text: false,
                    temperature: 0.1
                }
            }),
        });

        if (!response.ok) {
            console.warn(`[NLU] Mistral failed (${response.status})`);
            // Fallback Logic
            return {
                intent: language === 'ar' ? 'reminder' : 'task',
                action: 'do',
                title: text,
                confidence: 0.5,
                language: language,
                original_text: text,
                model_used: 'fallback-basic'
            };
        }

        const result = await response.json();
        let generatedText = "";
        if (Array.isArray(result) && result[0]?.generated_text) {
            generatedText = result[0].generated_text;
        } else if (typeof result === 'object' && result?.generated_text) {
            generatedText = result.generated_text;
        }

        const cleanJson = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const parsed = JSON.parse(cleanJson);
            return {
                ...parsed,
                original_text: text,
                model_used: 'mistral-7b'
            };
        } catch (parseError) {
            return {
                intent: language === 'ar' ? 'reminder' : 'clarification',
                action: 'do',
                title: text,
                confidence: language === 'ar' ? 0.6 : 0,
                language: language,
                original_text: text,
                model_used: 'mistral-7b-fail'
            };
        }

    } catch (error) {
        console.error("[NLU] HF Exception:", error);
        return {
            intent: language === 'ar' ? 'reminder' : 'clarification',
            title: text,
            action: 'do',
            confidence: 0,
            language: language,
            original_text: text,
            model_used: 'error'
        };
    }
}
