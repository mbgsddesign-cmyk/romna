import { NextRequest, NextResponse } from 'next/server';

// Maximum audio duration in seconds (15 seconds for safety)
const MAX_DURATION_SECONDS = 15;
// Maximum file size in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const dashscopeApiKey = process.env.DASHSCOPE_API_KEY;
    if (!dashscopeApiKey) {
      return NextResponse.json(
        { error: 'DashScope API key not configured' },
        { status: 500 }
      );
    }

    // Prepare file for Fun-ASR
    // Fun-ASR supports: pcm, wav, mp3, opus, speex, aac, amr
    // Browser MediaRecorder typically outputs webm/opus or webm/vp8
    // We'll send it as-is and let Fun-ASR handle it (supports opus in Ogg container)
    
    const asrFormData = new FormData();
    asrFormData.append('model', 'paraformer-realtime-v2');
    asrFormData.append('file', audioFile, 'recording.webm');
    asrFormData.append('language_hints', 'en'); // Support English, can add 'ar' for Arabic

    console.log('[Fun-ASR] Sending audio for transcription:', {
      size: audioFile.size,
      type: audioFile.type,
      maxDuration: MAX_DURATION_SECONDS,
    });

    // Use DashScope REST API for file transcription
    // Endpoint: https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dashscopeApiKey}`,
        'X-DashScope-Async': 'enable', // Enable async processing for files
      },
      body: asrFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Fun-ASR] Transcription failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      
      return NextResponse.json(
        { 
          error: 'Transcription failed', 
          details: errorText,
          provider: 'Fun-ASR (Alibaba Cloud)'
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('[Fun-ASR] Transcription response:', data);

    // Extract transcript from Fun-ASR response
    // Response format: { output: { task_id, task_status, url }, usage: { duration } }
    // For async tasks, we need to poll the task_id
    if (data.output?.task_status === 'PENDING' || data.output?.task_status === 'RUNNING') {
      // Poll for completion (simplified for now)
      const taskId = data.output.task_id;
      let transcript = '';
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between polls
        
        const pollResponse = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${dashscopeApiKey}`,
          },
        });

        if (pollResponse.ok) {
          const pollData = await pollResponse.json();
          
          if (pollData.output?.task_status === 'SUCCEEDED') {
            // Download result from URL
            if (pollData.output.url) {
              const resultResponse = await fetch(pollData.output.url);
              const resultData = await resultResponse.json();
              transcript = resultData.transcripts?.[0]?.text || resultData.output?.sentence?.text || '';
            } else {
              transcript = pollData.output?.sentence?.text || pollData.output?.text || '';
            }
            break;
          } else if (pollData.output?.task_status === 'FAILED') {
            throw new Error('Fun-ASR task failed');
          }
        }
        
        attempts++;
      }

      if (!transcript) {
        throw new Error('Transcription timeout or empty result');
      }

      return NextResponse.json({ transcript });
    }

    // Handle direct response (if not async)
    const transcript = data.output?.sentence?.text || data.output?.text || '';
    
    if (!transcript) {
      console.error('[Fun-ASR] No transcript in response:', data);
      return NextResponse.json(
        { error: 'No transcript returned from Fun-ASR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('[Fun-ASR] Transcription error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
