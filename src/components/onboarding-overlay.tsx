'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { StorageAdapter } from '@/lib/storage-adapter';
import { useTranslation } from '@/hooks/use-translation';

export default function OnboardingOverlay() {
    const { localUser, userId } = useAuth();
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [isVisible, setIsVisible] = useState(false);
    const [isListening, setIsListening] = useState(false);

    useEffect(() => {
        // Only show if local user exists and hasn't completed onboarding
        if (localUser && !localUser.onboarding_completed) {
            setIsVisible(true);
        }
    }, [localUser]);

    const completeOnboarding = () => {
        if (localUser) {
            // Persist completion
            const updated = { ...localUser, onboarding_completed: true };
            localStorage.setItem('romna_local_user', JSON.stringify(updated));
            setIsVisible(false);
            window.location.reload();
        }
    };

    const handleVoiceSim = async () => {
        setIsListening(true);
        setTimeout(async () => {
            setIsListening(false);
            // Create a fake task for the "Quick Win"
            if (userId) {
                await StorageAdapter.createTask(userId, true, {
                    title: "Drink water",
                    description: "Created via Voice Quick Win",
                    status: "pending",
                    priority: "medium",
                    created_at: new Date().toISOString()
                });
            }
            setStep(3);
        }, 2000);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void text-white font-sans">
            <AnimatePresence mode="wait">

                {/* Screen 1: First Launch */}
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center gap-8 text-center p-6 max-w-md"
                    >
                        <h1 className="text-4xl font-bold font-space tracking-tight">{t('romnaIsReady')}</h1>

                        <div className="space-y-4">
                            <p className="text-white/60 text-lg leading-relaxed">{t('sayOneThing')}</p>
                            <div className="flex flex-col gap-2 text-white/30 text-sm font-mono">
                                <p>{t('example1')}</p>
                                <p>{t('example2')}</p>
                                <p>{t('example3')}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            className="mt-4 w-20 h-20 rounded-full bg-volt text-black flex items-center justify-center animate-pulse-slow hover:scale-105 transition-transform shadow-[0_0_30px_rgba(217,253,0,0.3)]"
                        >
                            <span className="material-symbols-outlined text-4xl">mic</span>
                        </button>
                        <p className="text-white/40 font-mono text-xs uppercase tracking-widest">{t('tapToSpeak')}</p>
                    </motion.div>
                )}

                {/* Screen 2: Voice Quick Win */}
                {step === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-6 text-center p-6"
                    >
                        <button
                            onClick={handleVoiceSim}
                            className={`w-32 h-32 rounded-full border-2 border-volt flex items-center justify-center transition-all duration-500 ${isListening ? 'bg-volt/20 scale-110' : 'bg-transparent'}`}
                        >
                            <span className={`material-symbols-outlined text-5xl ${isListening ? 'text-volt animate-pulse' : 'text-white'}`}>
                                {isListening ? 'graphic_eq' : 'mic'}
                            </span>
                        </button>

                        <div className="h-12 min-w-[200px]">
                            {isListening ? (
                                <p className="text-volt font-space text-lg animate-pulse">{t('imListening')}</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <p className="text-white/60 text-lg">{t('tapToSpeak')}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Screen 3: Local Trust (Kept as transition) */}
                {step === 3 && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col items-center gap-6 text-center max-w-xs p-6"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-volt">lock</span>
                        </div>
                        <h2 className="text-2xl font-bold font-space">{t('localUser')}</h2>
                        <p className="text-white/60 leading-relaxed">
                            {t('noAccountYet')}
                        </p>
                        <button
                            onClick={() => setStep(4)}
                            className="mt-8 px-8 py-4 rounded-xl bg-white text-black font-bold font-space uppercase tracking-widest hover:bg-gray-200"
                        >
                            Continue
                        </button>
                    </motion.div>
                )}

                {/* Screen 4: Sync / Upgrade Prompt */}
                {step === 4 && (
                    <motion.div
                        key="step4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-4 text-center max-w-xs p-6"
                    >
                        <h2 className="text-xl font-bold font-space mb-2 leading-snug">{t('wantToKeepData')}</h2>

                        <button
                            onClick={() => setStep(5)}
                            className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold font-space hover:bg-white/10 text-sm"
                        >
                            {t('continueWithoutAccount')}
                        </button>

                        <div className="w-full h-px bg-white/10 my-2"></div>

                        <button
                            className="w-full py-4 rounded-xl bg-volt text-black font-bold font-space flex items-center justify-center gap-3 opacity-50 cursor-not-allowed text-sm"
                            disabled
                        >
                            <span className="material-symbols-outlined">cloud_sync</span>
                            {t('syncAndBackup')}
                        </button>
                    </motion.div>
                )}

                {/* Screen 5: Final / Entry */}
                {step === 5 && (
                    <motion.div
                        key="step5"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="flex flex-col items-center gap-8 text-center max-w-sm p-6"
                    >
                        <h1 className="text-3xl font-bold font-space leading-tight">
                            {t('philosophy')}
                        </h1>
                        <button
                            onClick={completeOnboarding}
                            className="px-10 py-5 rounded-full bg-volt text-black font-bold text-lg font-space tracking-widest uppercase hover:scale-105 transition-transform shadow-[0_0_40px_rgba(217,253,0,0.3)]"
                        >
                            {t('romnaIsReady')}
                        </button>
                    </motion.div>
                )}

            </ AnimatePresence>
        </div>
    );
}
