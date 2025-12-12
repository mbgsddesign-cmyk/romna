import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

// Maximum audio duration in seconds (15 seconds for safety)
const MAX_DURATION_SECONDS = 15;
// Maximum file size in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Initialize Supabase client for temp file storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Convert WebM/Opus audio to WAV PCM 16kHz mono format required by Fun-ASR
 */
async function convertToWAV(inputBuffer: Buffer): Promise<{ buffer: Buffer; duration: number }> {
  const tempInput = join(tmpdir(), `input-${Date.now()}.webm`);
  const tempOutput = join(tmpdir(), `output-${Date.now()}.wav`);

  try {
    // Write input buffer to temp file
    await writeFile(tempInput, inputBuffer);

    // Convert using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempInput)
        .outputOptions([
          '-ar', '16000',    // Sample rate: 16kHz
          '-ac', '1',        // Channels: 1 (mono)
          '-f', 'wav',       // Format: WAV
          '-acodec', 'pcm_s16le', // Codec: PCM signed 16-bit little-endian
        ])
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(tempOutput);
    });

    // Get audio duration
    const duration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(tempOutput, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration || 0);
      });
    });

    // Read converted WAV file
    const wavBuffer = await readFile(tempOutput);

    // Cleanup temp files
    await Promise.all([
      unlink(tempInput).catch(() => {}),
      unlink(tempOutput).catch(() => {}),
    ]);

    return { buffer: wavBuffer, duration };
  } catch (error) {
    // Cleanup on error
    await Promise.all([
      unlink(tempInput).catch(() => {}),
      unlink(tempOutput).catch(() => {}),
    ]);
    throw error;
  }
}

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

    const inputMimeType = audioFile.type || 'unknown';
    console.log('[Fun-ASR] Sending audio for transcription:', {
      size: audioFile.size,
      type: inputMimeType,
      maxDuration: MAX_DURATION_SECONDS,
    });

    // Step 1: Convert WebM/Opus to WAV PCM 16kHz mono
    const inputBuffer = Buffer.from(await audioFile.arrayBuffer());
    
    let wavBuffer: Buffer;
    let audioDuration: number;
    
    try {
      const converted = await convertToWAV(inputBuffer);
      wavBuffer = converted.buffer;
      audioDuration = converted.duration;
      
      console.log('[Fun-ASR] Audio converted:', {
        originalSize: audioFile.size,
        wavSize: wavBuffer.length,
        duration: `${audioDuration.toFixed(2)}s`,
      });

      // Validate duration
      if (audioDuration > MAX_DURATION_SECONDS) {
        return NextResponse.json(
          { error: `Audio too long. Maximum duration is ${MAX_DURATION_SECONDS} seconds` },
          { status: 400 }
        );
      }

      // Validate converted audio is not empty
      if (wavBuffer.length < 1000) { // WAV header + minimal audio data
        return NextResponse.json(
          { error: 'Converted audio is empty or too short' },
          { status: 400 }
        );
      }
    } catch (conversionError) {
      console.error('[Fun-ASR] Conversion error:', conversionError);
      return NextResponse.json(
        { error: 'Failed to convert audio format' },
        { status: 500 }
      );
    }

    // Step 2: Upload WAV to Supabase temp storage
    const filename = `voice-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`;
    tempFilePath = `temp-asr/${filename}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voice-temp')
      .upload(tempFilePath, wavBuffer, {
        contentType: 'audio/wav',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Fun-ASR] Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload audio for processing' },
        { status: 500 }
      );
    }

    // Step 3: Get public URL
    const { data: urlData } = supabase.storage
      .from('voice-temp')
      .getPublicUrl(tempFilePath);
    
    const fileUrl = urlData.publicUrl;
    
    console.log('[Fun-ASR] WAV uploaded, calling ASR with URL:', fileUrl);

    // Step 4: Call Fun-ASR async_call with file URL
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
          provider: 'dashscope-fun-asr-intl'
        },
        { status: asrResponse.status }
      );
    }

    const asrData = await asrResponse.json();
    const taskId = asrData.output?.task_id;
    
    console.log('[Fun-ASR] Task submitted:', { task_id: taskId });

    if (!taskId) {
      throw new Error('No task_id returned from Fun-ASR');
    }

    // Step 5: Poll for completion
    let transcript = '';
    let attempts = 0;
    const maxAttempts = 10;  // 10 attempts × 500ms = 5 seconds max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Poll every 500ms
      
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
          // 🔍 CRITICAL: Log FULL response structure
          console.log('[Fun-ASR] ✅ SUCCEEDED - Full pollData:');
          console.log(JSON.stringify(pollData, null, 2));
          
          const output = pollData.output || {};
          const pathsChecked: string[] = [];
          
          // CANONICAL EXTRACTION based on Fun-ASR International API structure
          
          // PATH 1: Check transcription_url (file-based response)
          if (output.results && Array.isArray(output.results) && output.results[0]?.transcription_url) {
            const transcriptionUrl = output.results[0].transcription_url;
            pathsChecked.push('output.results[0].transcription_url');
            
            console.log('[Fun-ASR] Fetching transcript from:', transcriptionUrl);
            
            try {
              const tRes = await fetch(transcriptionUrl);
              const tJson = await tRes.json();
              
              console.log('[Fun-ASR] Transcription JSON keys:', Object.keys(tJson));
              console.log('[Fun-ASR] Full transcription JSON:');
              console.log(JSON.stringify(tJson, null, 2));
              
              // Extract text from transcription JSON
              // Try common formats
              if (tJson.text) {
                transcript = tJson.text;
              } else if (tJson.transcription) {
                transcript = typeof tJson.transcription === 'string' 
                  ? tJson.transcription 
                  : tJson.transcription.text || '';
              } else if (tJson.sentences && Array.isArray(tJson.sentences)) {
                transcript = tJson.sentences.map((s: any) => s.text || '').join(' ').trim();
              } else if (tJson.results && Array.isArray(tJson.results)) {
                transcript = tJson.results.map((r: any) => r.text || '').join(' ').trim();
              }
            } catch (fetchError) {
              console.error('[Fun-ASR] Failed to fetch transcription_url:', fetchError);
            }
          }
          
          // PATH 2: Direct text fields (inline response)
          if (!transcript && output.results && Array.isArray(output.results) && output.results.length > 0) {
            const result = output.results[0];
            
            if (result.transcription?.text) {
              pathsChecked.push('output.results[0].transcription.text');
              transcript = result.transcription.text;
            } else if (result.text) {
              pathsChecked.push('output.results[0].text');
              transcript = result.text;
            } else if (result.transcript) {
              pathsChecked.push('output.results[0].transcript');
              transcript = result.transcript;
            } else if (result.sentences && Array.isArray(result.sentences)) {
              pathsChecked.push('output.results[0].sentences[]');
              transcript = result.sentences.map((s: any) => s.text || '').join(' ').trim();
            }
          }
          
          // PATH 3: Other possible locations
          if (!transcript && output.result?.text) {
            pathsChecked.push('output.result.text');
            transcript = output.result.text;
          }
          
          if (!transcript && output.text) {
            pathsChecked.push('output.text');
            transcript = output.text;
          }
          
          console.log('[Fun-ASR] Paths checked:', pathsChecked);
          console.log('[Fun-ASR] Extracted transcript:', transcript);
          
          // 🚨 UNIT-SAFE GUARD
          if (!transcript || transcript.trim() === '') {
            console.error('[Fun-ASR] ❌ SUCCEEDED but transcript not found!');
            console.error('[Fun-ASR] Available keys:', Object.keys(output));
            
            // Cleanup before returning error
            if (tempFilePath) {
              await supabase.storage.from('voice-temp').remove([tempFilePath]);
            }
            
            return NextResponse.json(
              { 
                error: 'SUCCEEDED but transcript field not found',
                debug_paths_checked: pathsChecked,
                debug_output_keys: Object.keys(output),
                debug_transcription_json_keys: output.results?.[0]?.transcription_url 
                  ? 'Check server logs for transcription JSON structure' 
                  : 'No transcription_url available',
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

    // Step 6: Cleanup temp file
    if (tempFilePath) {
      await supabase.storage.from('voice-temp').remove([tempFilePath]);
      console.log('[Fun-ASR] Temp file cleaned up');
    }

    if (!transcript) {
      return NextResponse.json(
        { error: 'ASR processing timeout - no response within 5 seconds' },
        { status: 500 }
      );
    }

    console.log('[Fun-ASR] ✅ Success! Transcript:', transcript);
    return NextResponse.json({ 
      transcript,
      provider: 'dashscope-fun-asr-intl'
    });

  } catch (error) {
    console.error('[Fun-ASR] Transcription error:', error);
    
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
