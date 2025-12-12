import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  category?: string;
  priority?: 'urgent' | 'normal' | 'low';
  actionUrl?: string;
  actionLabel?: string;
  metadata?: any;
}

export async function createNotification(payload: NotificationPayload) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      category: payload.category || 'general',
      priority: payload.priority || 'normal',
      action_url: payload.actionUrl,
      action_label: payload.actionLabel,
      metadata: payload.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function shouldBatchNotification(userId: string): Promise<boolean> {
  const { data: session } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  return !!session;
}

export async function batchNotification(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_batched: true })
    .eq('id', notificationId);

  if (error) throw error;
}

export async function detectMeetingConflicts(userId: string) {
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('date', new Date().toISOString());

  if (!events || events.length === 0) return [];

  const conflicts = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const event1 = events[i];
      const event2 = events[j];
      
      const start1 = new Date(event1.date);
      const end1 = new Date(start1.getTime() + (event1.duration || 60) * 60000);
      
      const start2 = new Date(event2.date);
      const end2 = new Date(start2.getTime() + (event2.duration || 60) * 60000);

      if ((start1 < end2 && end1 > start2) || (start2 < end1 && end2 > start1)) {
        conflicts.push({
          event1: event1.title,
          event2: event2.title,
          time: start1.toISOString(),
        });
        
        await createNotification({
          userId,
          type: 'conflict',
          title: 'Meeting Conflict',
          message: `Your ${event1.title} overlaps with ${event2.title}`,
          category: 'ai',
          priority: 'urgent',
          actionUrl: '/calendar',
          actionLabel: 'Reschedule',
        });
      }
    }
  }

  return conflicts;
}

export async function getBatchedNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_batched', true)
    .eq('is_read', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function releaseBatchedNotifications(userId: string) {
  const batched = await getBatchedNotifications(userId);
  
  if (batched.length > 0) {
    await createNotification({
      userId,
      type: 'summary',
      title: 'Daily Summary Ready',
      message: `${batched.length} non-urgent updates batched`,
      category: 'system',
      priority: 'normal',
      metadata: { batchedCount: batched.length },
    });
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_batched: false })
    .eq('user_id', userId)
    .eq('is_batched', true);

  if (error) throw error;
}

export async function calculateNotificationPriority(
  type: string,
  metadata: any
): Promise<'urgent' | 'normal' | 'low'> {
  if (type === 'conflict' || type === 'deadline') return 'urgent';
  if (type === 'reminder' && metadata?.dueWithin30Min) return 'urgent';
  if (type === 'insight' || type === 'summary') return 'low';
  return 'normal';
}
