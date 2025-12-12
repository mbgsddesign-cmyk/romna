import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_BASE_URL = process.env.DASHSCOPE_BASE_URL;
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_MODEL = process.env.DASHSCOPE_MODEL || 'qwen-plus';

const MAX_CONTENT_LENGTH = 2000;
const MAX_MESSAGES = 20;

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

export async function POST(req: NextRequest) {
  try {
    if (!DASHSCOPE_BASE_URL || !DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { error: 'DashScope configuration missing' },
        { status: 500 }
      );
    }

    const body: ChatRequest = await req.json();

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'messages must be an array' },
        { status: 400 }
      );
    }

    if (body.messages.length === 0) {
      return NextResponse.json(
        { error: 'messages array cannot be empty' },
        { status: 400 }
      );
    }

    if (body.messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { error: `messages array cannot exceed ${MAX_MESSAGES} items` },
        { status: 400 }
      );
    }

    let totalContentLength = 0;
    for (const msg of body.messages) {
      if (!msg.role || !msg.content) {
        return NextResponse.json(
          { error: 'Each message must have role and content' },
          { status: 400 }
        );
      }
      
      if (!['system', 'user', 'assistant'].includes(msg.role)) {
        return NextResponse.json(
          { error: 'Invalid message role. Must be system, user, or assistant' },
          { status: 400 }
        );
      }

      totalContentLength += msg.content.length;
    }

    if (totalContentLength > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Total message content exceeds ${MAX_CONTENT_LENGTH} characters` },
        { status: 400 }
      );
    }

    const dashscopePayload = {
      model: DASHSCOPE_MODEL,
      messages: body.messages,
      temperature: body.temperature || 0.7,
      top_p: body.top_p || 0.8,
      ...(body.max_tokens && { max_tokens: body.max_tokens }),
    };

    const dashscopeResponse = await fetch(
      `${DASHSCOPE_BASE_URL}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dashscopePayload),
      }
    );

    if (!dashscopeResponse.ok) {
      const errorText = await dashscopeResponse.text();
      console.error('DashScope API Error:', errorText);
      return NextResponse.json(
        { error: 'AI service error', details: errorText },
        { status: dashscopeResponse.status }
      );
    }

    const dashscopeData = await dashscopeResponse.json();

    return NextResponse.json(dashscopeData);

  } catch (error) {
    console.error('AI chat route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
