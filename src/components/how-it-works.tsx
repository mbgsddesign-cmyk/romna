'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

interface HowRomnaWorksProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function HowRomnaWorks({ open, onOpenChange }: HowRomnaWorksProps) {
    const steps = [
        {
            num: '1',
            title: 'Speak Naturally',
            desc: 'Just tell ROMNA what to do. "Remind me to call Mom at 5pm" or "Plan my day".',
            icon: 'mic'
        },
        {
            num: '2',
            title: 'Approve Actions',
            desc: 'ROMNA drafts the action. You review and approve it. You are always in control.',
            icon: 'check_circle'
        },
        {
            num: '3',
            title: 'Execute & Forget',
            desc: 'Once approved, ROMNA executes it—adds to calendar, sends email, or sets reminder.',
            icon: 'bolt'
        }
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-black/95 border-white/10 text-white max-w-md p-0 overflow-hidden rounded-[32px]">
                <div className="p-8 relative">
                    {/* Ambient Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-volt/5 blur-[100px] rounded-full pointer-events-none" />

                    <DialogHeader className="mb-8 relative z-10">
                        <DialogTitle className={`${spaceGrotesk.className} text-2xl font-bold tracking-tight text-center`}>
                            How ROMNA Works
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-8 relative z-10">
                        {steps.map((step, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex gap-5"
                            >
                                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-volt font-bold font-mono text-xl shadow-lg shadow-black/50">
                                    {step.num}
                                </div>
                                <div>
                                    <h3 className={`${spaceGrotesk.className} font-bold text-lg mb-1 flex items-center gap-2`}>
                                        {step.title}
                                    </h3>
                                    <p className="text-white/50 text-sm leading-relaxed">
                                        {step.desc}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <button
                        onClick={() => onOpenChange(false)}
                        className="w-full mt-10 py-4 rounded-xl bg-volt text-black font-bold font-mono tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Got it
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
