'use client';

import { BottomNav } from '@/components/bottom-nav';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function VoicePage() {
  const { locale } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const { } = useAppStore();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef<string>('');

  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/mp4',
      'audio/webm',
      'audio/wav',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const processAudio = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    setProcessingStatus(locale === 'ar' ? 'جاري الاستماع...' : 'Listening...');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeRes = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) throw new Error('Transcription failed');
      
      const { transcript: text } = await transcribeRes.json();
      
      if (!text || text.trim() === '') {
        toast.warning('No speech detected');
        return;
      }
      
      setProcessingStatus(locale === 'ar' ? 'فهمت.' : 'I understand.');

      if (!user?.id) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const decideRes = await fetch('/api/voice/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, locale, userId: user.id }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!decideRes.ok) {
        throw new Error('Decision failed');
      }
      
      const { success, action } = await decideRes.json();
      
      if (success) {
        toast.success(action === 'create_task' ? 'Task Created' : 'Done');
        setTimeout(() => router.push('/'), 800);
      }
      
    } catch (err: unknown) {
      console.error('Processing error:', err);
      toast.error('Processing failed');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  }, [locale, router, user]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      recordingMimeTypeRef.current = mediaRecorder.mimeType;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: recordingMimeTypeRef.current });
        stream.getTracks().forEach((track) => track.stop());
        if (audioBlob.size === 0) return;
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic Error:', err);
      toast.error('Microphone access denied');
    }
  }, [processAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  return (
    <div className="relative h-screen w-full bg-void overflow-hidden flex flex-col items-center justify-center">
      
      {/* Background Ambient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,20,20,1)_0%,#050505_100%)] pointer-events-none"></div>

      {/* Main Interactive Area */}
      <div 
        className="relative z-10 flex flex-col items-center justify-center w-full h-full cursor-pointer"
        onClick={toggleRecording}
      >
        {/* THE ORB */}
        <div className={`relative transition-all duration-700 ease-out ${isRecording ? 'w-[120vw] h-[120vw] opacity-100' : 'w-32 h-32 opacity-80'}`}>
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-volt to-[#bfff00] blur-[20px] transition-all duration-700 ${isRecording ? 'opacity-20 animate-pulse-slow' : 'opacity-10 animate-float'}`}></div>
          
          {/* Core Orb */}
          <div className={`absolute inset-0 m-auto rounded-full bg-volt shadow-[0_0_50px_rgba(217,253,0,0.3)] transition-all duration-500 ${isRecording ? 'w-full h-full opacity-10 blur-[80px]' : 'w-16 h-16 opacity-100'}`}>
            {!isRecording && !isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-black rounded-full opacity-50 animate-ping"></div>
              </div>
            )}
          </div>

          {/* Liquid/Fluid Effect (simulated with multiple pulsing layers) */}
          {isRecording && (
            <>
               <div className="absolute inset-0 rounded-full border border-volt/10 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
               <div className="absolute inset-0 rounded-full border border-volt/5 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_1s]"></div>
            </>
          )}
        </div>

        {/* Text / Transcript */}
        <div className="absolute z-20 flex flex-col items-center gap-4 max-w-sm text-center px-6 pointer-events-none">
          <AnimatePresence mode="wait">
            {isProcessing ? (
               <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="flex flex-col items-center gap-2"
               >
                 <span className="text-volt font-space text-lg tracking-widest uppercase animate-pulse">
                   {processingStatus}
                 </span>
                 {/* Hide transcript text to match 'Silent Commander' vibe unless requested, but here we keep it hidden or subtle */}
               </motion.div>
            ) : isRecording ? (
               <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
               >
                 <p className="text-white/80 font-space text-2xl font-light tracking-wide">Listening...</p>
               </motion.div>
            ) : (
               <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 0.5 }}
                 className="mt-32"
               >
                 <p className="text-white/30 text-xs font-space tracking-[0.2em] uppercase">
                   {locale === 'ar' ? 'يمكنك أن تطلب مني التذكير أو الإرسال أو الجدولة' : 'You can ask me to remind, send, or schedule.'}
                 </p>
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}