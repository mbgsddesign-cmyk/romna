'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { RomnaInput } from '@/components/romna';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset link - ready to update password
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || password.length < 6) {
      toast.error(t('passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      toast.error(updateError.message);
    } else {
      setSuccess(true);
      toast.success(t('passwordResetSuccess'));
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[380px]"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 mx-auto mb-5 rounded-[24px] bg-gradient-to-br from-primary to-accent flex items-center justify-center logo-glow animate-float">
            <span className="text-3xl font-bold text-white">R</span>
          </div>
          <h1 className="text-[32px] font-extrabold bg-gradient-to-r from-primary via-accent to-teal bg-clip-text text-transparent animate-gradient">
            {t('appName')}
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="auth-card space-y-6"
        >
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-[22px] font-bold mb-2">
                {t('passwordResetSuccess')}
              </h2>
              <p className="text-[14px] text-muted-foreground">
                {t('redirectingToLogin')}
              </p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-[22px] font-bold">{t('resetPassword')}</h2>
                <p className="text-[13px] text-muted-foreground mt-1">
                  {t('enterNewPassword')}
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-[14px] bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <RomnaInput
                  icon={Lock}
                  placeholder={t('newPassword')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  showPasswordToggle
                  autoComplete="new-password"
                />

                <RomnaInput
                  icon={Lock}
                  placeholder={t('confirmPassword')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  showPasswordToggle
                  autoComplete="new-password"
                />

                <Button 
                  type="submit" 
                  className="w-full h-14 text-[16px] font-semibold auth-gradient-btn" 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('resetPassword')}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
