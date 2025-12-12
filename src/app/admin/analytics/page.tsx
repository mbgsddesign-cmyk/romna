'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Activity, Plug, Mic, MessageSquare, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { format, subDays } from 'date-fns';

interface AnalyticsData {
  dailyActiveUsers: { date: string; count: number }[];
  weeklyAiUsage: { date: string; tokens: number }[];
  intentBreakdown: { type: string; count: number }[];
  integrationPopularity: { type: string; count: number }[];
}

export default function AdminAnalyticsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<AnalyticsData>({
    dailyActiveUsers: [],
    weeklyAiUsage: [],
    intentBreakdown: [],
    integrationPopularity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return format(date, 'MMM d');
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('last_active_at')
        .not('last_active_at', 'is', null);

      const dauMap = new Map<string, number>();
      last7Days.forEach(d => dauMap.set(d, 0));
      profiles?.forEach(p => {
        if (p.last_active_at) {
          const date = format(new Date(p.last_active_at), 'MMM d');
          if (dauMap.has(date)) {
            dauMap.set(date, (dauMap.get(date) || 0) + 1);
          }
        }
      });
      const dailyActiveUsers = last7Days.map(date => ({ date, count: dauMap.get(date) || 0 }));

      const { data: usageData } = await supabase
        .from('ai_usage')
        .select('tokens_used, created_at')
        .gte('created_at', subDays(new Date(), 7).toISOString());

      const usageMap = new Map<string, number>();
      last7Days.forEach(d => usageMap.set(d, 0));
      usageData?.forEach(u => {
        const date = format(new Date(u.created_at), 'MMM d');
        if (usageMap.has(date)) {
          usageMap.set(date, (usageMap.get(date) || 0) + (u.tokens_used || 0));
        }
      });
      const weeklyAiUsage = last7Days.map(date => ({ date, tokens: usageMap.get(date) || 0 }));

      const { data: intents } = await supabase
        .from('voice_intents')
        .select('intent_type');

      const intentMap = new Map<string, number>();
      intents?.forEach(i => {
        intentMap.set(i.intent_type, (intentMap.get(i.intent_type) || 0) + 1);
      });
      const intentBreakdown = Array.from(intentMap.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      const { data: integrations } = await supabase
        .from('user_integrations')
        .select('type')
        .eq('is_connected', true);

      const intMap = new Map<string, number>();
      integrations?.forEach(i => {
        intMap.set(i.type, (intMap.get(i.type) || 0) + 1);
      });
      const integrationPopularity = Array.from(intMap.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      setData({ dailyActiveUsers, weeklyAiUsage, intentBreakdown, integrationPopularity });
      setLoading(false);
    }

    fetchAnalytics();
  }, []);

  const maxDau = Math.max(...data.dailyActiveUsers.map(d => d.count), 1);
  const maxUsage = Math.max(...data.weeklyAiUsage.map(d => d.tokens), 1);
  const maxIntent = Math.max(...data.intentBreakdown.map(d => d.count), 1);

  const integrationColors: Record<string, string> = {
    whatsapp: 'bg-[#25D366]',
    telegram: 'bg-[#0088cc]',
    gmail: 'bg-[#EA4335]',
    notion: 'bg-foreground',
    google_calendar: 'bg-[#4285F4]',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" />
          {t('dailyActiveUsers')}
        </h3>
        {loading ? (
          <div className="h-40 animate-pulse bg-muted rounded" />
        ) : (
          <>
            <div className="h-40 flex items-end justify-between gap-2 px-2">
              {data.dailyActiveUsers.map((day, i) => (
                <motion.div
                  key={day.date}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((day.count / maxDau) * 100, 5)}%` }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex-1 bg-gradient-to-t from-primary to-primary/50 rounded-t-lg relative group"
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-card border rounded px-2 py-1 text-xs">
                    {day.count}
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground px-2">
              {data.dailyActiveUsers.map(day => (
                <span key={day.date}>{day.date}</span>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          {t('weeklyAiUsage')}
        </h3>
        {loading ? (
          <div className="h-40 animate-pulse bg-muted rounded" />
        ) : (
          <>
            <div className="h-40 flex items-end justify-between gap-2 px-2">
              {data.weeklyAiUsage.map((day, i) => (
                <motion.div
                  key={day.date}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((day.tokens / maxUsage) * 100, 5)}%` }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex-1 bg-gradient-to-t from-accent to-accent/50 rounded-t-lg relative group"
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-card border rounded px-2 py-1 text-xs whitespace-nowrap">
                    {day.tokens.toLocaleString()}
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground px-2">
              {data.weeklyAiUsage.map(day => (
                <span key={day.date}>{day.date}</span>
              ))}
            </div>
          </>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Mic className="w-4 h-4" />
            {t('mostExecutedIntents')}
          </h3>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-8 animate-pulse bg-muted rounded" />)}
            </div>
          ) : data.intentBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noData')}</p>
          ) : (
            <div className="space-y-3">
              {data.intentBreakdown.slice(0, 5).map((intent, i) => (
                <div key={intent.type} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize">{intent.type.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground">{intent.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(intent.count / maxIntent) * 100}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                      className="h-full bg-[#F3C96B] rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Plug className="w-4 h-4" />
            {t('integrationPopularity')}
          </h3>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-8 animate-pulse bg-muted rounded" />)}
            </div>
          ) : data.integrationPopularity.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noData')}</p>
          ) : (
            <div className="space-y-3">
              {data.integrationPopularity.map((int) => (
                <div key={int.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${integrationColors[int.type] || 'bg-muted'}`} />
                    <span className="text-sm capitalize">{int.type.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-sm font-medium">{int.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
}
