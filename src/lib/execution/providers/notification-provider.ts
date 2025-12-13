import { BaseExecutionProvider, ExecutionResult } from './base-provider';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class NotificationProvider extends BaseExecutionProvider {
  async execute(payload: Record<string, unknown>): Promise<ExecutionResult> {
    try {
      const { title, message, userId } = payload;

      if (!userId) {
        return {
          success: false,
          error: 'userId is required for notification',
        };
      }

      console.log('[NotificationProvider] Creating in-app notification:', {
        title,
        message,
        userId,
        timestamp: new Date().toISOString(),
      });

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error } = await supabase.from('notifications').insert({
        user_id: String(userId),
        type: 'reminder',
        title: String(title || 'Reminder'),
        message: String(message || ''),
        is_read: false,
      });

      if (error) {
        console.error('[NotificationProvider] Failed to create notification:', error);
        return {
          success: false,
          error: `Failed to create notification: ${error.message}`,
        };
      }

      console.log('[NotificationProvider] Notification created successfully');
      return { success: true };
    } catch (error) {
      console.error('[NotificationProvider] Execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Notification failed',
      };
    }
  }
}