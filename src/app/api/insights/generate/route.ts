import { NextRequest, NextResponse } from 'next/server';

// Force dynamic to prevent build-time env access
export const dynamic = 'force-dynamic';

// Lazy import to avoid build-time errors
async function getAutoGLM() {
  const { AutoGLM } = await import('@/lib/autoglm');
  return AutoGLM;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    const AutoGLM = await getAutoGLM();
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
