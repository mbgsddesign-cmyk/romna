import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

type NotificationPayload = {
  title: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  ai_reason?: string;
  category: string;
  metadata?: Record<string, any>;
};

type UserPreferences = {
  ai_opt_in: boolean;
  plan_tier: string;
  // include other fields as necessary, but these are the critical ones for dispatch
};

export class NotificationDispatcher {
  constructor(private supabase: SupabaseClient<Database>) {}

  async dispatch(
    userId: string,
    payload: NotificationPayload,
    userPrefs?: UserPreferences
  ): Promise<{ success: boolean; skipped?: boolean; reason?: string }> {
    // 1. Ensure preferences are available
    let prefs = userPrefs;
    if (!prefs) {
      const { data } = await this.supabase
        .from('user_preferences')
        .select('ai_opt_in, plan_tier')
        .eq('user_id', userId)
        .single();
      
      if (data) {
        prefs = {
            ai_opt_in: data.ai_opt_in ?? false,
            plan_tier: data.plan_tier || 'free'
        };
      } else {
        // Default to safe values if not found
        prefs = { ai_opt_in: false, plan_tier: 'free' };
      }
    }

    // 2. Security: AI Opt-in Check
    if (!prefs.ai_opt_in) {
      await this.logSkip(userId, payload, 'ai_opt_out');
      return { success: false, skipped: true, reason: 'ai_opt_out' };
    }

    // 3. Plan-based Rules
    // Treat null/undefined plan_tier as 'free' for safety
    const plan = prefs.plan_tier || 'free';
    const isFree = plan === 'free';
    
    // Rule: Free users -> Only priority = "high"
    if (isFree && payload.priority !== 'high' && payload.priority !== 'urgent') {
        // Assuming 'urgent' is also >= 'high'. The prompt said 'Only priority = "high"', but usually urgent is higher. 
        // Strict interpretation: "Only priority = 'high'". 
        // Let's stick to the prompt strictly: "Only priority = 'high'". 
        // But what if it's urgent? It's safer to allow urgent too, but the prompt says "Only priority = 'high'".
        // However, looking at AutoGLM, it maps 1 to 'high' and others to 'normal'.
        // Let's assume strict "high" check based on prompt, but usually higher priorities should pass.
        // Let's check AutoGLM mapping: `result.notification.priority === 1 ? 'high' : 'normal'`.
        // So effectively AutoGLM only produces 'high' or 'normal'.
        // So checking === 'high' is sufficient.
        if (payload.priority !== 'high') {
             await this.logSkip(userId, payload, 'low_priority_for_free_tier');
             return { success: false, skipped: true, reason: 'low_priority_for_free_tier' };
        }
    }

    // Rule: Free users -> Max 2 AI notifications per day
    if (isFree) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count, error } = await this.supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('type', 'ai')
            .gte('created_at', today.toISOString());

        if (error) {
            console.error('[NotificationDispatcher] Error checking rate limit:', error);
            // Fail safe? Or block? Let's block to be safe.
            return { success: false, reason: 'rate_limit_check_failed' };
        }

        if (count !== null && count >= 2) {
             await this.logSkip(userId, payload, 'daily_limit_reached');
             return { success: false, skipped: true, reason: 'daily_limit_reached' };
        }
    }

    // 4. Delivery (Insert to DB)
    const { error } = await this.supabase.from('notifications').insert({
      user_id: userId,
      type: 'ai',
      title: payload.title,
      message: payload.body,
      category: payload.category || 'ai',
      priority: payload.priority,
      ai_reason: payload.ai_reason,
      is_read: false,
      is_batched: false,
      metadata: payload.metadata
    });

    if (error) {
        console.error('[NotificationDispatcher] Insert error:', error);
        return { success: false, reason: 'db_insert_error' };
    }

    return { success: true };
  }

  private async logSkip(userId: string, payload: NotificationPayload, reason: string) {
      await this.supabase.from('user_activity').insert({
          user_id: userId,
          action: 'notification_skipped',
          meta: {
              reason,
              title: payload.title,
              priority: payload.priority,
              tier_restriction: true
          }
      });
  }
}