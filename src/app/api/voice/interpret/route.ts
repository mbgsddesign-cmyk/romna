import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { AutoGLM } from '@/lib/autoglm';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Authenticate User
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transcript } = await request.json();

    if (!transcript) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    // 2. Interpret Intent (Quick Pass for VoiceNote record)
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Reuse existing interpretation logic for quick intent tagging
    const systemPrompt = `You are an AI assistant that analyzes voice transcripts.
Analyze the transcript and return a JSON object with:
{
  "intent": "task" | "event" | "email" | "note" | "reminder" | "message",
  "confidence": number (0.0 to 1.0)
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        temperature: 0.2,
        max_tokens: 100,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
        throw new Error('OpenAI interpretation failed');
    }

    const data = await response.json();
    const content = JSON.parse(data.choices[0]?.message?.content || '{}');
    const intent = content.intent || 'note';
    const confidence = content.confidence || 0.5;

    // 3. Save to Voice Notes
    const { data: voiceNote, error: dbError } = await supabase
      .from('voice_notes')
      .insert({
        user_id: user.id,
        transcription: transcript,
        intent: intent,
        confidence: confidence,
        processed: false,
        audio_url: null // or pass it if available
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to save voice note' }, { status: 500 });
    }

    // 4. Trigger AutoGLM if high confidence
    let autoGlmResult = null;
    if (confidence >= 0.6) {
      autoGlmResult = await AutoGLM.run(user.id, 'voice_intent', { voice_note_id: voiceNote.id });
      
      // Update voice note as processed
      await supabase
        .from('voice_notes')
        .update({ processed: true })
        .eq('id', voiceNote.id);
    }

    return NextResponse.json({
      success: true,
      voice_note: voiceNote,
      autoglm: autoGlmResult
    });

  } catch (error: any) {
    console.error('Interpretation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
