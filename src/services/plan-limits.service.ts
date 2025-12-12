import { supabase } from '@/lib/supabase';

export type PlanType = 'free' | 'pro' | 'enterprise';

interface PlanLimits {
  monthly_ai_tokens: number;
  monthly_voice_minutes: number;
  monthly_whatsapp_messages: number;
  monthly_emails: number;
  max_integrations: number;
  max_email_accounts: number;
  features: {
    ai_memory: boolean;
    auto_actions: boolean;
    priority_support: boolean;
  };
}

interface UsageStats {
  ai_tokens_used: number;
  voice_minutes_used: number;
  whatsapp_messages_sent: number;
  emails_sent: number;
}

export class PlanLimitsService {
  private static currentMonthYear(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  static async getPlanLimits(plan: PlanType): Promise<PlanLimits | null> {
    const { data, error } = await supabase
      .from('plan_limits')
      .select('*')
      .eq('plan', plan)
      .single();

    if (error || !data) return null;
    return data as PlanLimits;
  }

  static async getUserUsage(userId: string): Promise<UsageStats> {
    const monthYear = this.currentMonthYear();
    
    const { data } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .single();

    return data || {
      ai_tokens_used: 0,
      voice_minutes_used: 0,
      whatsapp_messages_sent: 0,
      emails_sent: 0,
    };
  }

  static async getUserPlan(userId: string): Promise<PlanType> {
    const { data } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .single();

    return (data?.plan as PlanType) || 'free';
  }

  static async checkAndIncrementUsage(
    userId: string,
    usageType: 'ai_tokens' | 'voice_minutes' | 'whatsapp_messages' | 'emails',
    amount: number = 1
  ): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    const plan = await this.getUserPlan(userId);
    const limits = await this.getPlanLimits(plan);
    const usage = await this.getUserUsage(userId);

    if (!limits) {
      return { allowed: false, remaining: 0, limit: 0 };
    }

    const limitMap: Record<string, keyof PlanLimits> = {
      ai_tokens: 'monthly_ai_tokens',
      voice_minutes: 'monthly_voice_minutes',
      whatsapp_messages: 'monthly_whatsapp_messages',
      emails: 'monthly_emails',
    };

    const usageMap: Record<string, keyof UsageStats> = {
      ai_tokens: 'ai_tokens_used',
      voice_minutes: 'voice_minutes_used',
      whatsapp_messages: 'whatsapp_messages_sent',
      emails: 'emails_sent',
    };

    const limit = limits[limitMap[usageType]] as number;
    const currentUsage = usage[usageMap[usageType]];

    if (limit === -1) {
      await this.incrementUsage(userId, usageType, amount);
      return { allowed: true, remaining: -1, limit: -1 };
    }

    if (currentUsage + amount > limit) {
      return { allowed: false, remaining: limit - currentUsage, limit };
    }

    await this.incrementUsage(userId, usageType, amount);
    return { allowed: true, remaining: limit - currentUsage - amount, limit };
  }

  private static async incrementUsage(
    userId: string,
    usageType: 'ai_tokens' | 'voice_minutes' | 'whatsapp_messages' | 'emails',
    amount: number
  ): Promise<void> {
    const monthYear = this.currentMonthYear();
    const columnMap: Record<string, string> = {
      ai_tokens: 'ai_tokens_used',
      voice_minutes: 'voice_minutes_used',
      whatsapp_messages: 'whatsapp_messages_sent',
      emails: 'emails_sent',
    };

    const column = columnMap[usageType];
    const usage = await this.getUserUsage(userId);
    const currentValue = usage[column as keyof UsageStats] || 0;

    await supabase
      .from('usage_tracking')
      .upsert({
        user_id: userId,
        month_year: monthYear,
        [column]: currentValue + amount,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,month_year',
      });
  }

  static async canUseFeature(userId: string, feature: keyof PlanLimits['features']): Promise<boolean> {
    const plan = await this.getUserPlan(userId);
    const limits = await this.getPlanLimits(plan);
    return limits?.features?.[feature] ?? false;
  }

  static async getUsagePercentage(userId: string): Promise<Record<string, number>> {
    const plan = await this.getUserPlan(userId);
    const limits = await this.getPlanLimits(plan);
    const usage = await this.getUserUsage(userId);

    if (!limits) {
      return {};
    }

    return {
      ai_tokens: limits.monthly_ai_tokens === -1 ? 0 : (usage.ai_tokens_used / limits.monthly_ai_tokens) * 100,
      voice_minutes: limits.monthly_voice_minutes === -1 ? 0 : (usage.voice_minutes_used / limits.monthly_voice_minutes) * 100,
      whatsapp_messages: limits.monthly_whatsapp_messages === -1 ? 0 : (usage.whatsapp_messages_sent / limits.monthly_whatsapp_messages) * 100,
      emails: limits.monthly_emails === -1 ? 0 : (usage.emails_sent / limits.monthly_emails) * 100,
    };
  }
}
