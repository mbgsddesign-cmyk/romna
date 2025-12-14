import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-Side STT API Route
 * Handles HuggingFace Whisper transcription server-side
 * This keeps API keys secure and avoids CORS issues
 */

// Server-only env (no NEXT_PUBLIC_)
const HF_API_KEY = process.env.HF_API_KEY || process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;
const HF_STT_MODEL = process.env.HF_STT_MODEL || 'openai/whisper-small';
const HF_ENDPOINT = 'https://api-inference.huggingface.co/models/';

// Language detection helper
function detectLanguage(text: string): 'en' | 'ar' {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text) ? 'ar' : 'en';
}

export async function POST(req: NextRequest) {
    console.log('[STT API] Request received');

    try {
        // 1. Validate API key
        if (!HF_API_KEY) {
            console.error('[STT API] Missing HF_API_KEY');
            return NextResponse.json({
                error: 'STT_CONFIG_ERROR',
                message: 'STT service not configured',
                fallback: 'offline'
            }, { status: 503 });
        }

        // 2. Get audio from request
        const contentType = req.headers.get('content-type') || '';
        let audioBlob: Blob;

        if (contentType.includes('application/json')) {
            // Base64 encoded audio
            const body = await req.json();
            if (!body.audio) {
                return NextResponse.json({
                    error: 'INVALID_REQUEST',
                    message: 'Missing audio data',
                    fallback: 'offline'
                }, { status: 400 });
            }

            // Decode base64 to blob
            const base64 = body.audio.replace(/^data:audio\/\w+;base64,/, '');
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            audioBlob = new Blob([bytes], { type: 'audio/webm' });
        } else if (contentType.includes('multipart/form-data')) {
            // FormData with audio file
            const formData = await req.formData();
            const audioFile = formData.get('audio') as File | null;
            if (!audioFile) {
                return NextResponse.json({
                    error: 'INVALID_REQUEST',
                    message: 'Missing audio file',
                    fallback: 'offline'
                }, { status: 400 });
            }
            audioBlob = audioFile;
        } else {
            // Raw audio bytes
            const buffer = await req.arrayBuffer();
            audioBlob = new Blob([buffer], { type: 'audio/webm' });
        }

        console.log(`[STT API] Audio size: ${audioBlob.size} bytes`);

        if (audioBlob.size < 1000) {
            return NextResponse.json({
                error: 'AUDIO_TOO_SHORT',
                message: 'Audio recording too short',
                fallback: 'offline'
            }, { status: 400 });
        }

        // 3. Call HuggingFace Whisper API with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

        try {
            const response = await fetch(`${HF_ENDPOINT}${HF_STT_MODEL}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_API_KEY}`,
                    'Content-Type': 'application/octet-stream',
                },
                body: audioBlob,
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const errText = await response.text();
                console.error(`[STT API] HF Error: ${response.status}`, errText);

                // Handle model loading
                if (response.status === 503) {
                    return NextResponse.json({
                        error: 'MODEL_LOADING',
                        message: 'STT model is loading, please retry',
                        fallback: 'offline'
                    }, { status: 503 });
                }

                return NextResponse.json({
                    error: 'STT_PROVIDER_ERROR',
                    message: `STT failed: ${response.statusText}`,
                    fallback: 'offline'
                }, { status: 502 });
            }

            const result = await response.json();
            console.log('[STT API] HF Result:', result);

            const transcript = (result.text || '').trim();

            if (!transcript) {
                return NextResponse.json({
                    error: 'EMPTY_TRANSCRIPT',
                    message: 'No speech detected',
                    fallback: 'offline'
                }, { status: 200 }); // 200 because request succeeded, just no speech
            }

            const language = detectLanguage(transcript);
            const confidence = result.confidence || 0.0;

            console.log(`[STT API] Success: ${language.toUpperCase()} | Conf: ${confidence} | "${transcript.substring(0, 30)}..."`);

            return NextResponse.json({
                transcript,
                language,
                confidence,
                provider: 'hf'
            });

        } catch (fetchError: any) {
            clearTimeout(timeout);

            if (fetchError.name === 'AbortError') {
                console.error('[STT API] Request timed out');
                return NextResponse.json({
                    error: 'STT_TIMEOUT',
                    message: 'STT request timed out',
                    fallback: 'offline'
                }, { status: 504 });
            }

            throw fetchError;
        }

    } catch (error: any) {
        console.error('[STT API] Exception:', error);
        return NextResponse.json({
            error: 'STT_UNAVAILABLE',
            message: error.message || 'STT service unavailable',
            fallback: 'offline'
        }, { status: 500 });
    }
}
