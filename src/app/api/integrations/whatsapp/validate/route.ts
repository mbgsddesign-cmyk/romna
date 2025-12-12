import { NextResponse } from 'next/server';
import { validateWhatsAppCredentials } from '@/services/whatsapp.service';

export async function POST(request: Request) {
  try {
    const { phoneId, accessToken } = await request.json();
    
    if (!phoneId || !accessToken) {
      return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 });
    }
    
    const result = await validateWhatsAppCredentials({ phoneId, accessToken });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 500 });
  }
}
