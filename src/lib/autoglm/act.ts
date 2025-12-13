/**
 * AutoGLM Action Interface
 * 
 * Provides API for external systems (Tasks page, Insights, Ask ROMNA) to request AutoGLM decisions
 * 
 * This module ONLY returns decisions - never executes them
 */

import { buildAutoGLMContext } from './context';
import { reason } from './reason';
import { decide, logDecision, type Decision } from './decide';

export interface AutoGLMRequest {
  user_id: string;
  trigger?: 'manual' | 'tasks_page' | 'insights_page' | 'voice_intent';
}

export interface AutoGLMResponse {
  success: boolean;
  decisions: Decision[];
  summary: string;
  reasoning?: {
    risks_count: number;
    opportunities_count: number;
    top_priority_task?: string;
  };
  error?: string;
  logs?: string[];
}

/**
 * Main AutoGLM entry point
 * 
 * Usage:
 * ```
 * const result = await executeAutoGLM({ user_id: 'xxx', trigger: 'tasks_page' });
 * // Returns decisions array - UI shows them with Approve/Ignore buttons
 * ```
 */
export async function executeAutoGLM(request: AutoGLMRequest): Promise<AutoGLMResponse> {
  const logs: string[] = [];
  const startTime = Date.now();
  
  try {
    logs.push(`[AutoGLM] Starting execution for user ${request.user_id}`);
    logs.push(`[AutoGLM] Trigger: ${request.trigger || 'manual'}`);
    
    // Step 1: Gather context
    logs.push('[AutoGLM] Step 1: Building context...');
    const context = await buildAutoGLMContext(request.user_id);
    logs.push(`[AutoGLM] Context built: ${context.total_tasks_today} tasks today, ${context.events_today.length} events`);
    
    // Step 2: Reason about context
    logs.push('[AutoGLM] Step 2: Reasoning...');
    const reasoning = reason(context);
    logs.push(`[AutoGLM] Reasoning complete: ${reasoning.risks.length} risks, ${reasoning.opportunities.length} opportunities`);
    
    // Step 3: Generate decisions
    logs.push('[AutoGLM] Step 3: Generating decisions...');
    const decisions = decide(context, reasoning);
    logs.push(`[AutoGLM] Generated ${decisions.length} decisions`);
    
    // Log each decision
    for (const decision of decisions) {
      logDecision(decision, request.user_id);
      logs.push(`[AutoGLM Decision] ${decision.decision_type}: ${decision.explanation}`);
    }
    
    const duration = Date.now() - startTime;
    logs.push(`[AutoGLM] Completed in ${duration}ms`);
    
    // Output all logs to console
    for (const log of logs) {
      console.log(log);
    }
    
    return {
      success: true,
      decisions,
      summary: reasoning.summary,
      reasoning: {
        risks_count: reasoning.risks.length,
        opportunities_count: reasoning.opportunities.length,
        top_priority_task: reasoning.priorities[0]?.task_title,
      },
      logs,
    };
  } catch (error: any) {
    console.error('[AutoGLM Error]', error);
    logs.push(`[AutoGLM Error] ${error.message}`);
    
    return {
      success: false,
      decisions: [],
      summary: 'AutoGLM failed to generate decisions',
      error: error.message,
      logs,
    };
  }
}

/**
 * Get recent AutoGLM decisions from cache/memory
 * (For now returns empty - can be enhanced with Redis/DB caching later)
 */
export async function getRecentDecisions(userId: string): Promise<Decision[]> {
  // TODO: Implement caching layer
  // For now, trigger fresh execution
  const result = await executeAutoGLM({ user_id: userId, trigger: 'manual' });
  return result.decisions;
}
