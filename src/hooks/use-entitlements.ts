import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Entitlements {
  isPro: boolean;
  canAccessInsightHistory: boolean;
  canAccessAdvancedBatching: boolean;
  canDelegate: boolean;
  canAccessAdvancedAnalytics: boolean;
  monthlyAiTokens: number;
  monthlyVoiceMinutes: number;
}

const FREE_ENTITLEMENTS: Entitlements = {
  isPro: false,
  canAccessInsightHistory: false,
  canAccessAdvancedBatching: false,
  canDelegate: false,
  canAccessAdvancedAnalytics: false,
  monthlyAiTokens: 10000,
  monthlyVoiceMinutes: 30
};

const PRO_ENTITLEMENTS: Entitlements = {
  isPro: true,
  canAccessInsightHistory: true,
  canAccessAdvancedBatching: true,
  canDelegate: true,
  canAccessAdvancedAnalytics: true,
  monthlyAiTokens: 100000,
  monthlyVoiceMinutes: 300
};

export function useEntitlements() {
  const [entitlements, setEntitlements] = useState<Entitlements>(FREE_ENTITLEMENTS);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchEntitlements();
  }, []);

  const fetchEntitlements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setEntitlements(FREE_ENTITLEMENTS);
        setLoading(false);
        return;
      }

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subscription && (subscription.plan === 'pro' || subscription.plan === 'business')) {
        setEntitlements(PRO_ENTITLEMENTS);
      } else {
        setEntitlements(FREE_ENTITLEMENTS);
      }
    } catch (error) {
      console.error('Failed to fetch entitlements:', error);
      setEntitlements(FREE_ENTITLEMENTS);
    } finally {
      setLoading(false);
    }
  };

  return { entitlements, loading, refetch: fetchEntitlements };
}
