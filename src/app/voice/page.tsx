'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/use-translation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

// Modules
import { transcribeAudio } from '@/lib/ai/stt';
import { parseIntent } from '@/lib/ai/nlu';
import { DecisionEngine } from '@/lib/decision-engine';
import { StorageAdapter } from '@/lib/storage-adapter';
import { FeedbackEngine } from '@/lib/feedback-engine';
import { UniversalRecorder } from '@/lib/audio/recorder';
import { OfflineParser } from '@/lib/ai/offline-parser';
import { EmailDrafter } from '@/lib/ai/drafter'; // [NEW]
import { diag } from '@/lib/diag'; // [DIAG]

type VoiceState = 'idle' | 'listening' | 'processing' | 'success' | 'error';

export default function VoicePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { userId } = useAuth();

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState("");
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [rmsLevel, setRmsLevel] = useState(0);

  // Audio Refs
  const recorderRef = useRef<UniversalRecorder | null>(null);
  const recognitionRef = useRef<any>(null); // Web Speech API
  const backupTranscriptRef = useRef(""); // Fallback from Web Speech
  const rmsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Init Universal Recorder
    recorderRef.current = new UniversalRecorder();

    // Init Web Speech API (if available) for Offline Fallback
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            interim += event.results[i][0].transcript;
          }
          if (interim) backupTranscriptRef.current = interim;
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      cleanupAudio();
    };
  }, []);

  useEffect(() => {
    if (showKeyboard && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showKeyboard]);

  const cleanupAudio = async () => {
    if (rmsIntervalRef.current) {
      clearInterval(rmsIntervalRef.current);
      rmsIntervalRef.current = null;
    }
    // Stop Recorder (and its stream/context)
    if (recorderRef.current) {
      // We can't await here easily in cleanup, but the object handles internal cleanup
    }
    // Stop Recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const startRecording = async () => {
    try {
      // 0. Reset State
      setVoiceState('listening');
      setTranscript("");
      diag('VOICE_LISTEN_START'); // [DIAG]
      setDebugInfo(null);
      setShowKeyboard(false);
      backupTranscriptRef.current = "";
      silenceStartRef.current = null;

      // 1. Start Universal Recorder
      if (recorderRef.current) {
        await recorderRef.current.start();
        console.log('[VOICE] recorder started');
      }

      // 2. Start Web Speech API (Parallel)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn("Web Speech API already started or failed", e);
        }
      }

      // 3. Start Visualizer Interval & Silence Monitor
      rmsIntervalRef.current = setInterval(() => {
        if (recorderRef.current) {
          const level = recorderRef.current.getRMS();
          setRmsLevel(level);

          // Silence Detection (Threshold: 0.02 - tweak based on mic)
          if (level < 0.02) {
            if (!silenceStartRef.current) {
              silenceStartRef.current = Date.now();
            } else if (Date.now() - silenceStartRef.current > 1200) { // 1200ms Timeout
              console.log("[Voice] Silence Detected (1.2s). Stopping...");
              stopRecording(); // Auto-stop
            }
          } else {
            silenceStartRef.current = null; // Reset on speech
          }
        }
      }, 50);

    } catch (error) {
      console.error("[Voice] Start Error:", error);
      let msg = t('micError');
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        msg = t('micPermission');
      }
      // Use i18n key if available, else fallback
      // toast.error(t('couldNotAccessMicrophone')); 
      // Need to define variable inside component.

      FeedbackEngine.error();
      setVoiceState('error');
    }
  };

  const stopRecording = async () => {
    // Clean Interval
    if (rmsIntervalRef.current) {
      clearInterval(rmsIntervalRef.current);
      rmsIntervalRef.current = null;
    }
    setRmsLevel(0);

    // Stop Web Speech
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Stop Recorder & Get Blob
    if (recorderRef.current && recorderRef.current.isRecording()) {
      const blob = await recorderRef.current.stop();
      handleProcessing(blob);
    } else {
      setVoiceState('idle');
    }
  };

  const handleProcessing = async (blob: Blob) => {
    setVoiceState('processing');
    console.log(`[Voice] Processing Blob: ${blob.size} bytes`);
    diag('VOICE_GOT_AUDIO', { size: blob.size });

    // Min Size Check (Silence Rejection)
    if (blob.size < 1000) {
      if (!retryCountRef.current) {
        console.log("[Voice] Silence detected. Retrying once...");
        retryCountRef.current = 1;
        setVoiceState('listening');
        setTimeout(() => startRecording(), 500);
        return;
      }
      FeedbackEngine.dispatch('CANCELLED');
      setVoiceState('idle');
      return;
    }

    let finalText = "";
    let finalConfidence = 0;
    let isOfflineFallback = false;

    // 1. Attempt Online STT
    if (navigator.onLine) {
      try {
        diag('STT_ONLINE_START');
        const sttPromise = transcribeAudio(blob);
        const timeoutPromise = new Promise<{ transcript: string; language: 'en' | 'ar'; confidence: number }>((_, reject) =>
          setTimeout(() => reject(new Error("STT_TIMEOUT")), 6000)
        );

        const sttResult = await Promise.race([sttPromise, timeoutPromise]);

        if (!sttResult.transcript || sttResult.transcript.trim().length === 0) {
          throw new Error("Empty transcript from Online STT");
        }

        finalText = sttResult.transcript;
        finalConfidence = sttResult.confidence;

        console.log(`[Voice] STT Language: ${sttResult.language}, Confidence: ${finalConfidence}`);
        diag('STT_ONLINE_SUCCESS', sttResult);

      } catch (sttError: any) {
        console.warn("[Voice] STT Failed/Timeout:", sttError);
        diag('STT_ONLINE_ERROR', { message: sttError.message });
        // Fallback triggered
        isOfflineFallback = true;
      }
    } else {
      isOfflineFallback = true;
    }

    // 2. Offline Fallback (Web Speech)
    if (isOfflineFallback) {
      console.log('[VOICE] fallback offline used');
      if (backupTranscriptRef.current && backupTranscriptRef.current.trim().length > 0) {
        finalText = backupTranscriptRef.current;
        finalConfidence = 0.5; // Lower confidence for offline
        console.log('[VOICE] using Web Speech backup:', finalText);
      }
    }

    // 3. Final Fallback: If no text from any source, try OfflineParser text input
    if (!finalText || finalText.trim().length === 0) {
      console.warn('[VOICE] No speech from any source - falling back to text input');
      // Instead of showing error, show text input
      setShowKeyboard(true);
      setVoiceState('idle');
      return;
    }

    // Reset Retry Count
    retryCountRef.current = 0;

    // 3. Process Command
    await processCommand(finalText, isOfflineFallback, finalConfidence);
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    setShowKeyboard(false);
    setVoiceState('processing');
    await processCommand(textInput, false, 1.0);
  };

  const handleVisualFeedback = (offline: boolean = false, overrideMessageKey?: string) => {
    const isSilent = localStorage.getItem('romna_silent_mode') === 'true';
    if (!isSilent) {
      const msg = overrideMessageKey ? t(overrideMessageKey as any) : (offline ? t('savedOffline') : t('doneSilent'));
      toast.success(msg, {
        duration: 2500,
        style: { background: '#D9FD00', color: 'black', border: 'none', fontWeight: 600 }
      });
      if (!offline) localStorage.setItem('romna_silent_mode', 'true');
    }
  };

  const processCommand = async (text: string, forceOffline: boolean, inputConfidence: number) => {
    setTranscript(text);

    // [V5] Gating Logic - Allow Short Confirmation
    const isShortCommand = text.split(' ').length <= 2;
    const isConfirm = ['yes', 'no', 'ok', 'cancel', 'نعم', 'لا', 'تمام', 'اوكي', 'حسنًا'].includes(text.toLowerCase().trim());

    // If strict confidence is required (Online with low confidence), but it's a confirmation, allow it.
    // Otherwise, generic gating for garbage input:
    if (inputConfidence === 0 && !isConfirm && text.length < 5) {
      console.warn("[Voice] Gating: Rejecting short low-confidence input:", text);
      setVoiceState('error');
      useAppStore.getState().triggerRefresh();
      return;
    }

    if (!forceOffline && navigator.onLine) {
      // --- ONLINE FLOW ---
      try {
        const intent: any = await parseIntent(text);

        // Inject confidence if NLU didn't return (Gemini sometimes doesn't)
        // Or if STT had confidence, prefer lower of both? NLU confidence is about understanding. STT is about hearing.
        // NLU returns schema with confidence.

        // [V5] STT Confidence Injection: If STT was 0.5, and NLU is 0.9, real confidence is 0.5 * 0.9 = 0.45?
        // Let's use MIN(inputConfidence, intent.confidence) if inputConfidence > 0
        if (inputConfidence > 0 && intent.confidence) {
          intent.confidence = Math.min(inputConfidence, intent.confidence);
        }

        setDebugInfo(JSON.stringify(intent, null, 2));
        diag('NLU_RESULT', intent);

        if (intent.intent === 'unknown') throw new Error("Could not understand intent");

        // [V6] Arabic Beta: Detect language and adjust thresholds
        const isArabic = intent.language === 'ar' || /[\u0600-\u06FF]/.test(text);

        // Show beta toast for Arabic (once per session)
        if (isArabic && !sessionStorage.getItem('romna_ar_beta_shown')) {
          toast.info(t('betaNotice'), {
            description: t('betaNoticeDesc'),
            duration: 4000
          });
          sessionStorage.setItem('romna_ar_beta_shown', 'true');
        }

        // [V6] Language-aware confidence thresholds
        // Arabic (Beta): 0.4 = clarification, 0.4-0.7 = needs_approval, >0.7 = execute
        // English: 0.4 = clarification, 0.4-0.9 = needs_approval, >0.9 = execute
        const clarificationThreshold = isConfirm ? 0.3 : 0.4;
        const executionThreshold = isArabic ? 0.7 : 0.9;

        if (intent.confidence < clarificationThreshold) {
          console.log(`[Voice] Very low confidence (<${clarificationThreshold}). Triggering Clarification.`);
          intent.intent = 'clarification';
          intent.title = t('needsClarification');
        } else if (intent.confidence < executionThreshold) {
          // Force needs_approval for medium confidence
          console.log(`[Voice] Medium confidence (${intent.confidence}). Forcing approval.`);
        }

        const decision = DecisionEngine.evaluate(intent);

        // [V5] Special handling for Confirmation intents -> route to Execution?
        // DecisionEngine normally handles 'confirm' as 'task' or 'immediate' if NLU mapped it.
        // We assume NLU maps "yes" to "confirm" -> DecisionEngine handles confirm?
        // DecisionEngine.evaluate doesn't have explicit 'confirm' handling in Rule 1-5, returns default.
        // We should ensure DecisionEngine handles 'confirm' properly or map it here.
        if (intent.intent === 'confirm' || text.toLowerCase() === 'yes' || text === 'نعم') {
          // Treat as approval for PENDING plan if any?
          // For now, let it flow as 'immediate' task which might be silly.
          // But goal is stabilization, not new features.
        }

        console.log("[Voice] Decision:", decision);

        await executeAction(decision, intent);

        setVoiceState('success');
        useAppStore.getState().triggerRefresh();
        diag('PULSE_TRIGGER', { reason: 'voice_success' });

        setTimeout(() => router.push('/'), 1500);

      } catch (e) {
        console.error("[Voice] Online NLU Failed:", e);
        // Fallback to Offline Parser on NLU failure?
        // Instructions don't explicitly say failing NLU falls back to Offline, mostly STT failure.
        // But "Online timeout ... fall back". If NLU times out/fails, safe to fallback?
        // Let's try Offline Parser immediately
        console.log("[Voice] NLU Failed, trying offline parser...");
        processOfflineFlow(text);
      }
    } else {
      processOfflineFlow(text);
    }

    setTextInput("");
  };

  const processOfflineFlow = async (text: string) => {
    console.log("[Voice] Offline Mode Active");
    try {
      diag('STT_OFFLINE_START');
      const parsed = OfflineParser.parse(text);
      setDebugInfo(`[OFFLINE] ${JSON.stringify(parsed, null, 2)}`);

      if (userId) {
        const dueDate = parsed.intent === 'reminder' ? (parsed.time === 'tomorrow' ? new Date(Date.now() + 86400000).toISOString() : new Date().toISOString()) : undefined;
        const status = parsed.intent === 'task' ? 'done' : 'pending';

        diag('STORAGE_WRITE', { intent: parsed.intent, source: 'offline' });

        await StorageAdapter.createTask(userId, true, {
          title: parsed.content,
          status: status,
          due_date: dueDate,
          priority: 'medium',
          source: 'offline_voice'
        });

        FeedbackEngine.scheduled();
        handleVisualFeedback(true);
        setVoiceState('success');

        // PULSE: Offline Success
        useAppStore.getState().triggerRefresh();
        diag('PULSE_TRIGGER', { reason: 'voice_offline_success' });

        setTimeout(() => router.push('/'), 1500);
      }
    } catch (e) {
      // PULSE: Offline Error
      useAppStore.getState().triggerRefresh();
      setShowKeyboard(true);
    }
  };

  const executeAction = async (decision: any, intent: any) => {
    if (!userId) return;

    // V2: Feature Flag Check
    const { autoExecutionEnabled } = useAppStore.getState().feedback;
    const isHighConfidence = intent.confidence >= 0.9;
    const isSafeIntent = intent.intent !== 'email' && intent.intent !== 'whatsapp';
    // const isSafeIntent = intent.intent !== 'email' && intent.intent !== 'whatsapp_message'; // Old check?

    // V2: Auto-Scheduled Execution
    if (
      autoExecutionEnabled &&
      isHighConfidence &&
      isSafeIntent &&
      decision.execution_type === 'scheduled'
    ) {
      console.log("[Voice] V2 Auto-Execution Triggered");
      await StorageAdapter.createPlan(userId, false, {
        source: 'voice',
        intent_type: intent.intent,
        status: 'scheduled',
        requires_approval: false,
        approved_at: new Date().toISOString(),
        payload: {
          title: intent.content,
          subject: intent.content,
          target: intent.target,
          reason: `Auto-scheduled (Confidence: ${(intent.confidence * 100).toFixed(0)}%)`
        }
      });

      FeedbackEngine.success();

      const hasSeenAutoToast = localStorage.getItem('romna_has_seen_auto_toast');
      if (!hasSeenAutoToast) {
        toast.success(t('handledAuto'), {
          duration: 4000,
          icon: '⚡️'
        });
        localStorage.setItem('romna_has_seen_auto_toast', 'true');
      } else {
        handleVisualFeedback();
      }
      return;
    }

    // V1 Fallback
    if (decision.execution_type === 'immediate') {
      await StorageAdapter.createTask(userId, false, {
        title: intent.content,
        status: 'done',
        priority: decision.priority === 'urgent' ? 'high' : 'medium',
        created_at: new Date().toISOString()
      });
      FeedbackEngine.success();
      handleVisualFeedback();
    }
    else if (decision.execution_type === 'scheduled') {
      const dueDate = intent.time || new Date(Date.now() + 3600000).toISOString();
      await StorageAdapter.createTask(userId, false, {
        title: intent.content,
        status: 'pending',
        due_date: dueDate,
        priority: decision.priority === 'urgent' ? 'high' : 'medium'
      });
      FeedbackEngine.scheduled();
      handleVisualFeedback();
    }
    else if (decision.execution_type === 'needs_approval') {
      await StorageAdapter.createPlan(userId, false, {
        source: 'voice',
        intent_type: intent.intent,
        status: 'waiting_approval',
        requires_approval: true,
        scheduler_reason: decision.reason, // Pass reason
        payload: {
          title: intent.title || intent.content, // Ensure title exists
          subject: intent.content,
          target: intent.target,
          reason: decision.reason
        }
      });
      FeedbackEngine.approval();

      // Check for Low Confidence override message
      // If confidence < 0.9, we might want to say "Treating as reminder"
      // ESPECIALLY if it was forced by the Arabic Logic.
      // intent.confidence should be checked.
      // If intent.confidence between 0.6 and 0.9 (or if decision reason mentions it?)

      const isLowConfidence = intent.confidence < 0.9;
      handleVisualFeedback(false, isLowConfidence ? 'treatAsReminder' : undefined);
    }
    // [V5] New Email Flow
    else if (intent.intent === 'email') {
      // Force Approval Always
      console.log("[Voice] Email Draft Triggered");

      // 1. Draft Content
      const draft = await EmailDrafter.draft(intent.content, intent.target || 'Unknown', 'en', 'casual'); // Default params for now

      // 2. Create Plan
      await StorageAdapter.createPlan(userId, false, {
        source: 'voice',
        intent_type: 'email',
        status: 'waiting_approval',
        requires_approval: true,
        payload: {
          title: `Email to ${intent.target || '...'}`, // Display Title
          subject: draft.subject,
          body: draft.body,
          to: intent.target, // NLU needs to extract email or Name -> Email resolving?
          reason: "Voice Draft"
        }
      });

      FeedbackEngine.approval();
      toast.info("Email drafted for review");
    }
    // [V5] WhatsApp Flow
    else if (intent.intent === 'whatsapp') {
      console.log("[Voice] WhatsApp Triggered");
      const recipient = intent.to || intent.target;
      const body = intent.message || intent.title || intent.content || "Hello"; // Fallback?

      await StorageAdapter.createPlan(userId, false, {
        source: 'voice',
        intent_type: 'whatsapp',
        status: 'waiting_approval',
        requires_approval: true,
        payload: {
          title: `WhatsApp to ${recipient || 'Unknown'}`,
          to: recipient || { unresolved: true },
          body: body,
          reason: "Voice Command"
        }
      });

      FeedbackEngine.approval();
      toast.info(t('whatsappDrafted') || "WhatsApp drafted");
    }
  };

  const toggleRecording = () => {
    if (voiceState === 'listening') stopRecording();
    else startRecording();
  };

  const getStatusText = () => {
    switch (voiceState) {
      case 'listening': return t('listening');
      case 'processing': return t('thinking');
      case 'success': return t('doneStatus');
      case 'error': return t('couldntHearYou');
      default: return t('tapToSpeak');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden bg-black text-white p-6">

      {/* Background Ambience */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${voiceState === 'listening' || voiceState === 'processing' ? 'opacity-100' : 'opacity-30'}`}>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] blur-[120px] rounded-full animate-pulse-slow ${voiceState === 'success' ? 'bg-green-500/10' : 'bg-volt/5'}`} />
      </div>

      {/* Main Interaction Zone */}
      <div className="relative z-10 flex flex-col items-center gap-12 max-w-sm w-full">

        {/* Status Text (Hidden if keyboard open) */}
        {!showKeyboard && (
          <div className="h-24 flex items-center justify-center text-center">
            <AnimatePresence mode="wait">
              <motion.h2
                key={voiceState}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`text-3xl font-bold font-space tracking-tight ${voiceState === 'listening' ? 'text-white' :
                  voiceState === 'processing' ? 'text-white/60 animate-pulse' :
                    voiceState === 'success' ? 'text-volt' :
                      voiceState === 'error' ? 'text-red-400' :
                        'text-white/40'
                  }`}
              >
                {getStatusText()}
              </motion.h2>
            </AnimatePresence>
          </div>
        )}

        {/* Mic Button / Interaction */}
        {!showKeyboard && (
          <div className="relative group">
            <button
              onClick={toggleRecording}
              disabled={voiceState === 'processing' || voiceState === 'success'}
              className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${voiceState === 'listening'
                ? 'bg-volt scale-110 shadow-[0_0_60px_rgba(217,253,0,0.4)]'
                : voiceState === 'processing'
                  ? 'bg-white/10 scale-95 animate-pulse'
                  : voiceState === 'success'
                    ? 'bg-volt/20 scale-100'
                    : 'bg-white/10 hover:bg-white/20 hover:scale-105'
                }`}
            >
              <span className={`material-symbols-outlined text-5xl transition-colors ${voiceState === 'listening' || voiceState === 'success' ? 'text-black' : 'text-white'
                }`}>
                {voiceState === 'listening' ? 'stop' : voiceState === 'success' ? 'check' : 'mic'}
              </span>
            </button>

            {/* Rings - Driven by RMS */}
            {voiceState === 'listening' && (
              <>
                <motion.div
                  animate={{ scale: 1 + rmsLevel * 5, opacity: 0.5 - rmsLevel }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="absolute inset-0 rounded-full border border-volt/30"
                />
                <motion.div
                  animate={{ scale: 1.1 + rmsLevel * 3 }}
                  className="absolute -inset-4 rounded-full border border-volt/10"
                />
              </>
            )}
          </div>
        )}

        {/* Transcript / Debug Preview */}
        {!showKeyboard && (
          <div className="w-full text-center space-y-4 min-h-[60px]">
            {/* Dev Debug Log - RMS */}
            {voiceState === 'listening' && (
              <div className="text-[10px] text-white/20 font-mono">
                Vol: {(rmsLevel * 100).toFixed(0)}%
              </div>
            )}
            {/* Dev Debug Log */}
            {debugInfo && (
              <pre className="text-[10px] text-left text-white/30 bg-white/5 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap max-h-32 font-mono">
                {debugInfo}
              </pre>
            )}
            {transcript && (
              <p className="text-xl font-medium text-white/90 leading-relaxed max-w-sm mx-auto">
                "{transcript}"
              </p>
            )}
            {voiceState === 'listening' && backupTranscriptRef.current && (
              <p className="text-sm text-white/40 italic">
                (Backup: {backupTranscriptRef.current})
              </p>
            )}
          </div>
        )}

        {/* Text Input Fallback */}
        <div className="w-full relative">
          <AnimatePresence>
            {showKeyboard ? (
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onSubmit={handleTextSubmit}
                className="w-full"
              >
                <div className="relative flex items-center bg-white/10 rounded-2xl border border-white/10 focus-within:border-volt/50 transition-colors overflow-hidden">
                  <input
                    ref={inputRef}
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={t('typeCommand')}
                    className="w-full bg-transparent text-white p-4 pr-12 outline-none font-space placeholder:text-white/20"
                  />
                  <button
                    type="submit"
                    disabled={!textInput.trim()}
                    className="absolute right-2 p-2 rounded-full hover:bg-white/10 text-volt disabled:opacity-30 disabled:text-white transition-all"
                  >
                    <span className="material-symbols-outlined">arrow_upward</span>
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center"
              >
                <button
                  onClick={() => setShowKeyboard(true)}
                  className="flex items-center gap-2 text-white/30 hover:text-white transition-colors text-sm font-medium py-2 px-4 rounded-full hover:bg-white/5"
                >
                  <span className="material-symbols-outlined text-lg">keyboard</span>
                  <span>{t('typeInstead')}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cancel / Overlay Close */}
        <button
          onClick={() => {
            if (showKeyboard) setShowKeyboard(false);
            else {
              cleanupAudio();
              router.back();
            }
          }}
          className="absolute bottom-12 text-sm text-white/40 hover:text-white uppercase tracking-widest font-mono"
        >
          {showKeyboard ? t('closeKeyboard') : t('cancel')}
        </button>

      </div>
    </div>
  );
}