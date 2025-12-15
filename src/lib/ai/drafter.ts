import { GoogleGenerativeAI } from "@google/generative-ai";

// [V7 SECURITY] Server-only API key
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export const EmailDrafter = {
    draft: async (context: string, recipient: string, language: 'en' | 'ar', tone: 'casual' | 'formal') => {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        You are an expert email drafting assistant.
        Draft an email based on these requirements:
        
        To: ${recipient}
        Context/Topic: "${context}"
        Language: ${language === 'ar' ? 'Arabic' : 'English'}
        Tone: ${tone}
        
        Strictly output a JSON object with this schema (no markdown, no backticks):
        {
           "subject": "Clear subject line",
           "body": "The HTML body of the email. Use <br/> for newlines. Keep it professional and concise."
        }
        `;

        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            // Clean markdown
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBrace = cleanJson.indexOf('{');
            const lastBrace = cleanJson.lastIndexOf('}');

            if (firstBrace === -1 || lastBrace === -1) {
                throw new Error("Failed to parse JSON draft");
            }

            const jsonStr = cleanJson.substring(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(jsonStr);

            return {
                subject: parsed.subject,
                body: parsed.body
            };

        } catch (error) {
            console.error("[Drafter] Error:", error);
            // Fallback
            return {
                subject: language === 'ar' ? 'مسودة جديدة' : 'New Draft',
                body: language === 'ar' ? `فشلت صياغة المسودة: ${context}` : `Could not auto-draft. Context: ${context}`
            };
        }
    }
};
