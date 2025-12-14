import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Mock Config for Node functionality
if (!global.fetch) {
    // @ts-ignore
    global.fetch = fetch;
}

// We need to import the file source directly or mock it because of the client-side/server-side boundary
// For this script, we'll manually implement a test function that mirrors `nlu.ts` logic exactly
// so we can test the API connectivity and Key visibility.

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const HF_KEY = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY;

console.log("--- NLU CONFIG CHECK ---");
console.log("GEMINI_KEY Found:", !!GEMINI_KEY, GEMINI_KEY ? `(${GEMINI_KEY.slice(0, 5)}...)` : "");
console.log("HF_KEY Found:", !!HF_KEY);

if (!GEMINI_KEY) {
    console.error("❌ SKIPPING GEMINI TEST (No Key)");
} else {
    testGemini("Remind me to call Mom tomorrow at 5pm");
}

async function testGemini(text: string) {
    console.log(`\n--- TESTING GEMINI with "${text}" ---`);
    const model = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

    const prompt = `
    You are a productivity AI. Extract intent from user text.
    Return ONLY valid JSON. No markdown.
    
    Schema:
    {
      "intent": "task" | "reminder" | "note" | "unknown",
      "title": "Short actionable title",
      "datetime": "ISO 8601 string or null (if user mentions time)",
      "confidence": 0.0 to 1.0
    }
    
    User Text: "${text}"
    `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            console.error(`Gemini API Error: ${response.status} ${response.statusText}`);
            const errBody = await response.text();
            console.error("Body:", errBody);
            return;
        }

        const data = await response.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("✅ RAW RESPONSE:", candidate);

        const clean = candidate.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);
        console.log("✅ PARSED JSON:", parsed);

    } catch (error) {
        console.error("❌ EXCEPTION:", error);
    }
}
