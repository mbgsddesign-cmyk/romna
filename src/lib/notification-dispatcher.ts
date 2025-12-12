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
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  quiet_hours_enabled?: boolean;
  timezone?: string;
  week_start?: string;
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
        .select('ai_opt_in, plan_tier, quiet_hours_start, quiet_hours_end, quiet_hours_enabled, timezone, week_start')
        .eq('user_id', userId)
        .single();
      
      if (data) {
        prefs = {
            ai_opt_in: data.ai_opt_in ?? false,
            plan_tier: data.plan_tier || 'free',
            quiet_hours_start: data.quiet_hours_start ?? undefined,
            quiet_hours_end: data.quiet_hours_end ?? undefined,
            quiet_hours_enabled: data.quiet_hours_enabled ?? undefined,
            timezone: data.timezone ?? undefined,
            week_start: data.week_start ?? undefined
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
             console.log(`[NotificationDispatcher] Daily limit reached for user ${userId}`);
             
             // UPSELL LOGIC: Check if we should show an upsell instead
             // Only show upsell once per 24h
             const upsellLookback = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
             const { data: recentUpsells } = await this.supabase
                .from('user_activity')
                .select('id')
                .eq('user_id', userId)
                .eq('action', 'upsell_impression')
                .gte('created_at', upsellLookback)
                .limit(1);

             if (!recentUpsells || recentUpsells.length === 0) {
                 // Create Upsell Notification
                 console.log(`[NotificationDispatcher] triggering upsell for user ${userId}`);
                 await this.supabase.from('notifications').insert({
                    user_id: userId,
                    type: 'system',
                    title: 'Daily Limit Reached',
                    message: 'You have reached your daily AI notification limit. Upgrade to Pro for unlimited insights.',
                    category: 'upgrade',
                    priority: 'high', // High priority to ensure delivery
                    is_read: false,
                    is_batched: false,
                    metadata: { 
                        reason: 'daily_limit',
                        original_payload: {
                            title: payload.title,
                            category: payload.category
                        }
                    }
                 });

                 await this.logActivity(userId, 'upsell_impression', { reason: 'daily_limit' });
             }

             await this.logSkip(userId, payload, 'daily_limit_reached');
             return { success: false, skipped: true, reason: 'daily_limit_reached' };
        }
    }

    // 4. Smart Timing & Quiet Hours
    let scheduledFor = new Date();
    let isDelayed = false;

    if (prefs.quiet_hours_enabled && payload.priority !== 'high' && payload.priority !== 'urgent') {
        try {
            const timezone = prefs.timezone || 'UTC';
            // Start checking from now
            let checkTime = new Date(scheduledFor);
            let attempts = 0;
            // Limit checks to prevent infinite loops (e.g. 48 hours max)
            const MAX_CHECKS = 48 * 4; // 15 min intervals

            while (!this.isAllowedTime(checkTime, timezone, prefs) && attempts < MAX_CHECKS) {
                // Advance 15 mins
                checkTime = new Date(checkTime.getTime() + 15 * 60 * 1000);
                attempts++;
            }

            if (attempts > 0 && attempts < MAX_CHECKS) {
                scheduledFor = checkTime;
                isDelayed = true;
                await this.logActivity(userId, 'notification_delayed', {
                    reason: 'quiet_hours',
                    original_time: new Date().toISOString(),
                    scheduled_for: scheduledFor.toISOString(),
                    timezone
                });
            }
        } catch (error) {
            console.error('[NotificationDispatcher] Error calculating quiet hours:', error);
            // Fallback: send immediately
        }
    }

    // 5. Delivery (Insert to DB)
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
      scheduled_for: scheduledFor.toISOString(),
      metadata: payload.metadata
    });

    if (error) {
        console.error('[NotificationDispatcher] Insert error:', error);
        return { success: false, reason: 'db_insert_error' };
    }

    return { success: true, reason: isDelayed ? 'scheduled_for_later' : undefined };
  }

  private isAllowedTime(date: Date, timezone: string, prefs: UserPreferences): boolean {
      if (!prefs.quiet_hours_start || !prefs.quiet_hours_end) return true;

      try {
          const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: timezone,
              hour: 'numeric',
              minute: 'numeric',
              hour12: false
          });
          const parts = formatter.formatToParts(date);
          const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
          const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
          const currentMins = h * 60 + m;

          const [sH, sM] = prefs.quiet_hours_start.split(':').map(Number);
          const startMins = sH * 60 + sM;

          const [eH, eM] = prefs.quiet_hours_end.split(':').map(Number);
          const endMins = eH * 60 + eM;

          if (startMins > endMins) {
              // Overnight (e.g. 22:00 to 08:00)
              // Quiet if > 22:00 OR < 08:00
              // Allowed if BETWEEN 08:00 and 22:00
              return currentMins >= endMins && currentMins < startMins;
          } else {
              // Daytime block (e.g. 14:00 to 16:00)
              // Quiet if > 14:00 AND < 16:00
              // Allowed if < 14:00 OR > 16:00
              return currentMins < startMins || currentMins >= endMins;
          }
      } catch (e) {
          console.warn('[NotificationDispatcher] Date parsing error', e);
          return true; // Fail open
      }
  }

  private async logSkip(userId: string, payload: NotificationPayload, reason: string) {
      await this.logActivity(userId, 'notification_skipped', {
          reason,
          title: payload.title,
          priority: payload.priority,
          tier_restriction: true
      });
  }

  private async logActivity(userId: string, action: string, meta: any) {
      await this.supabase.from('user_activity').insert({
          user_id: userId,
          action,
          meta
      });
  }
}