'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { BottomNav } from '@/components/bottom-nav';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore, IntentType } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Mic as MicIcon, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MicButton, Waveform, IntentBadge, SectionHeader, EmptyState } from '@/components/romna';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function VoicePage() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const { voiceNotes, voiceIntents, addVoiceNote, addVoiceIntent, updateVoiceIntent, addTask, addEvent } = useAppStore();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef<string>('');

  // Detect best supported MIME type for cross-browser compatibility
  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',  // Chrome, Edge, Firefox (preferred)
      'audio/mp4',                // Safari, iOS
      'audio/webm',               // Fallback for older browsers
      'audio/wav',                // Universal fallback
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return ''; // Let browser choose default
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      recordingMimeTypeRef.current = mediaRecorder.mimeType;

      console.log('[Voice Recording] Started with MIME type:', mediaRecorder.mimeType);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: recordingMimeTypeRef.current });
        stream.getTracks().forEach((track) => track.stop());
        
        console.log('[Voice Recording] Stopped. Blob size:', audioBlob.size, 'Type:', audioBlob.type);
        
        // Validate blob before processing
        if (audioBlob.size === 0) {
          toast.error(locale === 'ar' ? 'لم يتم تسجيل صوت' : 'No audio recorded');
          return;
        }
        
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('[Voice Recording] Error:', err);
      if (err instanceof Error && err.name === 'NotAllowedError') {
        toast.error(locale === 'ar' ? 'تم رفض إذن الميكروفون' : 'Microphone permission denied');
      } else {
        toast.error(locale === 'ar' ? 'لم يمكن الوصول للميكروفون' : 'Could not access microphone');
      }
    }
  }, [locale]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setTranscript('');
    setProcessingStatus(locale === 'ar' ? 'جاري التعرف على الصوت...' : 'Transcribing...');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeRes = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) {
        const errorData = await transcribeRes.json();
        toast.error(locale === 'ar' 
          ? `فشل التعرف على الصوت: ${errorData.error}` 
          : `Speech recognition failed: ${errorData.error}`
        );
        throw new Error('Transcription failed');
      }
      
      const { transcript: text } = await transcribeRes.json();
      
      if (!text || text.trim() === '') {
        toast.warning(locale === 'ar' ? 'لم يتم اكتشاف كلام - حاول مرة أخرى' : 'No speech detected - try again');
        return;
      }
      
      setTranscript(text);
      setProcessingStatus(locale === 'ar' ? 'جاري معالجة القرار...' : 'Processing decision...');

      if (!user?.id) {
        toast.error(locale === 'ar' ? 'المستخدم غير مسجل دخول' : 'User not authenticated');
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const decideRes = await fetch('/api/voice/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: text, 
          locale, 
          userId: user.id 
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!decideRes.ok) {
        const errorData = await decideRes.json();
        toast.error(errorData.error || (locale === 'ar' ? 'فشل معالجة الأمر' : 'Failed to process command'));
        return;
      }
      
      const { success, decision, intent, action } = await decideRes.json();
      
      if (success) {
        let successMessage = locale === 'ar' ? 'تم!' : 'Done!';
        
        if (action === 'create_task') {
          successMessage = locale === 'ar' ? 'تم إنشاء المهمة!' : 'Task created!';
        } else if (action === 'create_reminder') {
          successMessage = locale === 'ar' ? 'تم إنشاء التذكير!' : 'Reminder created!';
        } else if (action === 'update_decision') {
          successMessage = locale === 'ar' ? 'تم تحديث القرار!' : 'Decision updated!';
        }

        toast.success(successMessage);

        setTimeout(() => {
          router.push('/');
        }, 500);
      }
      
    } catch (err: any) {
      console.error('Processing error:', err);
      
      if (err.name === 'AbortError') {
        toast.error(locale === 'ar' ? 'انتهت مهلة الطلب - حاول مرة أخرى' : 'Request timeout - try again');
      } else if (err.message !== 'Transcription failed') {
        toast.error(locale === 'ar' ? 'فشلت المعالجة - حاول مرة أخرى' : 'Processing failed. Try again.');
      }
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executed': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'scheduled': return <Clock className="w-3 h-3 text-amber-500" />;
      case 'failed': return <AlertCircle className="w-3 h-3 text-red-500" />;
      default: return null;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <>
      <PageWrapper className="px-5">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.header variants={itemVariants} className="pt-8 pb-6 text-center">
            <h1 className="text-[32px] font-extrabold text-foreground mb-2">{t('voice')}</h1>
            <p className="text-accent text-[14px] font-medium">
              {locale === 'ar' ? 'اطلب أي شيء بصوتك' : 'Just speak your mind'}
            </p>
          </motion.header>

          <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-12">
            {isProcessing ? (
              <div className="w-36 h-36 rounded-full bg-accent/20 flex items-center justify-center neon-glow-strong animate-pulse">
                <Loader2 className="w-14 h-14 text-accent animate-spin" />
              </div>
            ) : (
              <div className="relative">
                <MicButton 
                  size="hero"
                  isRecording={isRecording}
                  onPressStart={startRecording}
                  onPressEnd={stopRecording}
                />
                {isRecording && (
                  <div className="absolute inset-0 rounded-full neon-glow-strong animate-pulse pointer-events-none" />
                )}
              </div>
            )}

            <motion.div
              variants={itemVariants}
              className="mt-8 flex flex-col items-center"
            >
              <Waveform isActive={isRecording} barCount={7} className="h-10 mb-4" />
              <p className="text-[15px] text-muted-foreground font-medium">
                {isProcessing && processingStatus ? processingStatus : isProcessing ? t('processing') : isRecording ? t('recording') : t('holdToRecord')}
              </p>
            </motion.div>
          </motion.div>

          <AnimatePresence>
            {transcript && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="glass-card p-5 mb-4">
                  <h3 className="text-[13px] font-semibold text-accent uppercase tracking-wider mb-3">
                    {t('transcript')}
                  </h3>
                  <p className="text-[15px] text-foreground leading-relaxed">{transcript}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.section variants={itemVariants} className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <MicIcon className="w-5 h-5 text-accent" />
              <h2 className="text-[18px] font-bold text-foreground">{t('recentVoiceNotes')}</h2>
            </div>
            {voiceNotes.length > 0 ? (
              <div className="space-y-3">
                {voiceNotes.slice(0, 5).map((note) => {
                  const intent = voiceIntents.find(i => i.rawText === note.transcript);
                  return (
                    <div key={`${note.id}-${note.createdAt}`} className="glass-card-hover glass-card p-4">
                      <p className="text-[14px] text-foreground line-clamp-2 leading-relaxed mb-3">{note.transcript}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-accent font-medium">
                          {format(new Date(note.createdAt), 'MMM d, h:mm a')}
                        </span>
                        <div className="flex items-center gap-2">
                          {intent && (
                            <span className={cn(
                              "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold",
                              intent.status === 'executed' && "bg-green-500/20 text-green-400",
                              intent.status === 'scheduled' && "bg-amber-500/20 text-amber-400",
                              intent.status === 'failed' && "bg-red-500/20 text-red-400"
                            )}>
                              {getStatusIcon(intent.status)}
                              {t(`intent${intent.status.charAt(0).toUpperCase() + intent.status.slice(1)}` as 'intentExecuted' | 'intentScheduled' | 'intentFailed')}
                            </span>
                          )}
                          {note.intent && (
                            <IntentBadge intent={note.intent as IntentType} className="text-[11px] py-1 px-2.5" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card p-10 text-center">
                <MicIcon className="w-14 h-14 text-accent/50 mx-auto mb-4" />
                <p className="text-[15px] text-muted-foreground">{t('noVoiceNotes')}</p>
              </div>
            )}
          </motion.section>
        </motion.div>
      </PageWrapper>
      <BottomNav />
    </>
  );
}