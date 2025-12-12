import { NextResponse } from 'next/server';
import { AIEngineService } from '@/services/ai-engine.service';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { transcript, locale = 'en', userId } = await request.json();

    if (!transcript) {
      return NextResponse.json({ success: false, error: 'Missing transcript' }, { status: 400 });
    }

    const classified = AIEngineService.classifyIntent(transcript, locale);

    if (userId) {
      const supabase = createServerClient();
      
      await supabase.from('voice_intents').insert({
        user_id: userId,
        raw_text: transcript,
        intent_type: classified.type,
        extracted_data: classified.entities,
        success: true,
      });

      await AIEngineService.logUsage(userId, `voice_classify_${classified.type}`, 100, {
        transcript: transcript.substring(0, 100),
        confidence: classified.confidence,
      });

      const monthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      try {
        await supabase.rpc('increment_usage', {
          p_user_id: userId,
          p_month_year: monthYear,
          p_field: 'ai_tokens_used',
          p_amount: 100,
        });
      } catch {
        // RPC may not exist, ignore
      }
    }

    return NextResponse.json({
      success: true,
      intent: {
        type: classified.type,
        confidence: classified.confidence,
        [classified.type]: classified.entities,
        suggestedAction: classified.suggestedAction,
      },
    });
  } catch (error) {
    console.error('Voice classification error:', error);
    return NextResponse.json({ success: false, error: 'Classification failed' }, { status: 500 });
  }
}