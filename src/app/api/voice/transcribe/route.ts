import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Maximum audio duration in seconds (15 seconds for safety)
const MAX_DURATION_SECONDS = 15;
// Maximum file size in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Initialize Supabase client for temp file storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  
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

    // Validate empty audio
    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: 'Empty audio file - no speech detected' },
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

    console.log('[Fun-ASR] Processing audio:', {
      size: audioFile.size,
      type: audioFile.type,
      maxDuration: MAX_DURATION_SECONDS,
    });

    // Step 1: Upload audio to Supabase temp storage
    const filename = `voice-${Date.now()}-${Math.random().toString(36).slice(2)}.webm`;
    tempFilePath = `temp-asr/${filename}`;
    
    const arrayBuffer = await audioFile.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voice-temp')
      .upload(tempFilePath, arrayBuffer, {
        contentType: audioFile.type || 'audio/webm',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Fun-ASR] Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload audio for processing' },
        { status: 500 }
      );
    }

    // Step 2: Get public URL
    const { data: urlData } = supabase.storage
      .from('voice-temp')
      .getPublicUrl(tempFilePath);
    
    const fileUrl = urlData.publicUrl;
    
    console.log('[Fun-ASR] Audio uploaded, calling ASR with URL:', fileUrl);

    // Step 3: Call Fun-ASR async_call with file URL
    const asrPayload = {
      model: 'fun-asr',
      input: {
        file_urls: [fileUrl]
      },
      parameters: {
        language_hints: ['en']  // English support
      }
    };

    const asrResponse = await fetch(
      'https://dashscope-intl.aliyuncs.com/api/v1/services/audio/asr/transcription',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dashscopeApiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify(asrPayload),
      }
    );

    if (!asrResponse.ok) {
      const errorText = await asrResponse.text();
      console.error('[Fun-ASR] ASR API error:', {
        status: asrResponse.status,
        statusText: asrResponse.statusText,
        error: errorText,
      });
      
      return NextResponse.json(
        { 
          error: 'Transcription failed', 
          details: errorText,
          provider: 'Fun-ASR (Alibaba Cloud International)'
        },
        { status: asrResponse.status }
      );
    }

    const asrData = await asrResponse.json();
    console.log('[Fun-ASR] Task submitted:', asrData);

    // Step 4: Poll for completion
    const taskId = asrData.output?.task_id;
    if (!taskId) {
      throw new Error('No task_id returned from Fun-ASR');
    }

    let transcript = '';
    let attempts = 0;
    const maxAttempts = 15;  // 15 seconds max polling

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Poll every 1 second
      
      const pollResponse = await fetch(
        `https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${dashscopeApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (pollResponse.ok) {
        const pollData = await pollResponse.json();
        const taskStatus = pollData.output?.task_status;
        
        console.log(`[Fun-ASR] Poll attempt ${attempts + 1}: ${taskStatus}`);
        
        if (taskStatus === 'SUCCEEDED') {
          // 🔍 CRITICAL: Log FULL response structure for debugging
          console.log('[Fun-ASR] ✅ SUCCEEDED - Full pollData.output:');
          console.log(JSON.stringify(pollData.output, null, 2));
          console.log('[Fun-ASR] ✅ SUCCEEDED - Full pollData (entire JSON):');
          console.log(JSON.stringify(pollData, null, 2));
          
          // Track all paths checked for debugging
          const pathsChecked: string[] = [];
          const output = pollData.output || {};
          
          // PATH 1: output.results[0].transcription.text
          if (output.results && Array.isArray(output.results) && output.results.length > 0) {
            const result = output.results[0];
            pathsChecked.push('output.results[0].transcription.text');
            if (result.transcription?.text) {
              transcript = result.transcription.text;
            }
            
            // PATH 2: output.results[0].text
            if (!transcript && result.text) {
              pathsChecked.push('output.results[0].text');
              transcript = result.text;
            }
            
            // PATH 3: output.results[0].transcript
            if (!transcript && result.transcript) {
              pathsChecked.push('output.results[0].transcript');
              transcript = result.transcript;
            }
            
            // PATH 4: Join all result.sentences (if segmented)
            if (!transcript && result.sentences && Array.isArray(result.sentences)) {
              pathsChecked.push('output.results[0].sentences[] (joined)');
              transcript = result.sentences.map((s: any) => s.text || '').join(' ').trim();
            }
          }
          
          // PATH 5: output.result.text
          if (!transcript && output.result?.text) {
            pathsChecked.push('output.result.text');
            transcript = output.result.text;
          }
          
          // PATH 6: output.text
          if (!transcript && output.text) {
            pathsChecked.push('output.text');
            transcript = output.text;
          }
          
          // PATH 7: output.transcription
          if (!transcript && output.transcription) {
            pathsChecked.push('output.transcription');
            transcript = typeof output.transcription === 'string' 
              ? output.transcription 
              : output.transcription.text || '';
          }
          
          // PATH 8: output.url (download transcript file - fallback)
          if (!transcript && output.url) {
            pathsChecked.push('output.url (transcript file)');
            // Note: Would require fetching the URL, skipping for now
          }
          
          console.log('[Fun-ASR] Paths checked:', pathsChecked);
          console.log('[Fun-ASR] Extracted transcript:', transcript);
          
          // 🚨 UNIT-SAFE GUARD: If SUCCEEDED but no transcript found, return debug error
          if (!transcript || transcript.trim() === '') {
            console.error('[Fun-ASR] ❌ SUCCEEDED but transcript field not found!');
            console.error('[Fun-ASR] Available keys in output:', Object.keys(output));
            
            // Cleanup before returning error
            if (tempFilePath) {
              await supabase.storage.from('voice-temp').remove([tempFilePath]);
            }
            
            return NextResponse.json(
              { 
                error: 'SUCCEEDED but transcript field not found',
                debug_paths_checked: pathsChecked,
                debug_output_keys: Object.keys(output),
                debug_full_output: output,
                hint: 'Check server logs for full JSON structure'
              },
              { status: 500 }
            );
          }
          
          break;
        } else if (taskStatus === 'FAILED') {
          console.error('[Fun-ASR] Task failed:', JSON.stringify(pollData, null, 2));
          throw new Error('Fun-ASR transcription task failed');
        }
      }
      
      attempts++;
    }

    // Step 5: Cleanup temp file
    if (tempFilePath) {
      await supabase.storage.from('voice-temp').remove([tempFilePath]);
      console.log('[Fun-ASR] Temp file cleaned up:', tempFilePath);
    }

    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript returned or timeout exceeded' },
        { status: 500 }
      );
    }

    console.log('[Fun-ASR] Success! Transcript:', transcript);
    return NextResponse.json({ transcript });

  } catch (error) {
    console.error('[Fun-ASR] Error:', error);
    
    // Cleanup on error
    if (tempFilePath) {
      try {
        await supabase.storage.from('voice-temp').remove([tempFilePath]);
      } catch {}
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}