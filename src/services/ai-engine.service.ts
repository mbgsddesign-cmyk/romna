import { supabase } from '@/lib/supabase';

export type IntentType = 'task' | 'event' | 'email' | 'note' | 'whatsapp_message' | 'telegram_message' | 'reminder' | 'search';
export type ActionType = 'create_task' | 'create_event' | 'send_email' | 'send_whatsapp' | 'send_telegram' | 'set_reminder' | 'sync_notion' | 'custom';

interface ClassifiedIntent {
  type: IntentType;
  confidence: number;
  entities: Record<string, unknown>;
  suggestedAction?: ActionType;
  rawText: string;
}

interface MemoryEntry {
  id?: string;
  content: string;
  memoryType: 'general' | 'preference' | 'pattern' | 'context' | 'entity';
  importance: number;
  metadata?: Record<string, unknown>;
}

interface AIAction {
  id?: string;
  triggerType: 'voice' | 'email' | 'schedule' | 'webhook' | 'manual';
  actionType: ActionType;
  inputData: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  scheduledFor?: string;
}

export class AIEngineService {
  private static readonly INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
    task: [
      /(?:أضف|أنشئ|سجل|اكتب|ذكرني|remind|add|create|todo|task|مهمة)/i,
      /(?:يجب|لازم|should|must|need to)/i,
    ],
    event: [
      /(?:اجتماع|موعد|حجز|meeting|schedule|appointment|event|مقابلة)/i,
      /(?:في الساعة|at|على|الساعة)/i,
    ],
    email: [
      /(?:ايميل|بريد|email|send.*mail|أرسل.*بريد)/i,
    ],
    whatsapp_message: [
      /(?:واتساب|واتس|whatsapp|رسالة.*واتس|ابعت.*واتس)/i,
    ],
    telegram_message: [
      /(?:تليجرام|telegram|رسالة.*تليجرام)/i,
    ],
    reminder: [
      /(?:ذكرني|نبهني|remind|reminder|تذكير)/i,
      /(?:بعد|after|خلال|في|لاحقا)/i,
    ],
    note: [
      /(?:ملاحظة|note|سجل|احفظ|save)/i,
    ],
    search: [
      /(?:ابحث|بحث|search|find|اين|where|متى|when)/i,
    ],
  };

  private static readonly ACTION_MAP: Record<IntentType, ActionType> = {
    task: 'create_task',
    event: 'create_event',
    email: 'send_email',
    whatsapp_message: 'send_whatsapp',
    telegram_message: 'send_telegram',
    reminder: 'set_reminder',
    note: 'create_task',
    search: 'custom',
  };

  static classifyIntent(text: string, locale: string = 'en'): ClassifiedIntent {
    const normalizedText = text.toLowerCase().trim();
    let bestMatch: IntentType = 'note';
    let highestScore = 0;

    for (const [intentType, patterns] of Object.entries(this.INTENT_PATTERNS)) {
      let score = 0;
      for (const pattern of patterns) {
        if (pattern.test(normalizedText)) {
          score += 1;
        }
      }
      if (score > highestScore) {
        highestScore = score;
        bestMatch = intentType as IntentType;
      }
    }

    const confidence = Math.min(0.95, 0.5 + (highestScore * 0.15));
    const entities = this.extractEntities(normalizedText, bestMatch, locale);

    return {
      type: bestMatch,
      confidence,
      entities,
      suggestedAction: this.ACTION_MAP[bestMatch],
      rawText: text,
    };
  }

  static extractEntities(text: string, intentType: IntentType, locale: string): Record<string, unknown> {
    const entities: Record<string, unknown> = {};
    const isArabic = locale === 'ar' || /[\u0600-\u06FF]/.test(text);

    const timePatterns = [
      /(?:الساعة|at|في)\s*(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm|صباحا|مساء))?)/i,
      /(\d{1,2}(?::\d{2})?)\s*(?:am|pm|صباحا|مساء)/i,
    ];

    const datePatterns = [
      /(?:بكرة|غدا|tomorrow)/i,
      /(?:اليوم|today)/i,
      /(?:بعد\s*غد|day after tomorrow)/i,
      /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/,
    ];

    const contactPatterns = [
      /(?:ل|إلى|to|for)\s+([أ-يa-zA-Z]+)/i,
      /(?:أرسل|ابعث|send)\s+(?:ل|إلى|to)?\s*([أ-يa-zA-Z]+)/i,
    ];

    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        entities.time = match[1] || match[0];
        break;
      }
    }

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (/بكرة|غدا|tomorrow/i.test(match[0])) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          entities.date = tomorrow.toISOString().split('T')[0];
        } else if (/اليوم|today/i.test(match[0])) {
          entities.date = new Date().toISOString().split('T')[0];
        } else if (match[1] && match[2]) {
          const year = match[3] ? (match[3].length === 2 ? '20' + match[3] : match[3]) : new Date().getFullYear();
          entities.date = `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        }
        break;
      }
    }

    for (const pattern of contactPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        entities.recipient = match[1].trim();
        break;
      }
    }

    let title = text
      .replace(/(?:أضف|أنشئ|سجل|اكتب|ذكرني|remind|add|create|todo|task|مهمة)/gi, '')
      .replace(/(?:اجتماع|موعد|meeting|schedule|appointment|event)/gi, '')
      .replace(/(?:ايميل|بريد|email)/gi, '')
      .replace(/(?:واتساب|واتس|whatsapp)/gi, '')
      .replace(/(?:تليجرام|telegram)/gi, '')
      .replace(/(?:ل|إلى|to|for)\s+[أ-يa-zA-Z]+/gi, '')
      .replace(/(?:الساعة|at|في)\s*\d{1,2}(?::\d{2})?(?:\s*(?:am|pm|صباحا|مساء))?/gi, '')
      .replace(/(?:بكرة|غدا|tomorrow|اليوم|today)/gi, '')
      .trim();

    if (title.length > 5) {
      entities.title = title;
    }

    return entities;
  }

  static async saveMemory(userId: string, memory: MemoryEntry): Promise<string | null> {
    const { data, error } = await supabase
      .from('ai_memory')
      .insert({
        user_id: userId,
        content: memory.content,
        memory_type: memory.memoryType,
        importance: memory.importance,
        metadata: memory.metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to save memory:', error);
      return null;
    }
    return data?.id;
  }

  static async searchMemory(userId: string, query: string, limit: number = 5): Promise<MemoryEntry[]> {
    const { data, error } = await supabase
      .from('ai_memory')
      .select('*')
      .eq('user_id', userId)
      .order('importance', { ascending: false })
      .order('last_accessed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to search memory:', error);
      return [];
    }

    return (data || []).map(m => ({
      id: m.id,
      content: m.content,
      memoryType: m.memory_type,
      importance: m.importance,
      metadata: m.metadata,
    }));
  }

  static async createAction(userId: string, action: Omit<AIAction, 'id' | 'status'>): Promise<string | null> {
    const { data, error } = await supabase
      .from('ai_actions')
      .insert({
        user_id: userId,
        trigger_type: action.triggerType,
        action_type: action.actionType,
        input_data: action.inputData,
        status: 'pending',
        scheduled_for: action.scheduledFor,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create action:', error);
      return null;
    }
    return data?.id;
  }

  static async executeAction(actionId: string): Promise<boolean> {
    const { data: action, error: fetchError } = await supabase
      .from('ai_actions')
      .select('*')
      .eq('id', actionId)
      .single();

    if (fetchError || !action) {
      console.error('Failed to fetch action:', fetchError);
      return false;
    }

    await supabase
      .from('ai_actions')
      .update({ status: 'processing' })
      .eq('id', actionId);

    try {
      let outputData: Record<string, unknown> = {};

      switch (action.action_type) {
        case 'create_task':
          const { data: taskData } = await supabase
            .from('tasks')
            .insert({
              user_id: action.user_id,
              title: action.input_data.title || 'New Task',
              description: action.input_data.description,
              due_date: action.input_data.dueDate,
              priority: action.input_data.priority || 'medium',
              source: action.trigger_type,
            })
            .select('id')
            .single();
          outputData = { taskId: taskData?.id };
          break;

        case 'create_event':
          const { data: eventData } = await supabase
            .from('events')
            .insert({
              user_id: action.user_id,
              title: action.input_data.title || 'New Event',
              description: action.input_data.description,
              start_time: action.input_data.startTime || new Date().toISOString(),
              end_time: action.input_data.endTime,
              location: action.input_data.location,
              source: action.trigger_type === 'voice' ? 'voice' : 'manual',
            })
            .select('id')
            .single();
          outputData = { eventId: eventData?.id };
          break;

        case 'set_reminder':
          const reminderDate = new Date();
          if (action.input_data.delayMinutes) {
            reminderDate.setMinutes(reminderDate.getMinutes() + Number(action.input_data.delayMinutes));
          }
          const { data: reminderData } = await supabase
            .from('tasks')
            .insert({
              user_id: action.user_id,
              title: action.input_data.title || 'Reminder',
              due_date: action.input_data.reminderTime || reminderDate.toISOString(),
              priority: 'high',
              source: 'voice',
            })
            .select('id')
            .single();
          outputData = { reminderId: reminderData?.id };
          break;

        default:
          outputData = { message: 'Action type not implemented' };
      }

      await supabase
        .from('ai_actions')
        .update({ 
          status: 'completed',
          output_data: outputData,
          completed_at: new Date().toISOString(),
        })
        .eq('id', actionId);

      return true;
    } catch (error) {
      await supabase
        .from('ai_actions')
        .update({ 
          status: 'failed',
          error_message: String(error),
        })
        .eq('id', actionId);
      return false;
    }
  }

  static async logUsage(userId: string, actionType: string, tokensUsed: number = 0, metadata: Record<string, unknown> = {}): Promise<void> {
    await supabase
      .from('ai_usage')
      .insert({
        user_id: userId,
        action_type: actionType,
        tokens_used: tokensUsed,
        metadata,
      });
  }

  static async getContextualSuggestion(userId: string, currentTime: Date): Promise<string[]> {
    const hour = currentTime.getHours();
    const suggestions: string[] = [];

    if (hour >= 6 && hour < 12) {
      suggestions.push('Check your morning tasks');
      suggestions.push('Review today\'s calendar');
    } else if (hour >= 12 && hour < 17) {
      suggestions.push('Check pending tasks');
      suggestions.push('Schedule afternoon meetings');
    } else {
      suggestions.push('Review tomorrow\'s schedule');
      suggestions.push('Set reminders for tomorrow');
    }

    return suggestions;
  }
}
