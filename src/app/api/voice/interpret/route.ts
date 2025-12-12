import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();

    if (!transcript) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const systemPrompt = `You are an AI assistant that analyzes voice transcripts and determines the user's intent.
Analyze the transcript and return a JSON object with the following structure:

{
  "type": "task" | "event" | "email" | "note",
  "data": {
    // For task:
    "title": "string",
    "due_date": "ISO date string or null",
    "priority": "low" | "medium" | "high"
    
    // For event:
    "title": "string",
    "date": "ISO date string",
    "location": "string or null"
    
    // For email:
    "to": "email address",
    "subject": "string",
    "body": "string"
    
    // For note:
    "content": "string"
  }
}

Determine intent based on keywords:
- Task: "remind me", "todo", "need to", "have to", "task", "complete", "finish", "buy", "get"
- Event: "meeting", "schedule", "appointment", "call", "at (time)", "on (date)", "event"
- Email: "email", "send", "write to", "message to"
- Note: anything else that doesn't fit the above categories

Be smart about extracting dates from natural language like "tomorrow", "next week", "Monday".
Return ONLY the JSON object, no additional text.`;

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
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: 'Interpretation failed', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    try {
      const intentData = JSON.parse(content);
      return NextResponse.json(intentData);
    } catch {
      return NextResponse.json({
        type: 'note',
        data: { content: transcript },
      });
    }
  } catch (error) {
    console.error('Interpretation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
