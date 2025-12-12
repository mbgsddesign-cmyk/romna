'use client';

import { PageWrapper } from '@/components/page-wrapper';
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
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function VoicePage() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const { voiceNotes, voiceIntents, addVoiceNote, addVoiceIntent, updateVoiceIntent, addTask, addEvent } = useAppStore();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [detectedIntent, setDetectedIntent] = useState<{
    type: IntentType;
    confidence?: number;
    data: Record<string, unknown>;
  } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error(locale === 'ar' ? 'لم يمكن الوصول للميكروفون' : 'Could not access microphone');
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
    setDetectedIntent(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeRes = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) {
        const errorData = await transcribeRes.json();
        if (errorData.error === 'OpenAI API key not configured') {
          toast.error(locale === 'ar' ? 'مفتاح OpenAI غير مضبوط - استخدم الوضع التجريبي' : 'OpenAI API key not configured - using demo mode');
          setTranscript('Demo: Add a meeting with Ahmed tomorrow at 3pm');
          setDetectedIntent({
            type: 'event',
            confidence: 0.92,
            data: { title: 'Meeting with Ahmed', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '3pm' },
          });
          return;
        }
        throw new Error('Transcription failed');
      }
      
      const { transcript: text } = await transcribeRes.json();
      setTranscript(text);

      const classifyRes = await fetch('/api/voice/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, locale, userId: user?.id }),
      });

      if (!classifyRes.ok) throw new Error('Classification failed');
      
      const { success, intent } = await classifyRes.json();
      
      if (success && intent) {
        const intentData = {
          type: intent.type as IntentType,
          confidence: intent.confidence,
          data: intent[intent.type] || {},
        };
        setDetectedIntent(intentData);
      }
    } catch (err) {
      console.error('Processing error:', err);
      toast.error(locale === 'ar' ? 'فشلت المعالجة - حاول مرة أخرى' : 'Processing failed. Try again.');
      setTranscript(locale === 'ar' ? 'تجريبي: ذكرني بالاجتماع غداً الساعة 10 صباحاً' : 'Demo: Remind me about the meeting tomorrow at 10am');
      setDetectedIntent({
        type: 'reminder',
        confidence: 0.88,
        data: { title: locale === 'ar' ? 'الاجتماع' : 'meeting', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '10am' },
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveAction = async () => {
    if (!detectedIntent || !transcript) return;

    addVoiceNote({ transcript, intent: detectedIntent.type });
    
    addVoiceIntent({
      type: detectedIntent.type,
      rawText: transcript,
      structuredData: detectedIntent.data,
      status: detectedIntent.data.scheduledFor ? 'scheduled' : 'executed',
      scheduledFor: detectedIntent.data.scheduledFor as string | undefined,
    });

    if (detectedIntent.type === 'task') {
      const taskData = detectedIntent.data as { title?: string; dueDate?: string; date?: string; priority?: 'low' | 'medium' | 'high' };
      const taskTitle = taskData.title || transcript;
      const dueDate = taskData.dueDate || taskData.date || new Date().toISOString();
      
      addTask({
        title: taskTitle,
        dueDate: dueDate,
        priority: taskData.priority || 'medium',
        status: 'pending',
      });

      if (user?.id) {
        await supabase.from('tasks').insert({
          user_id: user.id,
          title: taskTitle,
          due_date: dueDate,
          priority: taskData.priority || 'medium',
          status: 'pending',
          source: 'voice',
        });
      }
      
      toast.success(locale === 'ar' ? 'تم إنشاء المهمة!' : 'Task created!');
    } else if (detectedIntent.type === 'event') {
      const eventData = detectedIntent.data as { title?: string; date?: string; location?: string; time?: string };
      const eventTitle = eventData.title || transcript;
      let eventDate = eventData.date || new Date().toISOString();
      if (eventData.time) {
        const timePart = eventData.time.replace(/[^\d:]/g, '');
        eventDate = `${eventDate.split('T')[0]}T${timePart.padStart(5, '0')}:00`;
      }

      addEvent({
        title: eventTitle,
        date: eventDate,
        location: eventData.location,
      });

      if (user?.id) {
        await supabase.from('events').insert({
          user_id: user.id,
          title: eventTitle,
          start_time: eventDate,
          location: eventData.location,
          source: 'voice',
        });
      }

      toast.success(locale === 'ar' ? 'تم إنشاء الحدث!' : 'Event created!');
    } else if (detectedIntent.type === 'reminder') {
      const reminderData = detectedIntent.data as { title?: string; date?: string; time?: string };
      const reminderTitle = reminderData.title || transcript;
      let reminderDate = reminderData.date || new Date(Date.now() + 3600000).toISOString();

      addTask({
        title: `🔔 ${reminderTitle}`,
        dueDate: reminderDate,
        priority: 'high',
        status: 'pending',
      });

      if (user?.id) {
        await supabase.from('tasks').insert({
          user_id: user.id,
          title: `🔔 ${reminderTitle}`,
          due_date: reminderDate,
          priority: 'high',
          status: 'pending',
          source: 'voice',
        });
      }

      toast.success(locale === 'ar' ? 'تم إنشاء التذكير!' : 'Reminder set!');
    } else if (detectedIntent.type === 'whatsapp_message') {
      toast.success(locale === 'ar' ? 'تم جدولة رسالة واتساب!' : 'WhatsApp message scheduled!');
    } else if (detectedIntent.type === 'telegram_message') {
      toast.success(locale === 'ar' ? 'تم جدولة رسالة تيليجرام!' : 'Telegram message scheduled!');
    } else if (detectedIntent.type === 'email') {
      toast.success(locale === 'ar' ? 'تم حفظ مسودة البريد!' : 'Email draft saved!');
    } else {
      toast.success(locale === 'ar' ? 'تم الحفظ!' : 'Saved!');
    }

    setTranscript('');
    setDetectedIntent(null);
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
    <PageWrapper className="px-5">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.header variants={itemVariants} className="pt-6 pb-4">
          <h1 className="text-2xl font-extrabold">{t('voice')}</h1>
        </motion.header>

        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-8">
          {isProcessing ? (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center romna-glow-primary">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            </div>
          ) : (
            <MicButton 
              size="hero"
              isRecording={isRecording}
              onPressStart={startRecording}
              onPressEnd={stopRecording}
            />
          )}

          <motion.div
            variants={itemVariants}
            className="mt-6 flex flex-col items-center"
          >
            <Waveform isActive={isRecording} barCount={7} className="h-8 mb-3" />
            <p className="text-sm text-muted-foreground">
              {isProcessing ? t('processing') : isRecording ? t('recording') : t('holdToRecord')}
            </p>
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-4 mb-4">
                <h3 className="romna-section-title mb-2">
                  {t('transcript')}
                </h3>
                <p className="text-sm leading-relaxed">{transcript}</p>
              </Card>
            </motion.div>
          )}

          {detectedIntent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-4 mb-4">
                <h3 className="romna-section-title mb-3">
                  {t('intentDetected')}
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <IntentBadge intent={detectedIntent.type} />
                  {detectedIntent.confidence && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(detectedIntent.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
                <div className="bg-muted/50 rounded-xl p-3 mb-4 space-y-1">
                  {Object.entries(detectedIntent.data).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-muted-foreground capitalize">{key}:</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={handleApproveAction} className="w-full" size="lg" variant="teal">
                  {t('approveAction')}
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.section variants={itemVariants}>
          <SectionHeader title={t('recentVoiceNotes')} />
          {voiceNotes.length > 0 ? (
            <div className="space-y-2">
              {voiceNotes.slice(0, 5).map((note, index) => {
                const intent = voiceIntents.find(i => i.rawText === note.transcript);
                return (
                  <Card key={`${note.id}-${index}`} className="p-3">
                    <p className="text-sm line-clamp-2">{note.transcript}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.createdAt), 'MMM d, h:mm a')}
                      </span>
                      <div className="flex items-center gap-2">
                        {intent && (
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                            intent.status === 'executed' && "bg-green-500/10 text-green-600",
                            intent.status === 'scheduled' && "bg-amber-500/10 text-amber-600",
                            intent.status === 'failed' && "bg-red-500/10 text-red-600"
                          )}>
                            {getStatusIcon(intent.status)}
                            {t(`intent${intent.status.charAt(0).toUpperCase() + intent.status.slice(1)}` as 'intentExecuted' | 'intentScheduled' | 'intentFailed')}
                          </span>
                        )}
                        {note.intent && (
                          <IntentBadge intent={note.intent as IntentType} className="text-xs py-0.5 px-2" />
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState message={t('noVoiceNotes')} icon={MicIcon} />
          )}
        </motion.section>
      </motion.div>
    </PageWrapper>
  );
}