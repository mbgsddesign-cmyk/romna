'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { 
  ArrowLeft, 
  Calendar, 
  Sparkles, 
  Plus, 
  Bell, 
  Zap, 
  Briefcase, 
  AlertTriangle, 
  Mic,
  Trophy,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

interface Insight {
  description?: string;
  [key: string]: unknown;
}

export default function InsightsPage() {
  const { locale } = useTranslation();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    loadingTimeoutRef.current = setTimeout(() => {
      if (isMounted) {
        console.warn('Insights loading timeout - showing UI anyway');
        setLoading(false);
      }
    }, 8000);

    const fetchInsights = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch('/api/insights/today', {
          signal: controller.signal,
          cache: 'no-store',
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          console.warn('Insights API returned non-OK status');
          if (isMounted) setInsights([]);
          return;
        }
        
        const data = await res.json();
        if (isMounted) {
          if (data.success && data.insights) {
            setInsights(data.insights);
          } else {
            setInsights([]);
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('Insights request timed out');
        } else {
          console.error('Failed to fetch insights:', error);
        }
        if (isMounted) setInsights([]);
      } finally {
        if (isMounted) setLoading(false);
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      }
    };

    fetchInsights();

    return () => {
      isMounted = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const latestInsight = insights[0];
  const productivityScore = 66; // TODO: Calculate from real data
  const tasksCompleted = 6;
  const tasksTotal = 9;
  const focusTime = "1h 40m";

  if (loading) {
    return (
      <PageWrapper className="px-5">
        <div className="pt-8">
          <Skeleton className="h-10 w-40 mb-2" />
          <Skeleton className="h-4 w-full mb-8" />
          <Skeleton className="h-48 w-full mb-6" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-background/95 px-4 py-4 backdrop-blur-md">
        <button 
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full bg-card border border-border transition active:scale-95 text-foreground hover:bg-accent/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Insights</h1>
        <button className="size-10 overflow-hidden rounded-full border border-border">
          {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              alt="Profile" 
              className="h-full w-full object-cover" 
              src={profile?.avatar_url || user?.user_metadata?.avatar_url} 
            />
          ) : (
            <div className="h-full w-full bg-accent/20 flex items-center justify-center text-accent font-bold">
              {profile?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
          )}
        </button>
      </header>

      {/* Subheader */}
      <div className="px-4 pb-6 pt-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {locale === 'ar' ? 'ملخص إنتاجيتك' : 'Your productivity,'}<br/>
          {locale === 'ar' ? 'اليوم والأسبوع' : 'summarized.'}
        </h2>
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-6 px-4">
        {/* Daily Summary Card */}
        <div className="group relative overflow-hidden rounded-3xl bg-card p-1 shadow-lg transition-transform active:scale-[0.99] border border-border/50">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:from-white/5"></div>
          <div className="flex flex-col gap-5 rounded-[20px] bg-background/50 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Today at a glance</h3>
              <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-accent">
                {new Date().toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Circular Progress Ring */}
              <div className="relative size-24 shrink-0">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <path 
                    className="text-muted/20" 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3"
                  />
                  {/* Progress Circle */}
                  <path 
                    className="text-accent drop-shadow-[0_0_4px_rgba(48,232,122,0.4)] transition-all duration-1000 ease-out"
                    strokeDasharray={`${productivityScore}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeLinecap="round" 
                    strokeWidth="3"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold text-foreground">{productivityScore}%</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-accent"></span>
                  <p className="text-sm text-muted-foreground">Tasks: <span className="font-semibold text-foreground">{tasksCompleted} / {tasksTotal}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-purple-400"></span>
                  <p className="text-sm text-muted-foreground">Focus: <span className="font-semibold text-foreground">{focusTime}</span></p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-muted/30 p-3">
              <Calendar className="mt-0.5 text-lg text-accent w-5 h-5" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-accent uppercase tracking-wider">Upcoming</span>
                <span className="text-sm font-medium text-foreground">Team standup at 9:30</span>
              </div>
            </div>

            <button className="mt-1 flex w-full items-center justify-center rounded-full bg-accent py-3.5 text-sm font-bold text-accent-foreground shadow-[0_0_15px_rgba(48,232,122,0.3)] transition-colors hover:bg-accent/90">
              Plan the rest of today
            </button>
          </div>
        </div>

        {/* AI Insight Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card to-background border border-border p-5 shadow-lg">
          <div className="absolute -right-4 -top-4 size-24 bg-accent/10 blur-2xl rounded-full"></div>
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="text-accent w-5 h-5 fill-accent" />
              <h3 className="font-bold text-foreground">AI Insight</h3>
            </div>
            <p className="text-base font-medium leading-relaxed text-muted-foreground">
              {latestInsight?.description || "Your morning is light — schedule 45 minutes of deep focus before noon."}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="flex items-center gap-1.5 rounded-full bg-muted/50 px-4 py-2 text-xs font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-muted">
                <Plus className="w-3.5 h-3.5" />
                Add Focus Block
              </button>
              <button className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/30">
                <Bell className="w-3.5 h-3.5" />
                Remind Me Later
              </button>
            </div>
          </div>
        </div>

        {/* Weekly Overview */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-bold text-foreground">This week</h3>
            <button className="text-sm font-medium text-accent">View all</button>
          </div>
          
          {/* Days Scroll */}
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {[
              { day: 'Mon', val: 0.75, active: false },
              { day: 'Tue', val: 1.0, active: true },
              { day: 'Wed', val: 0.5, active: false },
              { day: 'Thu', val: 0.65, active: false, today: true },
              { day: 'Fri', val: 0, active: false },
              { day: 'Sat', val: 0, active: false },
              { day: 'Sun', val: 0, active: false },
            ].map((d, i) => (
              <div 
                key={i}
                className={cn(
                  "flex min-w-[56px] flex-col items-center justify-center gap-2 rounded-[2rem] py-4 transition-all",
                  d.today ? "bg-foreground scale-105 shadow-lg" : "bg-card",
                  d.active && !d.today && "border border-accent/20 relative overflow-hidden",
                  !d.active && !d.today && "opacity-80"
                )}
              >
                {d.active && !d.today && (
                  <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-accent/10 to-transparent"></div>
                )}
                <span className={cn(
                  "text-xs font-medium",
                  d.today ? "text-background font-bold" : d.active ? "text-accent font-bold" : "text-muted-foreground"
                )}>{d.day}</span>
                <div className={cn(
                  "flex h-12 w-1.5 flex-col justify-end rounded-full",
                  d.today ? "bg-background/20" : "bg-muted"
                )}>
                  <div 
                    className={cn(
                      "w-full rounded-full",
                      d.today ? "bg-background" : d.active ? "bg-accent shadow-[0_0_8px_rgba(48,232,122,0.6)]" : "bg-muted-foreground/50"
                    )}
                    style={{ height: `${d.val * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 px-1">
            <div className="flex flex-1 items-center gap-2 rounded-2xl bg-card p-3 border border-border/50">
              <Trophy className="text-accent w-5 h-5" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Best Day</span>
                <span className="text-sm font-bold text-foreground">Tuesday</span>
              </div>
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-2xl bg-card p-3 border border-border/50">
              <TrendingUp className="text-accent w-5 h-5" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Consistency</span>
                <span className="text-sm font-bold text-foreground">78%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Patterns List */}
        <div className="flex flex-col gap-3 pt-4 pb-20">
          <h3 className="px-1 text-lg font-bold text-foreground">Patterns</h3>
          <div className="flex flex-col gap-2">
            {[
              { icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Most productive time", value: "9–11 AM" },
              { icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10", label: "Top category", value: "Work" },
              { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", label: "Distraction risk", value: "High after 6 PM" },
            ].map((item, i) => (
              <button key={i} className="flex items-center justify-between rounded-2xl bg-card p-4 transition-colors hover:bg-muted/50 active:bg-muted">
                <div className="flex items-center gap-4">
                  <div className={cn("flex size-10 items-center justify-center rounded-full", item.bg, item.color)}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-muted-foreground">{item.label}</span>
                </div>
                <span className="font-bold text-foreground">{item.value}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2">
        <button className="group flex items-center gap-3 rounded-full bg-card/80 px-6 py-3 pl-5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all active:scale-95 hover:bg-card">
          <div className="relative flex size-10 items-center justify-center rounded-full bg-accent shadow-[0_0_15px_rgba(48,232,122,0.5)]">
            <Mic className="text-accent-foreground w-5 h-5 animate-pulse" />
          </div>
          <span className="font-bold text-foreground pr-2">Ask ROMANA</span>
        </button>
      </div>
    </div>
  );
}