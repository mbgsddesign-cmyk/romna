'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ArrowUp, ArrowDown, Calendar, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { supabase } from '@/lib/supabase';
import { Subscription, Profile, SubscriptionPlan } from '@/lib/database.types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

interface SubscriptionWithUser extends Subscription {
  profile?: Profile;
}

export default function AdminSubscriptionsPage() {
  const { t } = useTranslation();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [planFilter, setPlanFilter] = useState<SubscriptionPlan | 'all'>('all');

  const fetchSubscriptions = async () => {
    setLoading(true);
    let query = supabase.from('subscriptions').select('*');
    
    if (planFilter !== 'all') {
      query = query.eq('plan', planFilter);
    }

    const { data: subs } = await query.order('created_at', { ascending: false });
    
    if (subs) {
      const subsWithUsers = await Promise.all(
        subs.map(async (sub) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sub.user_id)
            .single();
          return { ...sub, profile: profile || undefined };
        })
      );
      setSubscriptions(subsWithUsers);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [planFilter]);

  const updatePlan = async (subId: string, plan: SubscriptionPlan) => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ plan, updated_at: new Date().toISOString() })
      .eq('id', subId);

    if (error) {
      toast.error(t('error'));
    } else {
      toast.success(t('success'));
      fetchSubscriptions();
    }
  };

  const extendTrial = async (subId: string) => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ 
        trial_ends_at: addDays(new Date(), 14).toISOString(),
        status: 'trial',
        updated_at: new Date().toISOString() 
      })
      .eq('id', subId);

    if (error) {
      toast.error(t('error'));
    } else {
      toast.success(t('success'));
      fetchSubscriptions();
    }
  };

  const getPlanBadge = (plan: SubscriptionPlan) => {
    const styles = {
      free: 'bg-muted text-muted-foreground',
      pro: 'bg-accent/10 text-accent',
      enterprise: 'bg-[#F3C96B]/20 text-[#F3C96B]',
    };
    return <Badge className={styles[plan]}>{t(plan)}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-[#2ECC71]/10 text-[#2ECC71]',
      cancelled: 'bg-destructive/10 text-destructive',
      expired: 'bg-muted text-muted-foreground',
      trial: 'bg-primary/10 text-primary',
    };
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex justify-between items-center">
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value as SubscriptionPlan | 'all')}
          className="px-3 py-2 rounded-xl border bg-background text-sm"
        >
          <option value="all">All Plans</option>
          <option value="free">{t('free')}</option>
          <option value="pro">{t('pro')}</option>
          <option value="enterprise">{t('enterprise')}</option>
        </select>
        <Button variant="outline" size="icon" onClick={fetchSubscriptions}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {['free', 'pro', 'enterprise'].map((plan) => {
          const count = subscriptions.filter(s => s.plan === plan).length;
          return (
            <Card key={plan} className="p-3 text-center">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground capitalize">{t(plan as 'free' | 'pro' | 'enterprise')}</p>
            </Card>
          );
        })}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-16 bg-muted rounded" />
              </Card>
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            {t('noData')}
          </Card>
        ) : (
          subscriptions.map((sub, index) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{sub.profile?.name || sub.profile?.email || 'Unknown'}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{sub.profile?.email}</p>
                    <div className="flex flex-wrap gap-2">
                      {getPlanBadge(sub.plan)}
                      {getStatusBadge(sub.status)}
                    </div>
                    {sub.current_period_end && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {t('renewalDate')}: {format(new Date(sub.current_period_end), 'MMM d, yyyy')}
                      </p>
                    )}
                    {sub.trial_ends_at && (
                      <p className="text-xs text-primary mt-1">
                        Trial ends: {format(new Date(sub.trial_ends_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {sub.plan !== 'enterprise' && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => updatePlan(sub.id, sub.plan === 'free' ? 'pro' : 'enterprise')}
                        className="text-xs"
                      >
                        <ArrowUp className="w-3 h-3 mr-1" />
                        {t('upgradePlan')}
                      </Button>
                    )}
                    {sub.plan !== 'free' && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => updatePlan(sub.id, sub.plan === 'enterprise' ? 'pro' : 'free')}
                        className="text-xs"
                      >
                        <ArrowDown className="w-3 h-3 mr-1" />
                        {t('downgradePlan')}
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => extendTrial(sub.id)}
                      className="text-xs"
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      {t('extendTrial')}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
