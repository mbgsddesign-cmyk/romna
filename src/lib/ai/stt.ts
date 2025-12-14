/**
 * STT Client - Calls internal /api/stt route
 * All HF API calls happen server-side to avoid CORS/key issues
 */

export interface STTResult {
    transcript: string;
    language: 'en' | 'ar';
    confidence: number;
    provider: string;
}

export interface STTError {
    error: string;
    message: string;
    fallback: 'offline';
}

export type STTResponse = STTResult | STTError;

function isSTTError(response: STTResponse): response is STTError {
    return 'error' in response;
}

export async function transcribeAudio(audioBlob: Blob): Promise<STTResult> {
    console.log(`[STT] Sending ${audioBlob.size} bytes to /api/stt...`);

    try {
        // Convert blob to base64 for JSON transport
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
            )
        );

        // Call internal API with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8s client timeout

        const response = await fetch('/api/stt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                audio: `data:audio/webm;base64,${base64}`
            }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        const result: STTResponse = await response.json();
        console.log('[STT] API Response:', result);

        if (isSTTError(result)) {
            console.warn('[STT] Server returned error:', result.error, result.message);
            throw new Error(result.message || 'STT failed');
        }

        console.log(`[STT] Success: ${result.language.toUpperCase()} | Conf: ${result.confidence} | "${result.transcript.substring(0, 20)}..."`);

        return result;

    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error('[STT] Client timeout (8s)');
            throw new Error('STT_TIMEOUT');
        }

        console.error('[STT] Exception:', error);
        throw error;
    }
}

