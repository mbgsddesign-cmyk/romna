'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  triggerLocation?: string;
}

export function PaywallModal({ isOpen, onClose, featureName = "Pro Feature", triggerLocation }: PaywallModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Track view
      const trackView = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_activity').insert({
            user_id: user.id,
            action: 'paywall_viewed',
            meta: { feature: featureName, location: triggerLocation }
          });
        }
      };
      trackView();
    }
  }, [isOpen, featureName, triggerLocation]);

  const handleUpgrade = async () => {
    setLoading(true);
    // Track click
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_activity').insert({
        user_id: user.id,
        action: 'upgrade_clicked',
        meta: { feature: featureName, location: triggerLocation }
      });
    }

    // In a real app, this would redirect to Stripe Checkout or Billing page
    router.push('/settings/billing?upgrade=pro');
    setLoading(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#1A2C22] border border-[#30e87a]/20 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header / Hero */}
            <div className="relative h-32 bg-gradient-to-br from-[#052e16] to-[#1A2C22] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#30e87a] opacity-10 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#30e87a]/20 flex items-center justify-center mb-3 backdrop-blur-md border border-[#30e87a]/30">
                        <Lock className="w-6 h-6 text-[#30e87a]" />
                    </div>
                    <h3 className="text-white font-bold text-lg tracking-tight">Unlock {featureName}</h3>
                </div>

                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                <div className="space-y-3">
                    <p className="text-[#9db8a8] text-center text-sm leading-relaxed">
                        Upgrade to Pro to access advanced AI insights, unlimited actions, and deeper integrations.
                    </p>
                </div>

                <div className="space-y-3">
                    <FeatureItem text="Unlimited AI Context & Memory" />
                    <FeatureItem text="Advanced Conflict Resolution" />
                    <FeatureItem text="Priority Notification Delivery" />
                    <FeatureItem text="Voice & Calendar Integrations" />
                </div>

                <div className="pt-2">
                    <Button 
                        onClick={handleUpgrade}
                        disabled={loading}
                        className="w-full h-12 bg-[#30e87a] hover:bg-[#2bd46d] text-[#052e16] font-bold rounded-xl text-base shadow-[0_0_20px_-5px_rgba(48,232,122,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading ? 'Processing...' : 'Upgrade to Pro - $19/mo'}
                    </Button>
                    <p className="text-center text-xs text-[#9db8a8] mt-3">
                        Cancel anytime. No questions asked.
                    </p>
                </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function FeatureItem({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#30e87a]/10 flex items-center justify-center">
                <Check className="w-3 h-3 text-[#30e87a]" />
            </div>
            <span className="text-sm text-white/90 font-medium">{text}</span>
        </div>
    )
}