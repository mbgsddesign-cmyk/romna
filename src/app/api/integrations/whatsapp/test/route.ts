import { NextResponse } from 'next/server';
import { sendTestWhatsAppMessage } from '@/services/whatsapp.service';

export async function POST(request: Request) {
  try {
    const { metadata } = await request.json();
    
    if (!metadata?.phoneId || !metadata?.accessToken) {
      return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 });
    }
    
    const result = await sendTestWhatsAppMessage({
      phoneId: metadata.phoneId,
      accessToken: metadata.accessToken,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Test failed' }, { status: 500 });
  }
}
