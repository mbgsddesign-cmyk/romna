'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Mic, CheckSquare, CalendarDays, Sparkles, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const onboardingScreens = [
  {
    id: 'voice',
    icon: Mic,
    gradient: 'from-primary via-accent to-teal',
    bgGradient: 'from-primary/10 via-accent/5 to-transparent',
    titleEn: 'Voice Commands',
    titleAr: 'الأوامر الصوتية',
    subtitleEn: 'Speak naturally.',
    subtitleAr: 'تحدث بشكل طبيعي.',
    descEn: 'ROMNA converts your voice into tasks, events, and emails automatically.',
    descAr: 'رومنا يحول صوتك إلى مهام وأحداث ورسائل بريد تلقائياً.',
  },
  {
    id: 'tasks',
    icon: CheckSquare,
    gradient: 'from-accent via-teal to-success',
    bgGradient: 'from-accent/10 via-teal/5 to-transparent',
    titleEn: 'Smart Tasks',
    titleAr: 'المهام الذكية',
    subtitleEn: 'Never forget anything.',
    subtitleAr: 'لا تنسَ أي شيء.',
    descEn: 'Add tasks instantly using voice or text.',
    descAr: 'أضف المهام فوراً باستخدام الصوت أو النص.',
  },
  {
    id: 'calendar',
    icon: CalendarDays,
    gradient: 'from-teal via-success to-primary',
    bgGradient: 'from-teal/10 via-success/5 to-transparent',
    titleEn: 'Calendar Intelligence',
    titleAr: 'ذكاء التقويم',
    subtitleEn: 'Your schedule, optimized.',
    subtitleAr: 'جدولك، محسّن.',
    descEn: 'ROMNA understands dates and creates events automatically.',
    descAr: 'رومنا يفهم التواريخ وينشئ الأحداث تلقائياً.',
  },
  {
    id: 'ai',
    icon: Sparkles,
    gradient: 'from-success via-primary to-accent',
    bgGradient: 'from-success/10 via-primary/5 to-transparent',
    titleEn: 'AI Assistant',
    titleAr: 'المساعد الذكي',
    subtitleEn: 'Ask anything.',
    subtitleAr: 'اسأل أي شيء.',
    descEn: 'ROMNA analyzes your intent and acts on your behalf.',
    descAr: 'رومنا يحلل نيتك ويتصرف نيابةً عنك.',
  },
];

export default function OnboardingPage() {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const { locale, setLocale } = useAppStore();
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const isRTL = locale === 'ar';
  const isLastScreen = currentScreen === onboardingScreens.length - 1;

  useEffect(() => {
    if (profile?.onboarding_completed) {
      router.replace('/');
    }
  }, [profile, router]);

  const goToScreen = useCallback((index: number) => {
    if (index >= 0 && index < onboardingScreens.length) {
      setDirection(index > currentScreen ? 1 : -1);
      setCurrentScreen(index);
    }
  }, [currentScreen]);

  const handleNext = useCallback(() => {
    if (currentScreen < onboardingScreens.length - 1) {
      goToScreen(currentScreen + 1);
    }
  }, [currentScreen, goToScreen]);

  const handlePrev = useCallback(() => {
    if (currentScreen > 0) {
      goToScreen(currentScreen - 1);
    }
  }, [currentScreen, goToScreen]);

  const completeOnboarding = async () => {
    setIsCompleting(true);
    
    localStorage.setItem('romna_onboarding_completed', 'true');
    
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
      
      await refreshProfile();
      router.replace('/');
    } else {
      router.push('/auth/login');
    }
    
    setIsCompleting(false);
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const handleComplete = () => {
    completeOnboarding();
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    const velocity = 0.5;
    
    if (info.offset.x < -threshold || info.velocity.x < -velocity) {
      if (isRTL) {
        handlePrev();
      } else {
        handleNext();
      }
    } else if (info.offset.x > threshold || info.velocity.x > velocity) {
      if (isRTL) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const screen = onboardingScreens[currentScreen];

  return (
    <div className={cn(
      "min-h-screen flex flex-col overflow-hidden",
      `bg-gradient-to-br ${screen.bgGradient}`
    )}>
      <header className="flex items-center justify-between px-5 pt-6 pb-2">
        <button
          onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
          className="px-3 py-1.5 rounded-full bg-muted/50 text-sm font-medium hover:bg-muted transition-colors"
        >
          {locale === 'ar' ? 'EN' : 'عربي'}
        </button>
        <button
          onClick={handleSkip}
          disabled={isCompleting}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {locale === 'ar' ? 'تخطي' : 'Skip'}
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={screen.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="w-full max-w-sm text-center cursor-grab active:cursor-grabbing"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className={cn(
                "w-28 h-28 mx-auto mb-8 rounded-3xl flex items-center justify-center shadow-2xl",
                `bg-gradient-to-br ${screen.gradient}`
              )}
            >
              <screen.icon className="w-14 h-14 text-white" strokeWidth={1.5} />
            </motion.div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-2xl font-extrabold mb-3"
            >
              {locale === 'ar' ? screen.titleAr : screen.titleEn}
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={cn(
                "text-xl font-bold mb-4 bg-clip-text text-transparent",
                `bg-gradient-to-r ${screen.gradient}`
              )}
            >
              {locale === 'ar' ? screen.subtitleAr : screen.subtitleEn}
            </motion.p>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-muted-foreground text-base leading-relaxed"
            >
              {locale === 'ar' ? screen.descAr : screen.descEn}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-2 py-6">
        {onboardingScreens.map((_, index) => (
          <button
            key={index}
            onClick={() => goToScreen(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === currentScreen
                ? "w-8 bg-accent"
                : "w-2 bg-muted hover:bg-muted-foreground/30"
            )}
          />
        ))}
      </div>

      <div className="px-5 pb-8 safe-area-bottom">
        <div className="flex gap-3">
          {currentScreen > 0 && (
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrev}
              className="flex-1 h-14 rounded-2xl border-2"
              disabled={isCompleting}
            >
              <ChevronLeft className={cn("w-5 h-5", isRTL && "rotate-180")} />
              <span>{locale === 'ar' ? 'السابق' : 'Back'}</span>
            </Button>
          )}
          
          {isLastScreen ? (
            <Button
              size="lg"
              onClick={handleComplete}
              disabled={isCompleting}
              className={cn(
                "flex-1 h-14 rounded-2xl font-semibold text-base",
                `bg-gradient-to-r ${screen.gradient}`
              )}
            >
              {isCompleting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{locale === 'ar' ? 'ابدأ الآن' : 'Get Started'}</span>
                  <ChevronRight className={cn("w-5 h-5", isRTL && "rotate-180")} />
                </>
              )}
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleNext}
              className={cn(
                "flex-1 h-14 rounded-2xl font-semibold text-base",
                `bg-gradient-to-r ${screen.gradient}`
              )}
            >
              <span>{locale === 'ar' ? 'التالي' : 'Continue'}</span>
              <ChevronRight className={cn("w-5 h-5", isRTL && "rotate-180")} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}