import { supabase } from '@/lib/supabase';
import { FocusSession, FocusMode, FocusStatus } from '@/lib/database.types';

export class FocusModeService {
  static async startFocusSession(
    userId: string,
    title: string,
    mode: FocusMode = 'deep_work',
    targetDuration?: number
  ): Promise<FocusSession | null> {
    const session = {
      user_id: userId,
      title,
      mode,
      start_time: new Date().toISOString(),
      target_duration: targetDuration || 90,
      status: 'active' as FocusStatus,
      interruptions: 0
    };

    const { data, error } = await supabase
      .from('focus_sessions')
      .insert(session)
      .select()
      .single();

    if (error) {
      console.error('Error starting focus session:', error);
      return null;
    }

    await this.batchNotifications(userId);

    return data;
  }

  static async endFocusSession(sessionId: string): Promise<FocusSession | null> {
    const { data: session } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) return null;

    const endTime = new Date();
    const startTime = new Date(session.start_time);
    const actualDuration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);

    const { data, error } = await supabase
      .from('focus_sessions')
      .update({
        end_time: endTime.toISOString(),
        actual_duration: actualDuration,
        status: 'completed' as FocusStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error ending focus session:', error);
      return null;
    }

    await this.releaseBatchedNotifications(session.user_id);

    return data;
  }

  static async pauseFocusSession(sessionId: string): Promise<FocusSession | null> {
    const { data, error } = await supabase
      .from('focus_sessions')
      .update({
        status: 'paused' as FocusStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error pausing focus session:', error);
      return null;
    }

    return data;
  }

  static async resumeFocusSession(sessionId: string): Promise<FocusSession | null> {
    const { data, error } = await supabase
      .from('focus_sessions')
      .update({
        status: 'active' as FocusStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error resuming focus session:', error);
      return null;
    }

    return data;
  }

  static async getActiveFocusSession(userId: string): Promise<FocusSession | null> {
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('start_time', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching active focus session:', error);
      return null;
    }

    return data;
  }

  static async recordInterruption(sessionId: string): Promise<void> {
    const { data: session } = await supabase
      .from('focus_sessions')
      .select('interruptions')
      .eq('id', sessionId)
      .single();

    if (!session) return;

    await supabase
      .from('focus_sessions')
      .update({
        interruptions: (session.interruptions || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
  }

  private static async batchNotifications(userId: string): Promise<void> {
    await supabase
      .from('notifications')
      .update({ is_batched: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .in('priority', ['low', 'normal']);
  }

  private static async releaseBatchedNotifications(userId: string): Promise<void> {
    await supabase
      .from('notifications')
      .update({ is_batched: false })
      .eq('user_id', userId)
      .eq('is_batched', true);
  }

  static async getFocusHistory(userId: string, limit = 10): Promise<FocusSession[]> {
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('start_time', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching focus history:', error);
      return [];
    }

    return data || [];
  }

  static async getFocusStats(userId: string, days = 7): Promise<{
    totalSessions: number;
    totalMinutes: number;
    averageDuration: number;
    totalInterruptions: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await supabase
      .from('focus_sessions')
      .select('actual_duration, interruptions')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('start_time', startDate.toISOString());

    if (!data || data.length === 0) {
      return {
        totalSessions: 0,
        totalMinutes: 0,
        averageDuration: 0,
        totalInterruptions: 0
      };
    }

    const totalMinutes = data.reduce((sum, s) => sum + (s.actual_duration || 0), 0);
    const totalInterruptions = data.reduce((sum, s) => sum + (s.interruptions || 0), 0);

    return {
      totalSessions: data.length,
      totalMinutes,
      averageDuration: Math.round(totalMinutes / data.length),
      totalInterruptions
    };
  }
}
