/**
 * AutoGLM Decision Layer
 * 
 * Converts reasoning output → concrete decisions
 * 
 * Decisions are actionable, typed, and ready to be proposed to user
 * NO execution - only proposals
 */

import type { Reasoning, Risk, Opportunity } from './reason';
import type { AutoGLMContext } from './context';

export type DecisionType = 
  | 'suggest_reschedule'
  | 'suggest_focus_block'
  | 'suggest_break'
  | 'warn_conflict'
  | 'warn_overload'
  | 'recommend_action';

export interface Decision {
  decision_type: DecisionType;
  explanation: string;
  payload: DecisionPayload;
  confidence: number; // 0-1
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export type DecisionPayload = 
  | ReschedulePayload
  | FocusBlockPayload
  | BreakPayload
  | WarningPayload
  | RecommendationPayload;

export interface ReschedulePayload {
  task_ids: string[];
  suggested_date: string;
  reason: string;
}

export interface FocusBlockPayload {
  duration_minutes: number;
  suggested_start: string;
  task_ids: string[];
}

export interface BreakPayload {
  duration_minutes: number;
  after_event_id: string;
}

export interface WarningPayload {
  warning_type: 'conflict' | 'overload' | 'deadline';
  affected_entities: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface RecommendationPayload {
  message: string;
  action_hint?: string;
}

/**
 * Main decision function
 */
export function decide(context: AutoGLMContext, reasoning: Reasoning): Decision[] {
  const decisions: Decision[] = [];
  
  // Handle high-severity risks first
  for (const risk of reasoning.risks.filter(r => r.severity === 'high' || r.severity === 'medium')) {
    const decision = riskToDecision(risk, context, reasoning);
    if (decision) decisions.push(decision);
  }
  
  // Convert opportunities to actionable decisions
  for (const opportunity of reasoning.opportunities.slice(0, 3)) { // Top 3
    const decision = opportunityToDecision(opportunity, context, reasoning);
    if (decision) decisions.push(decision);
  }
  
  // Add general recommendations
  for (const recommendation of reasoning.recommendations.slice(0, 2)) {
    decisions.push({
      decision_type: 'recommend_action',
      explanation: recommendation,
      payload: {
        message: recommendation,
      },
      confidence: 0.8,
      priority: 'normal',
    });
  }
  
  return decisions;
}

/**
 * Convert risk → decision
 */
function riskToDecision(risk: Risk, context: AutoGLMContext, reasoning: Reasoning): Decision | null {
  switch (risk.type) {
    case 'overload':
      // Find flexible tasks to reschedule
      const flexibleTasks = context.tasks_today.filter(t => 
        t.time_flexibility === 'flexible' && risk.affected_entities.includes(t.id)
      );
      
      if (flexibleTasks.length > 0) {
        const tomorrow = new Date(context.current_time);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return {
          decision_type: 'suggest_reschedule',
          explanation: `Move ${flexibleTasks.length} flexible task(s) to tomorrow to reduce today's workload`,
          payload: {
            task_ids: flexibleTasks.map(t => t.id),
            suggested_date: tomorrow.toISOString(),
            reason: 'Today is overloaded',
          },
          confidence: 0.85,
          priority: risk.severity === 'high' ? 'urgent' : 'high',
        };
      } else {
        return {
          decision_type: 'warn_overload',
          explanation: risk.description,
          payload: {
            warning_type: 'overload',
            affected_entities: risk.affected_entities,
            severity: risk.severity,
          },
          confidence: 0.9,
          priority: risk.severity === 'high' ? 'urgent' : 'high',
        };
      }
    
    case 'deadline':
      return {
        decision_type: 'warn_overload',
        explanation: risk.description + ' Consider prioritizing these immediately.',
        payload: {
          warning_type: 'deadline',
          affected_entities: risk.affected_entities,
          severity: risk.severity,
        },
        confidence: 1.0,
        priority: 'urgent',
      };
    
    case 'conflict':
      return {
        decision_type: 'warn_conflict',
        explanation: risk.description,
        payload: {
          warning_type: 'conflict',
          affected_entities: risk.affected_entities,
          severity: risk.severity,
        },
        confidence: 0.95,
        priority: 'high',
      };
    
    default:
      return null;
  }
}

/**
 * Convert opportunity → decision
 */
function opportunityToDecision(opp: Opportunity, context: AutoGLMContext, reasoning: Reasoning): Decision | null {
  switch (opp.type) {
    case 'focus_block':
      // Find highest priority tasks
      const topTasks = reasoning.priorities.slice(0, 3);
      const focusStart = findNextAvailableSlot(context, context.preferences.focus_block_minutes || 90);
      
      if (focusStart && topTasks.length > 0) {
        return {
          decision_type: 'suggest_focus_block',
          explanation: opp.description,
          payload: {
            duration_minutes: context.preferences.focus_block_minutes || 90,
            suggested_start: focusStart.toISOString(),
            task_ids: topTasks.map(t => t.task_id),
          },
          confidence: 0.8,
          priority: 'normal',
        };
      }
      return null;
    
    case 'reschedule':
      const flexibleTasks = context.tasks_today.filter(t => 
        t.time_flexibility === 'flexible'
      ).slice(0, 3);
      
      if (flexibleTasks.length > 0) {
        const tomorrow = new Date(context.current_time);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return {
          decision_type: 'suggest_reschedule',
          explanation: opp.description,
          payload: {
            task_ids: flexibleTasks.map(t => t.id),
            suggested_date: tomorrow.toISOString(),
            reason: opp.potential_benefit,
          },
          confidence: 0.75,
          priority: 'normal',
        };
      }
      return null;
    
    case 'break':
      // Find event with shortest gap after it
      const eventWithShortGap = context.events_today.find((event, i) => {
        if (i === context.events_today.length - 1) return false;
        const nextEvent = context.events_today[i + 1];
        const gap = (new Date(nextEvent.start_time).getTime() - new Date(event.end_time).getTime()) / 60000;
        return gap < 15;
      });
      
      if (eventWithShortGap) {
        return {
          decision_type: 'suggest_break',
          explanation: opp.description,
          payload: {
            duration_minutes: 15,
            after_event_id: eventWithShortGap.id,
          },
          confidence: 0.7,
          priority: 'low',
        };
      }
      return null;
    
    default:
      return null;
  }
}

/**
 * Find next available time slot for focus block
 */
function findNextAvailableSlot(context: AutoGLMContext, durationMinutes: number): Date | null {
  const now = context.current_time;
  const workStart = context.preferences.working_hours_start || 9;
  const workEnd = context.preferences.working_hours_end || 17;
  
  // Start from next hour
  const searchStart = new Date(now);
  searchStart.setMinutes(0, 0, 0);
  searchStart.setHours(searchStart.getHours() + 1);
  
  // Check each hour slot
  for (let hour = searchStart.getHours(); hour < workEnd; hour++) {
    const slotStart = new Date(searchStart);
    slotStart.setHours(hour);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);
    
    // Check if this slot conflicts with any event
    const hasConflict = context.events_today.some(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      return (slotStart < eventEnd && slotEnd > eventStart);
    });
    
    if (!hasConflict && slotEnd.getHours() <= workEnd) {
      return slotStart;
    }
  }
  
  return null;
}

/**
 * Log decision for audit trail
 */
export function logDecision(decision: Decision, userId: string): void {
  console.log('[AutoGLM Decision]', {
    timestamp: new Date().toISOString(),
    user_id: userId,
    type: decision.decision_type,
    confidence: decision.confidence,
    priority: decision.priority,
    explanation: decision.explanation,
  });
}
