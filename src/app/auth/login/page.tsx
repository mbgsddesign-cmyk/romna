'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Loader2, X, CheckCircle, Mic, CalendarDays, CheckSquare, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { RomnaInput } from '@/components/romna';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const { signIn, resetPassword, user, profile } = useAuth();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error(t('emailRequired'));
      return;
    }
    if (password.length < 6) {
      toast.error(t('passwordTooShort'));
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast.error(t('invalidCredentials'));
    }
  };

  const handleGoogleLogin = async () => {
    setOauthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(locale === 'ar' ? 'فشل تسجيل الدخول بجوجل' : 'Google login failed');
      setOauthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error(t('emailRequired'));
      return;
    }

    setForgotLoading(true);
    const { error } = await resetPassword(forgotEmail);
    setForgotLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setForgotSent(true);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotEmail('');
    setForgotSent(false);
  };

  const tutorialSteps = [
    {
      icon: Mic,
      color: 'from-primary to-accent',
      titleEn: 'Tap microphone',
      titleAr: 'اضغط على الميكروفون',
      descEn: 'Start recording your voice command',
      descAr: 'ابدأ بتسجيل أمرك الصوتي',
    },
    {
      icon: Sparkles,
      color: 'from-accent to-teal',
      titleEn: 'Speak naturally',
      titleAr: 'تحدث بشكل طبيعي',
      descEn: '"Schedule meeting tomorrow"',
      descAr: '"جدول اجتماع غداً"',
    },
    {
      icon: CheckSquare,
      color: 'from-teal to-success',
      titleEn: 'ROMNA creates it',
      titleAr: 'رومنا ينشئ تلقائياً',
      descEn: 'Tasks created automatically',
      descAr: 'المهام تنشأ تلقائياً',
    },
    {
      icon: CalendarDays,
      color: 'from-success to-primary',
      titleEn: 'Review anytime',
      titleAr: 'راجع في أي وقت',
      descEn: 'Find in Tasks or Calendar',
      descAr: 'اعثر عليه في المهام',
    },
  ];

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
              {locale === 'ar' ? 'مساعدك الذكي للإنتاجية' : 'Your AI Productivity Assistant'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="auth-card space-y-6"
          >
            <div className="text-center">
              <h2 className="text-[22px] font-bold">{t('login')}</h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                {locale === 'ar' 
                  ? 'سجل الدخول لمتابعة تجربة مساعدك الشخصي' 
                  : 'Sign in to continue your AI assistant experience'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <RomnaInput
                icon={Mail}
                type="email"
                placeholder={t('email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />

              <RomnaInput
                icon={Lock}
                placeholder={t('password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showPasswordToggle
                autoComplete="current-password"
              />

              <div className="text-right rtl:text-left">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[13px] text-accent hover:underline font-semibold"
                >
                  {t('forgotPassword')}
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 text-[16px] font-semibold auth-gradient-btn" 
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('login')}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-[12px] uppercase">
                <span className="bg-card px-3 text-muted-foreground font-medium">
                  {locale === 'ar' ? 'أو' : 'or'}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-14 gap-3 rounded-[var(--radius-button)] border-2 hover:bg-muted/30 transition-colors font-medium"
              onClick={handleGoogleLogin}
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
              <span>{locale === 'ar' ? 'المتابعة بحساب جوجل' : 'Continue with Google'}</span>
            </Button>

            <p className="text-center text-[14px] text-muted-foreground">
              {t('dontHaveAccount')}{' '}
              <Link href="/auth/signup" className="text-accent hover:underline font-semibold">
                {t('signup')}
              </Link>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6"
          >
            <button
              onClick={() => setShowTutorial(!showTutorial)}
              className="w-full flex items-center justify-center gap-2 py-3 text-[14px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="font-medium">
                {locale === 'ar' ? 'كيف تستخدم رومنا؟' : 'How to use ROMNA'}
              </span>
              {showTutorial ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showTutorial && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="bg-card/60 backdrop-blur-sm rounded-[20px] border border-border/30 p-4 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                      {tutorialSteps.map((step, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex flex-col items-center text-center p-3 rounded-[16px] bg-background/60"
                        >
                          <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center mb-2 bg-gradient-to-br ${step.color}`}>
                            <step.icon className="w-5 h-5 text-white" />
                          </div>
                          <p className="text-[12px] font-semibold">
                            {locale === 'ar' ? step.titleAr : step.titleEn}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                            {locale === 'ar' ? step.descAr : step.descEn}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>

      <div className="pb-6 pt-2 px-5 text-center safe-area-bottom">
        <p className="text-[11px] text-muted-foreground">
          {locale === 'ar' 
            ? 'بالمتابعة، أنت توافق على شروط رومنا وسياسة الخصوصية.'
            : "By continuing, you agree to ROMNA's Terms & Privacy Policy."}
        </p>
      </div>

      <AnimatePresence>
        {showForgotModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-5 bg-black/50 backdrop-blur-modal"
            onClick={closeForgotModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[380px] bg-card rounded-[28px] p-6 shadow-2xl border border-border/30"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[18px] font-bold">{t('forgotPassword')}</h3>
                <button
                  onClick={closeForgotModal}
                  className="p-2 rounded-[14px] hover:bg-muted/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {forgotSent ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="text-[18px] font-semibold mb-2">
                    {locale === 'ar' ? 'تم الإرسال!' : 'Email Sent!'}
                  </h4>
                  <p className="text-[14px] text-muted-foreground mb-4">
                    {locale === 'ar' 
                      ? 'تحقق من بريدك الإلكتروني لرابط إعادة التعيين'
                      : 'Check your email for the reset link'}
                  </p>
                  <p className="text-[12px] text-muted-foreground bg-muted/50 rounded-[12px] p-2">
                    {forgotEmail}
                  </p>
                  <Button onClick={closeForgotModal} className="mt-4 w-full rounded-[14px]">
                    {locale === 'ar' ? 'حسناً' : 'Got it'}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-[14px] text-muted-foreground">
                    {locale === 'ar'
                      ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور'
                      : 'Enter your email and we\'ll send you a password reset link'}
                  </p>
                  <RomnaInput
                    icon={Mail}
                    type="email"
                    placeholder={t('email')}
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-[14px]" 
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      t('sendResetLink')
                    )}
                  </Button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
