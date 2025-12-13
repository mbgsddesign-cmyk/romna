import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { AIEngineService } from '@/services/ai-engine.service';
import { runDayOrchestrator } from '@/lib/autoglm/orchestrator-core';

const SUPPORTED_INTENTS = [
  'What should I do now?',
  "What's next?",
  'Start my day',
  'Add task',
  'Remind me to',
] as const;

interface VoiceDecisionRequest {
  transcript: string;
  locale?: string;
  userId: string;
}

interface VoiceDecisionResponse {
  success: boolean;
  decision?: any;
  intent?: string;
  action?: 'update_decision' | 'create_task' | 'create_reminder';
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<VoiceDecisionResponse>> {
  const startTime = Date.now();
  const TIMEOUT_MS = 5000;

  try {
    const { transcript, locale = 'en', userId } = await request.json() as VoiceDecisionRequest;

    if (!transcript || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing transcript or userId' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const normalizedTranscript = transcript.toLowerCase().trim();
    
    let intent: string = 'unknown';
    let action: 'update_decision' | 'create_task' | 'create_reminder' = 'update_decision';

    if (
      /what should i do now|ماذا أفعل الآن|what'?s next|ما التالي|start my day|ابدأ يومي/i.test(normalizedTranscript)
    ) {
      intent = 'query_decision';
      action = 'update_decision';
    } else if (
      /add task|أضف مهمة|create task|أنشئ مهمة/i.test(normalizedTranscript)
    ) {
      intent = 'create_task';
      action = 'create_task';

      const classified = AIEngineService.classifyIntent(transcript, locale);
      const taskTitle = classified.entities.title as string || transcript.replace(/add task|أضف مهمة|create task|أنشئ مهمة/gi, '').trim();
      
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title: taskTitle,
          priority: 'high',
          status: 'pending',
          source: 'voice',
          due_date: (classified.entities.date as string) || new Date().toISOString(),
        })
        .select()
        .single();

      if (taskError) {
        console.error('[Voice → Decision] Task creation failed:', taskError);
        return NextResponse.json(
          { success: false, error: 'Failed to create task' },
          { status: 500 }
        );
      }

      await supabase.from('voice_intents').insert({
        user_id: userId,
        raw_text: transcript,
        intent_type: 'task',
        extracted_data: { taskId: newTask.id, title: taskTitle },
        success: true,
      });

      if (Date.now() - startTime > TIMEOUT_MS) {
        return NextResponse.json({
          success: true,
          intent,
          action: 'create_task',
          decision: null,
        });
      }

      const decision = await runDayOrchestrator(userId, supabase);

      return NextResponse.json({
        success: true,
        decision,
        intent,
        action: 'create_task',
      });
      
    } else if (
      /remind me to|ذكرني ب|reminder|تذكير/i.test(normalizedTranscript)
    ) {
      intent = 'create_reminder';
      action = 'create_reminder';

      const classified = AIEngineService.classifyIntent(transcript, locale);
      const reminderTitle = `🔔 ${classified.entities.title as string || transcript.replace(/remind me to|ذكرني ب|reminder|تذكير/gi, '').trim()}`;
      
      const { data: newReminder, error: reminderError } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title: reminderTitle,
          priority: 'high',
          status: 'pending',
          source: 'voice',
          due_date: (classified.entities.date as string) || new Date(Date.now() + 3600000).toISOString(),
        })
        .select()
        .single();

      if (reminderError) {
        console.error('[Voice → Decision] Reminder creation failed:', reminderError);
        return NextResponse.json(
          { success: false, error: 'Failed to create reminder' },
          { status: 500 }
        );
      }

      await supabase.from('voice_intents').insert({
        user_id: userId,
        raw_text: transcript,
        intent_type: 'reminder',
        extracted_data: { reminderId: newReminder.id, title: reminderTitle },
        success: true,
      });

      if (Date.now() - startTime > TIMEOUT_MS) {
        return NextResponse.json({
          success: true,
          intent,
          action: 'create_reminder',
          decision: null,
        });
      }

      const decision = await runDayOrchestrator(userId, supabase);

      return NextResponse.json({
        success: true,
        decision,
        intent,
        action: 'create_reminder',
      });
      
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: locale === 'ar' 
            ? 'لم أفهم. حاول: "ماذا أفعل الآن؟" أو "أضف مهمة..."'
            : 'Intent not recognized. Try: "What should I do now?" or "Add task..."'
        },
        { status: 400 }
      );
    }

    if (Date.now() - startTime > TIMEOUT_MS) {
      return NextResponse.json({
        success: true,
        intent,
        action,
        decision: null,
      });
    }

    const decision = await runDayOrchestrator(userId, supabase);

    await supabase.from('voice_intents').insert({
      user_id: userId,
      raw_text: transcript,
      intent_type: intent,
      extracted_data: {},
      success: true,
    });

    return NextResponse.json({
      success: true,
      decision,
      intent,
      action,
    });

  } catch (error: any) {
    console.error('[Voice → Decision] Error:', error);
    
    if (Date.now() - startTime > TIMEOUT_MS) {
      return NextResponse.json(
        { success: false, error: 'Request timeout' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
