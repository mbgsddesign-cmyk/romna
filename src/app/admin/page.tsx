'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Activity, CreditCard, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalTokens: number;
  totalIntents: number;
}

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTokens: 0,
    totalIntents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [usersRes, activeRes, tokensRes, intentsRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .gte('last_active_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('ai_usage').select('tokens_used'),
        supabase.from('voice_intents').select('*', { count: 'exact', head: true }),
      ]);

      const totalTokens = tokensRes.data?.reduce((sum, r) => sum + (r.tokens_used || 0), 0) || 0;

      setStats({
        totalUsers: usersRes.count || 0,
        activeUsers: activeRes.count || 0,
        totalTokens,
        totalIntents: intentsRes.count || 0,
      });
      setLoading(false);
    }
    fetchStats();
  }, []);

  const statCards = [
    { 
      label: t('totalUsers'), 
      value: stats.totalUsers, 
      icon: Users, 
      color: 'bg-primary/10 text-primary',
      trend: '+12%'
    },
    { 
      label: t('activeUsers'), 
      value: stats.activeUsers, 
      icon: Activity, 
      color: 'bg-accent/10 text-accent',
      trend: '+8%'
    },
    { 
      label: t('totalTokens'), 
      value: stats.totalTokens.toLocaleString(), 
      icon: Zap, 
      color: 'bg-[#F3C96B]/20 text-[#F3C96B]',
      trend: '+25%'
    },
    { 
      label: t('totalIntents'), 
      value: stats.totalIntents, 
      icon: CreditCard, 
      color: 'bg-[#2ECC71]/10 text-[#2ECC71]',
      trend: '+15%'
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-2 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4 space-y-3">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {loading ? '...' : stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-[#2ECC71]">
                <TrendingUp className="w-3 h-3" />
                <span>{stat.trend}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">{t('dailyActiveUsers')}</h3>
        <div className="h-40 flex items-end justify-between gap-2 px-2">
          {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
              className="flex-1 bg-gradient-to-t from-primary to-accent rounded-t-lg"
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground px-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <span key={day}>{day}</span>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">{t('mostExecutedIntents')}</h3>
        <div className="space-y-3">
          {[
            { name: 'Task Creation', percent: 85, color: 'bg-primary' },
            { name: 'Event Creation', percent: 65, color: 'bg-accent' },
            { name: 'Email Send', percent: 45, color: 'bg-[#F3C96B]' },
            { name: 'WhatsApp Message', percent: 30, color: 'bg-[#25D366]' },
          ].map((intent, i) => (
            <div key={intent.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{intent.name}</span>
                <span className="text-muted-foreground">{intent.percent}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${intent.percent}%` }}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                  className={`h-full ${intent.color} rounded-full`}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
