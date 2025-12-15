import { NextResponse } from 'next/server';

/**
 * Voice Health Check - STT Configuration
 * 
 * Purpose: Verify STT is configured (keys loaded).
 * Does NOT make actual API calls to HuggingFace.
 * 
 * Alert: 500 = STT will fail for all users
 */

export const dynamic = 'force-dynamic';

export async function GET() {
    const hasHfKey = !!process.env.HF_API_KEY;
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;

    if (!hasHfKey) {
        console.error('[HEALTH/VOICE] Missing HF_API_KEY');
        return NextResponse.json({
            status: 'error',
            error: 'missing_stt_key',
            message: 'HF_API_KEY is not configured'
        }, { status: 500 });
    }

    return NextResponse.json({
        status: 'ok',
        stt: hasHfKey ? 'configured' : 'missing',
        nlu: hasGeminiKey ? 'configured' : 'missing',
        timestamp: Date.now()
    });
}
