import { NextResponse } from 'next/server';
import { validateTelegramBot } from '@/services/telegram.service';

export async function POST(request: Request) {
  try {
    const { botToken } = await request.json();
    
    if (!botToken) {
      return NextResponse.json({ success: false, error: 'Missing bot token' }, { status: 400 });
    }
    
    const result = await validateTelegramBot({ botToken });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 500 });
  }
}
