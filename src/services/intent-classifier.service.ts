import OpenAI from 'openai';

export type IntentType = 
  | 'task' 
  | 'event' 
  | 'email' 
  | 'whatsapp_message' 
  | 'telegram_message' 
  | 'reminder' 
  | 'search' 
  | 'note';

export interface ParsedIntent {
  type: IntentType;
  confidence: number;
  task?: {
    title: string;
    description?: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
  };
  event?: {
    title: string;
    description?: string;
    date: string;
    location?: string;
    duration?: number;
  };
  email?: {
    to: string;
    subject: string;
    body: string;
  };
  whatsapp?: {
    to: string;
    message: string;
    scheduledFor?: string;
  };
  telegram?: {
    to: string;
    message: string;
    scheduledFor?: string;
  };
  reminder?: {
    message: string;
    dateTime: string;
  };
  search?: {
    query: string;
  };
  note?: {
    content: string;
    tags?: string[];
  };
}

const SYSTEM_PROMPT = `You are an AI assistant that analyzes voice transcripts and extracts structured intents.
Analyze the given text and determine the user's intent. Extract relevant information and return a JSON object.

Supported intent types:
- task: Create a task/todo item
- event: Create a calendar event/meeting
- email: Send an email
- whatsapp_message: Send a WhatsApp message
- telegram_message: Send a Telegram message
- reminder: Set a reminder
- search: Search for something
- note: Create a note

For dates and times:
- Convert relative dates (tomorrow, next week, etc.) to ISO format
- Use the current date as reference: ${new Date().toISOString().split('T')[0]}
- If time is mentioned in Arabic (الصباح = morning 9am, الظهر = noon 12pm, العصر = afternoon 4pm, المساء = evening 7pm)

For Arabic text:
- Extract names (أحمد, محمد, etc.) as recipients
- Extract message content accurately
- Handle transliteration between Arabic and English names

Return a JSON object with this structure:
{
  "type": "intent_type",
  "confidence": 0.0-1.0,
  "task/event/email/whatsapp/telegram/reminder/search/note": { ... relevant data ... }
}`;

export async function classifyIntent(transcript: string, locale: string = 'en'): Promise<ParsedIntent | null> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { 
          role: 'user', 
          content: `Analyze this transcript and extract the intent:\n\nTranscript: "${transcript}"\n\nLocale: ${locale}\n\nReturn only valid JSON.` 
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as ParsedIntent;
    return parsed;
  } catch (error) {
    console.error('Intent classification error:', error);
    return null;
  }
}

export async function processVoiceIntent(
  transcript: string,
  locale: string = 'en'
): Promise<{
  success: boolean;
  intent?: ParsedIntent;
  error?: string;
}> {
  try {
    const intent = await classifyIntent(transcript, locale);
    
    if (!intent) {
      return { success: false, error: 'Failed to classify intent' };
    }

    return { success: true, intent };
  } catch (error) {
    return { success: false, error: 'Failed to process voice intent' };
  }
}

export function getIntentDisplayName(type: IntentType, locale: string): string {
  const names: Record<IntentType, { en: string; ar: string }> = {
    task: { en: 'Task', ar: 'مهمة' },
    event: { en: 'Event', ar: 'حدث' },
    email: { en: 'Email', ar: 'بريد' },
    whatsapp_message: { en: 'WhatsApp Message', ar: 'رسالة واتساب' },
    telegram_message: { en: 'Telegram Message', ar: 'رسالة تيليجرام' },
    reminder: { en: 'Reminder', ar: 'تذكير' },
    search: { en: 'Search', ar: 'بحث' },
    note: { en: 'Note', ar: 'ملاحظة' },
  };

  return names[type]?.[locale as 'en' | 'ar'] || names[type]?.en || type;
}
