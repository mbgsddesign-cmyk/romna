export type ExecutionSource = 'voice' | 'text';

export type ExecutionIntentType = 
  | 'reminder' 
  | 'alarm' 
  | 'email' 
  | 'whatsapp' 
  | 'notification';

export type ExecutionPlanStatus = 
  | 'pending' 
  | 'waiting_approval' 
  | 'scheduled' 
  | 'executed' 
  | 'cancelled' 
  | 'failed';

export type ExecutionQueueStatus = 
  | 'scheduled' 
  | 'executing' 
  | 'executed' 
  | 'failed' 
  | 'cancelled';

export type ExecutionType = 
  | 'notification' 
  | 'alarm' 
  | 'email' 
  | 'whatsapp';

export interface ExecutionPlan {
  id: string;
  user_id: string;
  source: ExecutionSource;
  intent_type: ExecutionIntentType;
  scheduled_for: string;
  requires_approval: boolean;
  status: ExecutionPlanStatus;
  payload: Record<string, unknown>;
  created_at: string;
  executed_at?: string;
  error_message?: string;
}

export interface ExecutionQueueItem {
  id: string;
  execution_plan_id: string;
  user_id: string;
  type: ExecutionType;
  scheduled_for: string;
  status: ExecutionQueueStatus;
  payload: Record<string, unknown>;
  last_error?: string;
  retry_count: number;
  created_at: string;
  executed_at?: string;
}

export interface CreateExecutionPlanInput {
  user_id: string;
  source: ExecutionSource;
  intent_type: ExecutionIntentType;
  scheduled_for: string;
  requires_approval: boolean;
  payload: Record<string, unknown>;
}

export interface EnqueueExecutionInput {
  execution_plan_id: string;
  user_id: string;
  type: ExecutionType;
  scheduled_for: string;
  payload: Record<string, unknown>;
}
