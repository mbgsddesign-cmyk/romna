import { NextResponse } from 'next/server';
import { sendTestTelegramMessage } from '@/services/telegram.service';

export async function POST(request: Request) {
  try {
    const { metadata, chatId } = await request.json();
    
    if (!metadata?.botToken) {
      return NextResponse.json({ success: false, error: 'Missing bot token' }, { status: 400 });
    }
    
    const testChatId = chatId || metadata.testChatId || '123456789';
    
    const result = await sendTestTelegramMessage(
      { botToken: metadata.botToken },
      testChatId
    );
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Test failed' }, { status: 500 });
  }
}
