'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Loader2, User, Check, X, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { RomnaInput } from '@/components/romna';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

type PasswordStrength = 'weak' | 'medium' | 'strong';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const { signUp, user, profile } = useAuth();
  const router = useRouter();
  const { t, locale } = useTranslation();

  useEffect(() => {
    if (user && profile) {
      if (!profile.onboarding_completed) {
        router.replace('/onboarding');
      } else {
        router.replace('/');
      }
    }
  }, [user, profile, router]);

  const passwordStrength = useMemo((): PasswordStrength => {
    if (password.length < 6) return 'weak';
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const score = [hasUpper, hasLower, hasNumber, hasSpecial, password.length >= 8].filter(Boolean).length;
    if (score >= 4) return 'strong';
    if (score >= 2) return 'medium';
    return 'weak';
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      toast.error(t('nameRequired'));
      return;
    }
    if (!email) {
      toast.error(t('emailRequired'));
      return;
    }
    if (password.length < 6) {
      toast.error(t('passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t('passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('accountCreated'));
      router.push('/onboarding');
    }
  };

  const handleGoogleSignup = async () => {
    setOauthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(t('googleSignupFailed'));
      setOauthLoading(false);
    }
  };

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsDontMatch = confirmPassword.length > 0 && password !== confirmPassword;

  const strengthConfig = {
    weak: {
      color: 'bg-destructive',
      textColor: 'text-destructive',
      percent: 33,
      label: t('weak'),
    },
    medium: {
      color: 'bg-warning',
      textColor: 'text-warning',
      percent: 66,
      label: t('mediumStrength'),
    },
    strong: {
      color: 'bg-success',
      textColor: 'text-success',
      percent: 100,
      label: t('strong'),
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5 overflow-x-hidden">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 mobile-container">
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
            <p className="text-[15px] font-medium bg-gradient-to-r from-accent to-teal bg-clip-text text-transparent mt-1">
              {t('tagline')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="auth-card space-y-5"
          >
            <div className="text-center">
              <h2 className="text-[22px] font-bold">{t('signup')}</h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                {t('signupSubtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <RomnaInput
                icon={User}
                type="text"
                placeholder={t('name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />

              <div className="space-y-1.5">
                <RomnaInput
                  icon={Mail}
                  type="email"
                  placeholder={t('email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <p className="text-[11px] text-muted-foreground px-1">
                  {t('emailSecurityNote')}
                </p>
              </div>

              <div className="space-y-2">
                <RomnaInput
                  icon={Lock}
                  placeholder={t('password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  showPasswordToggle
                  autoComplete="new-password"
                />

                {password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 px-1"
                  >
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${strengthConfig[passwordStrength].percent}%` }}
                        transition={{ duration: 0.3 }}
                        className={cn("h-full rounded-full", strengthConfig[passwordStrength].color)}
                      />
                    </div>
                    <span className={cn("text-[12px] font-semibold min-w-[60px]", strengthConfig[passwordStrength].textColor)}>
                      {strengthConfig[passwordStrength].label}
                    </span>
                  </motion.div>
                )}
              </div>

              <div className="relative">
                <RomnaInput
                  icon={Shield}
                  placeholder={t('confirmPassword')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  showPasswordToggle={!passwordsMatch && !passwordsDontMatch}
                  success={passwordsMatch}
                  error={passwordsDontMatch ? t('passwordsDoNotMatch') : undefined}
                  autoComplete="new-password"
                />
                {passwordsMatch && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-3 rtl:right-auto rtl:left-3 top-[50%] -translate-y-[50%] text-success"
                  >
                    <Check className="w-5 h-5" />
                  </motion.div>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 text-[16px] font-semibold auth-gradient-btn" 
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('signup')}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-[12px] uppercase">
                <span className="bg-card px-3 text-muted-foreground font-medium">
                  {t('or')}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-14 gap-3 rounded-[var(--radius-button)] border-2 hover:bg-muted/30 transition-colors font-medium"
              onClick={handleGoogleSignup}
              disabled={oauthLoading}
            >
              {oauthLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span>{t('signupWithGoogle')}</span>
            </Button>

            <p className="text-center text-[14px] text-muted-foreground">
              {t('alreadyHaveAccount')}{' '}
              <Link href="/auth/login" className="text-accent hover:underline font-semibold">
                {t('login')}
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>

      <div className="pb-6 pt-2 px-5 text-center safe-area-bottom">
        <p className="text-[11px] text-muted-foreground">
          {t('termsSignup')}
        </p>
      </div>
    </div>
  );
}