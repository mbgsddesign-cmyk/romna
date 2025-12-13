import { SupabaseClient } from '@supabase/supabase-js';
import {
  CreateExecutionPlanInput,
  EnqueueExecutionInput,
  ExecutionPlan,
  ExecutionQueueItem,
  ExecutionPlanStatus,
  ExecutionQueueStatus,
  ExecutionType,
} from './types';

export class ExecutionService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create an execution plan
   * AutoGLM ONLY creates plans, NEVER executes directly
   */
  async createPlan(input: CreateExecutionPlanInput): Promise<ExecutionPlan | null> {
    try {
      const { data, error } = await this.supabase
        .from('execution_plans')
        .insert({
          user_id: input.user_id,
          source: input.source,
          intent_type: input.intent_type,
          scheduled_for: input.scheduled_for,
          requires_approval: input.requires_approval,
          status: input.requires_approval ? 'waiting_approval' : 'pending',
          payload: input.payload,
        })
        .select()
        .single();

      if (error) {
        console.error('[ExecutionService] Failed to create plan:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('[ExecutionService] createPlan error:', err);
      return null;
    }
  }

  /**
   * Enqueue an execution item
   * Plans must be approved first (if required)
   */
  async enqueue(input: EnqueueExecutionInput): Promise<ExecutionQueueItem | null> {
    try {
      const { data, error } = await this.supabase
        .from('execution_queue')
        .insert({
          execution_plan_id: input.execution_plan_id,
          user_id: input.user_id,
          type: input.type,
          scheduled_for: input.scheduled_for,
          status: 'scheduled',
          payload: input.payload,
          retry_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('[ExecutionService] Failed to enqueue:', error);
        return null;
      }

      // Update plan status to 'scheduled'
      await this.supabase
        .from('execution_plans')
        .update({ status: 'scheduled' })
        .eq('id', input.execution_plan_id);

      return data;
    } catch (err) {
      console.error('[ExecutionService] enqueue error:', err);
      return null;
    }
  }

  /**
   * Approve a plan (moves from waiting_approval → scheduled → enqueued)
   */
  async approvePlan(planId: string, userId: string): Promise<boolean> {
    try {
      // Get the plan
      const { data: plan, error: fetchError } = await this.supabase
        .from('execution_plans')
        .select('*')
        .eq('id', planId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !plan) {
        console.error('[ExecutionService] Plan not found:', fetchError);
        return false;
      }

      if (plan.status !== 'waiting_approval') {
        console.warn('[ExecutionService] Plan is not waiting for approval');
        return false;
      }

      // Map intent_type to execution type
      const typeMap: Record<string, ExecutionType> = {
        reminder: 'notification',
        alarm: 'alarm',
        email: 'email',
        whatsapp: 'whatsapp',
        notification: 'notification',
      };

      const executionType = typeMap[plan.intent_type] || 'notification';

      // Enqueue for execution
      const queueItem = await this.enqueue({
        execution_plan_id: plan.id,
        user_id: plan.user_id,
        type: executionType,
        scheduled_for: plan.scheduled_for,
        payload: plan.payload,
      });

      return queueItem !== null;
    } catch (err) {
      console.error('[ExecutionService] approvePlan error:', err);
      return false;
    }
  }

  /**
   * Cancel a plan
   */
  async cancelPlan(planId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('execution_plans')
        .update({ status: 'cancelled' })
        .eq('id', planId)
        .eq('user_id', userId);

      if (error) {
        console.error('[ExecutionService] Failed to cancel plan:', error);
        return false;
      }

      // Cancel any queued executions
      await this.supabase
        .from('execution_queue')
        .update({ status: 'cancelled' })
        .eq('execution_plan_id', planId);

      return true;
    } catch (err) {
      console.error('[ExecutionService] cancelPlan error:', err);
      return false;
    }
  }

  /**
   * Update execution status
   */
  async updateExecutionStatus(
    queueId: string,
    status: ExecutionQueueStatus,
    error?: string
  ): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = {
        status,
        executed_at: status === 'executed' ? new Date().toISOString() : undefined,
        last_error: error || null,
      };

      const { error: updateError } = await this.supabase
        .from('execution_queue')
        .update(updateData)
        .eq('id', queueId);

      if (updateError) {
        console.error('[ExecutionService] Failed to update execution status:', updateError);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[ExecutionService] updateExecutionStatus error:', err);
      return false;
    }
  }

  /**
   * Get pending approvals for a user
   */
  async getPendingApprovals(userId: string): Promise<ExecutionPlan[]> {
    try {
      const { data, error } = await this.supabase
        .from('execution_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'waiting_approval')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ExecutionService] Failed to get pending approvals:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[ExecutionService] getPendingApprovals error:', err);
      return [];
    }
  }

  /**
   * Get scheduled executions (for worker polling)
   */
  async getScheduledExecutions(): Promise<ExecutionQueueItem[]> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('execution_queue')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_for', now)
        .order('scheduled_for', { ascending: true })
        .limit(50);

      if (error) {
        console.error('[ExecutionService] Failed to get scheduled executions:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[ExecutionService] getScheduledExecutions error:', err);
      return [];
    }
  }

  /**
   * Increment retry count
   */
  async incrementRetry(queueId: string): Promise<boolean> {
    try {
      const { data, error: fetchError } = await this.supabase
        .from('execution_queue')
        .select('retry_count')
        .eq('id', queueId)
        .single();

      if (fetchError || !data) {
        return false;
      }

      const newRetryCount = data.retry_count + 1;

      const { error: updateError } = await this.supabase
        .from('execution_queue')
        .update({ 
          retry_count: newRetryCount,
          status: newRetryCount >= 3 ? 'failed' : 'scheduled',
        })
        .eq('id', queueId);

      return !updateError;
    } catch (err) {
      console.error('[ExecutionService] incrementRetry error:', err);
      return false;
    }
  }
}
