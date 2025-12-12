'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, User, Calendar } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { supabase } from '@/lib/supabase';
import { AIUsage, Profile } from '@/lib/database.types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface UsageWithUser extends AIUsage {
  profile?: Profile;
}

interface DailyUsage {
  date: string;
  tokens: number;
  count: number;
}

export default function AdminUsagePage() {
  const { t } = useTranslation();
  const [usage, setUsage] = useState<UsageWithUser[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [topUsers, setTopUsers] = useState<{ profile: Profile; tokens: number }[]>([]);
  const [intentBreakdown, setIntentBreakdown] = useState<{ type: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    async function fetchUsage() {
      setLoading(true);
      
      const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
      const startDate = subDays(new Date(), days);

      const { data: usageData } = await supabase
        .from('ai_usage')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (usageData) {
        const usageWithUsers = await Promise.all(
          usageData.map(async (u) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', u.user_id)
              .single();
            return { ...u, profile: profile || undefined };
          })
        );
        setUsage(usageWithUsers);

        const dailyMap = new Map<string, { tokens: number; count: number }>();
        for (let i = 0; i < days; i++) {
          const date = format(subDays(new Date(), i), 'MMM d');
          dailyMap.set(date, { tokens: 0, count: 0 });
        }
        usageData.forEach(u => {
          const date = format(new Date(u.created_at), 'MMM d');
          const existing = dailyMap.get(date) || { tokens: 0, count: 0 };
          dailyMap.set(date, { 
            tokens: existing.tokens + (u.tokens_used || 0), 
            count: existing.count + 1 
          });
        });
        setDailyUsage(Array.from(dailyMap.entries()).map(([date, data]) => ({ date, ...data })).reverse());

        const userTokens = new Map<string, { profile: Profile; tokens: number }>();
        usageWithUsers.forEach(u => {
          if (u.profile) {
            const existing = userTokens.get(u.user_id);
            if (existing) {
              existing.tokens += u.tokens_used || 0;
            } else {
              userTokens.set(u.user_id, { profile: u.profile, tokens: u.tokens_used || 0 });
            }
          }
        });
        setTopUsers(Array.from(userTokens.values()).sort((a, b) => b.tokens - a.tokens).slice(0, 5));

        const intentMap = new Map<string, number>();
        usageData.forEach(u => {
          const count = intentMap.get(u.action_type) || 0;
          intentMap.set(u.action_type, count + 1);
        });
        setIntentBreakdown(Array.from(intentMap.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count));
      }

      setLoading(false);
    }
    fetchUsage();
  }, [period]);

  const maxTokens = Math.max(...dailyUsage.map(d => d.tokens), 1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex gap-2">
        {(['daily', 'weekly', 'monthly'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              period === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {t(`${p}Usage` as 'dailyUsage' | 'weeklyUsage' | 'monthlyUsage')}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          {t('tokens')} Usage
        </h3>
        <div className="h-40 flex items-end justify-between gap-1">
          {dailyUsage.map((day, i) => (
            <motion.div
              key={day.date}
              initial={{ height: 0 }}
              animate={{ height: `${(day.tokens / maxTokens) * 100}%` }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="flex-1 bg-gradient-to-t from-primary to-accent rounded-t min-h-[4px]"
              title={`${day.date}: ${day.tokens.toLocaleString()} tokens`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          {dailyUsage.filter((_, i) => i % Math.ceil(dailyUsage.length / 7) === 0).map(day => (
            <span key={day.date}>{day.date}</span>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            {t('topUsers')}
          </h3>
          <div className="space-y-2">
            {loading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted rounded" />)}
              </div>
            ) : topUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noData')}</p>
            ) : (
              topUsers.map((user, i) => (
                <div key={user.profile.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">
                      {i + 1}
                    </span>
                    <span className="truncate max-w-[100px]">{user.profile.name || user.profile.email}</span>
                  </div>
                  <span className="text-muted-foreground">{user.tokens.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {t('usageByIntent')}
          </h3>
          <div className="space-y-2">
            {loading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted rounded" />)}
              </div>
            ) : intentBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noData')}</p>
            ) : (
              intentBreakdown.slice(0, 5).map((intent) => (
                <div key={intent.type} className="flex items-center justify-between text-sm">
                  <Badge variant="secondary" className="text-xs">
                    {intent.type}
                  </Badge>
                  <span className="text-muted-foreground">{intent.count}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Recent Activity</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-muted rounded" />)}
            </div>
          ) : usage.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('noData')}</p>
          ) : (
            usage.slice(0, 20).map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.profile?.name || u.profile?.email}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{u.action_type}</Badge>
                    <span className="text-xs text-muted-foreground">{u.tokens_used} tokens</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(u.created_at), 'MMM d, HH:mm')}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </motion.div>
  );
}
