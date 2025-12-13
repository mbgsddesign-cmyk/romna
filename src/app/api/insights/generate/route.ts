import { NextRequest, NextResponse } from 'next/server';
import { AutoGLM } from '@/lib/autoglm';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    const result = await AutoGLM.run(userId, 'new_insight');
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || result.reason }, { status: 500 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Generate insight error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
