'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Mic, CheckSquare, CalendarDays, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { SmartTaskVisual } from './smart-task-visual';

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
    visual: <SmartTaskVisual />,
    gradient: 'from-accent via-teal to-success',
    bgGradient: 'from-accent/10 via-teal/5 to-transparent',
    titleEn: 'Smart Task Creation',
    titleAr: 'إنشاء المهام الذكية',
    subtitleEn: 'Turn thoughts into plans.',
    subtitleAr: 'حول أفكارك إلى خطط.',
    descEn: 'Whether you type or talk, ROMANA detects dates and times automatically.',
    descAr: 'سواء كتبت أو تحدثت، تكتشف رومنا التواريخ والأوقات تلقائياً.',
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
  const { locale } = useAppStore();
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();

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
      "min-h-screen flex flex-col overflow-hidden bg-background",
      // Only apply gradient background if no custom visual, or make it subtle
      !screen.visual && `bg-gradient-to-br ${screen.bgGradient}`
    )}>
      {/* Top Navigation & Progress */}
      <header className="flex items-center justify-between px-6 pt-6 pb-2 z-10">
        <div className="flex flex-1 gap-2 mr-8 rtl:mr-0 rtl:ml-8">
          {onboardingScreens.map((_, index) => (
             <div 
               key={index}
               className={cn(
                 "h-1.5 flex-1 rounded-full transition-all duration-300",
                 index <= currentScreen 
                   ? "bg-primary shadow-[0_0_10px_rgba(48,232,122,0.3)]" 
                   : "bg-muted/50 dark:bg-white/10"
               )}
             />
          ))}
        </div>
        <button
          onClick={handleSkip}
          disabled={isCompleting}
          className="group flex items-center"
        >
          <p className="text-muted-foreground text-sm font-semibold tracking-wide transition-colors group-hover:text-primary">
            {locale === 'ar' ? 'تخطي' : 'Skip'}
          </p>
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-0">
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
            className="w-full max-w-md mx-auto text-center cursor-grab active:cursor-grabbing flex flex-col items-center"
          >
            {screen.visual ? (
              <div className="mb-6 w-full">
                {screen.visual}
              </div>
            ) : (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className={cn(
                  "w-32 h-32 mx-auto mb-12 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(48,232,122,0.1)]",
                  `bg-gradient-to-br ${screen.gradient}`
                )}
              >
                <screen.icon className="w-16 h-16 text-white" strokeWidth={1.5} />
              </motion.div>
            )}

            <div className="text-center mb-8 px-4">
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="text-primary text-sm font-bold uppercase tracking-wider mb-3"
              >
                {locale === 'ar' ? screen.titleAr : screen.titleEn}
              </motion.p>
              
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold leading-tight mb-4 tracking-tight"
              >
                 {locale === 'ar' ? screen.subtitleAr : screen.subtitleEn}
              </motion.h1>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-muted-foreground text-base leading-relaxed max-w-[320px] mx-auto"
              >
                {locale === 'ar' ? screen.descAr : screen.descEn}
              </motion.p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-6 pb-8 pt-4 w-full max-w-md mx-auto safe-area-bottom">
        {isLastScreen ? (
          <Button
            size="lg"
            onClick={handleComplete}
            disabled={isCompleting}
            className="w-full h-16 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(48,232,122,0.3)] bg-primary hover:bg-primary/90 text-primary-foreground group"
          >
            {isCompleting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <span>{locale === 'ar' ? 'ابدأ الآن' : 'Get Started'}</span>
                <ArrowRight className={cn("w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform", isRTL && "rotate-180 mr-2 ml-0 group-hover:-translate-x-1")} />
              </>
            )}
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleNext}
            className="w-full h-16 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(48,232,122,0.3)] bg-primary hover:bg-primary/90 text-primary-foreground group"
          >
            <span>{locale === 'ar' ? 'التالي' : 'Next'}</span>
            <ArrowRight className={cn("w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform", isRTL && "rotate-180 mr-2 ml-0 group-hover:-translate-x-1")} />
          </Button>
        )}
      </div>
    </div>
  );
}