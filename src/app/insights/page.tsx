'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Target, 
  Zap,
  Award,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductivityMetric {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface InsightPattern {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

const todayMetrics: ProductivityMetric[] = [
  { label: 'Productivity', value: '87%', change: '+12%', trend: 'up' },
  { label: 'Tasks Completed', value: '8/10', change: '+2', trend: 'up' },
  { label: 'Focus Time', value: '3.5h', change: '+0.5h', trend: 'up' }
];

const patterns: InsightPattern[] = [
  { 
    title: 'Best Time', 
    value: '10:00 AM - 12:00 PM', 
    icon: Clock, 
    color: 'text-accent' 
  },
  { 
    title: 'Distraction Risk', 
    value: '2:00 PM - 4:00 PM', 
    icon: AlertCircle, 
    color: 'text-warning' 
  },
  { 
    title: 'Consistency', 
    value: '6 days streak', 
    icon: Award, 
    color: 'text-success' 
  }
];

const weeklyData = [
  { day: 'Mon', value: 75 },
  { day: 'Tue', value: 82 },
  { day: 'Wed', value: 68 },
  { day: 'Thu', value: 91 },
  { day: 'Fri', value: 87 },
  { day: 'Sat', value: 45 },
  { day: 'Sun', value: 30 }
];

export default function InsightsPage() {
  const { t, locale } = useTranslation();

  return (
    <PageWrapper className="px-5">
      <div className="mobile-container">
        <header className="pt-8 pb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-[28px] font-extrabold">
              {locale === 'ar' ? 'الرؤى' : 'Insights'}
            </h1>
            <Badge variant="outline" className="border-accent/30 text-accent">
              PRO
            </Badge>
          </div>
          <p className="text-muted-foreground text-[14px]">
            {locale === 'ar' 
              ? 'افهم أنماط إنتاجيتك بالذكاء الاصطناعي' 
              : 'Understand your productivity patterns with AI'}
          </p>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="p-5 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-accent/20">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-[18px] font-bold mb-1">Today at a Glance</h2>
                <p className="text-[13px] text-muted-foreground">
                  Your most productive day this week!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {todayMetrics.map((metric, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card/80 backdrop-blur-sm rounded-[16px] p-3 text-center"
                >
                  <p className="text-[11px] text-muted-foreground mb-1">{metric.label}</p>
                  <p className="text-[20px] font-bold">{metric.value}</p>
                  {metric.change && (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <TrendingUp className={cn(
                        "w-3 h-3",
                        metric.trend === 'up' ? "text-success" : "text-error"
                      )} />
                      <span className={cn(
                        "text-[10px] font-semibold",
                        metric.trend === 'up' ? "text-success" : "text-error"
                      )}>
                        {metric.change}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        <section className="mb-6">
          <h3 className="text-[16px] font-bold mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            {locale === 'ar' ? 'الأنماط' : 'Patterns'}
          </h3>
          <div className="space-y-3">
            {patterns.map((pattern, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[12px] bg-muted/50 flex items-center justify-center">
                      <pattern.icon className={cn("w-5 h-5", pattern.color)} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] text-muted-foreground">{pattern.title}</p>
                      <p className="text-[14px] font-semibold">{pattern.value}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h3 className="text-[16px] font-bold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {locale === 'ar' ? 'الأسبوع الماضي' : 'Weekly Overview'}
          </h3>
          <Card className="p-5">
            <div className="flex items-end justify-between gap-2 h-32">
              {weeklyData.map((data, index) => {
                const maxValue = Math.max(...weeklyData.map(d => d.value));
                const heightPercent = (data.value / maxValue) * 100;
                
                return (
                  <motion.div
                    key={index}
                    className="flex-1 flex flex-col items-center gap-2"
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="relative w-full flex-1 flex items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        className={cn(
                          "w-full rounded-t-[8px] bg-gradient-to-t",
                          data.value >= 80
                            ? "from-accent to-accent/50"
                            : data.value >= 60
                            ? "from-primary to-primary/50"
                            : "from-muted to-muted/50"
                        )}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {data.day}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </section>

        <section className="pb-24">
          <Card className="p-5 bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
            <div className="flex items-start gap-3 mb-4">
              <Zap className="w-6 h-6 text-accent shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-[15px] font-bold mb-2">AI-Generated Insight</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
                  Based on your patterns, you tend to be 40% more productive in morning hours. 
                  Consider scheduling your most important tasks between 10 AM and 12 PM for 
                  optimal results.
                </p>
                <Button size="sm" variant="default" className="w-full">
                  Apply Recommendations
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </PageWrapper>
  );
}
