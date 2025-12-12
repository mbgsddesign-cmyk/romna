import { supabase } from '@/lib/supabase';
import { Insight } from '@/lib/database.types';

export interface ProductivityAnalysis {
  productivityScore: number;
  tasksCompleted: number;
  totalTasks: number;
  focusTime: number;
  peakHours: { start: number; end: number };
  distractionRisk: { start: number; end: number };
  consistency: number;
}

export class AIInsightsService {
  static async generateDailyInsight(userId: string): Promise<Insight | null> {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const analysis = await this.analyzeProductivity(userId, startOfDay, endOfDay);

    if (!analysis) return null;

    const insight = {
      user_id: userId,
      type: 'productivity' as const,
      title: this.generateInsightTitle(analysis),
      description: this.generateInsightDescription(analysis),
      insight_data: analysis,
      period_start: startOfDay,
      period_end: endOfDay
    };

    const { data, error } = await supabase
      .from('insights')
      .insert(insight)
      .select()
      .single();

    if (error) {
      console.error('Error creating insight:', error);
      return null;
    }

    return data;
  }

  static async analyzeProductivity(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<ProductivityAnalysis | null> {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const { data: focusSessions } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', startDate)
      .lte('start_time', endDate);

    if (!tasks) return null;

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const productivityScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const totalFocusTime = focusSessions?.reduce((acc, session) => {
      return acc + (session.actual_duration || 0);
    }, 0) || 0;

    return {
      productivityScore,
      tasksCompleted: completedTasks,
      totalTasks,
      focusTime: totalFocusTime / 60,
      peakHours: { start: 10, end: 12 },
      distractionRisk: { start: 14, end: 16 },
      consistency: 6
    };
  }

  static async detectEnergyPatterns(userId: string): Promise<{
    type: 'energy_dip' | 'productivity_peak' | 'break_needed';
    message: string;
  } | null> {
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour >= 14 && currentHour <= 16) {
      return {
        type: 'energy_dip',
        message: 'Your energy typically dips around this time. Consider a short break or light tasks.'
      };
    }

    if (currentHour >= 10 && currentHour <= 12) {
      return {
        type: 'productivity_peak',
        message: 'You are in your peak productivity hours. Perfect time for deep work!'
      };
    }

    const { data: sessions } = await supabase
      .from('focus_sessions')
      .select('actual_duration')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('start_time', new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString())
      .order('start_time', { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0 && sessions[0].actual_duration > 120) {
      return {
        type: 'break_needed',
        message: 'You have been focused for 2+ hours. Time for a refreshing break!'
      };
    }

    return null;
  }

  private static generateInsightTitle(analysis: ProductivityAnalysis): string {
    if (analysis.productivityScore >= 80) {
      return 'Excellent Productivity Day!';
    } else if (analysis.productivityScore >= 60) {
      return 'Good Progress Today';
    } else {
      return 'Room for Improvement';
    }
  }

  private static generateInsightDescription(analysis: ProductivityAnalysis): string {
    return `You completed ${analysis.tasksCompleted} out of ${analysis.totalTasks} tasks with ${analysis.focusTime.toFixed(1)}h of focus time. Your productivity score is ${analysis.productivityScore}%.`;
  }

  static async getRecentInsights(userId: string, limit = 7): Promise<Insight[]> {
    const { data, error } = await supabase
      .from('insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching insights:', error);
      return [];
    }

    return data || [];
  }
}
