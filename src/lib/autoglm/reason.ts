/**
 * AutoGLM Reasoning Layer
 * 
 * Applies deterministic rules to context → produces reasoning output
 * 
 * Rules:
 * - What's most important now?
 * - Are there conflicts?
 * - Is the user overloaded?
 * - What should be rescheduled/suggested?
 * 
 * NO LLM - pure logic
 */

import type { AutoGLMContext, Task, Event } from './context';

export interface Reasoning {
  summary: string;
  risks: Risk[];
  opportunities: Opportunity[];
  priorities: TaskPriority[];
  conflicts: Conflict[];
  recommendations: string[];
}

export interface Risk {
  type: 'overload' | 'conflict' | 'deadline' | 'unrealistic';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affected_entities: string[]; // task/event IDs
}

export interface Opportunity {
  type: 'reschedule' | 'delegate' | 'break' | 'focus_block';
  description: string;
  potential_benefit: string;
}

export interface TaskPriority {
  task_id: string;
  task_title: string;
  score: number; // 0-100
  reason: string;
}

export interface Conflict {
  type: 'time_overlap' | 'unrealistic_timeline' | 'travel_gap';
  description: string;
  entities: Array<{ id: string; title: string; type: 'task' | 'event' }>;
}

/**
 * Main reasoning function - applies all rules
 */
export function reason(context: AutoGLMContext): Reasoning {
  const risks = detectRisks(context);
  const conflicts = detectConflicts(context);
  const opportunities = findOpportunities(context);
  const priorities = rankTasks(context);
  const recommendations = generateRecommendations(context, risks, opportunities);
  
  const summary = buildSummary(context, risks, conflicts);
  
  return {
    summary,
    risks,
    opportunities,
    priorities,
    conflicts,
    recommendations,
  };
}

/**
 * Detect risks based on context
 */
function detectRisks(context: AutoGLMContext): Risk[] {
  const risks: Risk[] = [];
  
  // Overload risk
  if (context.is_overloaded) {
    risks.push({
      type: 'overload',
      severity: context.estimated_workload_minutes > context.available_time_minutes * 1.2 ? 'high' : 'medium',
      description: `You have ${Math.round(context.estimated_workload_minutes / 60)} hours of work but only ${Math.round(context.available_time_minutes / 60)} hours available today.`,
      affected_entities: context.tasks_today.map(t => t.id),
    });
  }
  
  // Overdue tasks
  if (context.tasks_overdue.length > 0) {
    risks.push({
      type: 'deadline',
      severity: context.tasks_overdue.length > 3 ? 'high' : 'medium',
      description: `${context.tasks_overdue.length} task(s) are overdue.`,
      affected_entities: context.tasks_overdue.map(t => t.id),
    });
  }
  
  // Too many tasks in inbox
  if (context.tasks_inbox.length > 10) {
    risks.push({
      type: 'unrealistic',
      severity: 'low',
      description: `${context.tasks_inbox.length} tasks in inbox need scheduling.`,
      affected_entities: context.tasks_inbox.slice(0, 5).map(t => t.id),
    });
  }
  
  return risks;
}

/**
 * Detect conflicts between tasks and events
 */
function detectConflicts(context: AutoGLMContext): Conflict[] {
  const conflicts: Conflict[] = [];
  
  // Check for time overlaps between events
  for (let i = 0; i < context.events_today.length - 1; i++) {
    const event1 = context.events_today[i];
    const event2 = context.events_today[i + 1];
    
    const end1 = new Date(event1.end_time);
    const start2 = new Date(event2.start_time);
    
    if (end1 > start2) {
      conflicts.push({
        type: 'time_overlap',
        description: `"${event1.title}" overlaps with "${event2.title}"`,
        entities: [
          { id: event1.id, title: event1.title, type: 'event' },
          { id: event2.id, title: event2.title, type: 'event' },
        ],
      });
    }
    
    // Check for travel gap (< 30 minutes between different locations)
    if (event1.location && event2.location && event1.location !== event2.location) {
      const gap = (start2.getTime() - end1.getTime()) / 60000;
      if (gap < 30) {
        conflicts.push({
          type: 'travel_gap',
          description: `Only ${Math.round(gap)} minutes to travel from "${event1.location}" to "${event2.location}"`,
          entities: [
            { id: event1.id, title: event1.title, type: 'event' },
            { id: event2.id, title: event2.title, type: 'event' },
          ],
        });
      }
    }
  }
  
  return conflicts;
}

/**
 * Find opportunities for optimization
 */
function findOpportunities(context: AutoGLMContext): Opportunity[] {
  const opportunities: Opportunity[] = [];
  
  // Suggest focus block if user has high-priority tasks
  const highPriorityCount = context.tasks_today.filter(t => 
    t.priority === 'high' || t.ai_priority === 'high'
  ).length;
  
  if (highPriorityCount >= 2 && context.events_today.length < 3) {
    opportunities.push({
      type: 'focus_block',
      description: 'Schedule a focus block for high-priority tasks',
      potential_benefit: `Complete ${highPriorityCount} important tasks without interruptions`,
    });
  }
  
  // Suggest rescheduling low-priority tasks if overloaded
  if (context.is_overloaded) {
    const lowPriorityTasks = context.tasks_today.filter(t => 
      t.time_flexibility === 'flexible' && (t.priority === 'low' || t.ai_priority === 'low')
    );
    
    if (lowPriorityTasks.length > 0) {
      opportunities.push({
        type: 'reschedule',
        description: `Move ${lowPriorityTasks.length} flexible task(s) to tomorrow`,
        potential_benefit: 'Reduce today\'s workload by ~' + Math.round(lowPriorityTasks.length * 30 / 60) + ' hours',
      });
    }
  }
  
  // Suggest break if user has back-to-back events
  if (context.events_today.length >= 3) {
    const hasBackToBack = context.events_today.some((event, i) => {
      if (i === 0) return false;
      const prevEnd = new Date(context.events_today[i - 1].end_time);
      const thisStart = new Date(event.start_time);
      return (thisStart.getTime() - prevEnd.getTime()) / 60000 < 15;
    });
    
    if (hasBackToBack) {
      opportunities.push({
        type: 'break',
        description: 'Schedule 15-minute breaks between meetings',
        potential_benefit: 'Avoid burnout and stay productive',
      });
    }
  }
  
  return opportunities;
}

/**
 * Rank tasks by priority score
 */
function rankTasks(context: AutoGLMContext): TaskPriority[] {
  const allActiveTasks = [
    ...context.tasks_today,
    ...context.tasks_overdue,
  ];
  
  return allActiveTasks.map(task => {
    let score = 50; // Base score
    
    // Overdue → +40
    if (context.tasks_overdue.some(t => t.id === task.id)) {
      score += 40;
    }
    
    // Due today → +30
    if (context.tasks_today.some(t => t.id === task.id)) {
      score += 30;
    }
    
    // High priority → +20
    if (task.priority === 'high' || task.ai_priority === 'high') {
      score += 20;
    }
    
    // Low flexibility → +10
    if (task.time_flexibility === 'fixed') {
      score += 10;
    }
    
    // Energy cost consideration
    if (task.energy_cost === 'low') {
      score += 5; // Quick wins
    }
    
    const reason = buildPriorityReason(task, context);
    
    return {
      task_id: task.id,
      task_title: task.title,
      score: Math.min(100, Math.max(0, score)),
      reason,
    };
  }).sort((a, b) => b.score - a.score);
}

function buildPriorityReason(task: Task, context: AutoGLMContext): string {
  const reasons: string[] = [];
  
  if (context.tasks_overdue.some(t => t.id === task.id)) {
    reasons.push('overdue');
  }
  if (context.tasks_today.some(t => t.id === task.id)) {
    reasons.push('due today');
  }
  if (task.priority === 'high' || task.ai_priority === 'high') {
    reasons.push('high priority');
  }
  if (task.time_flexibility === 'fixed') {
    reasons.push('deadline inflexible');
  }
  
  return reasons.length > 0 ? reasons.join(', ') : 'standard priority';
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(
  context: AutoGLMContext,
  risks: Risk[],
  opportunities: Opportunity[]
): string[] {
  const recommendations: string[] = [];
  
  // Address high-severity risks first
  const highRisks = risks.filter(r => r.severity === 'high');
  if (highRisks.length > 0) {
    for (const risk of highRisks) {
      if (risk.type === 'overload') {
        recommendations.push('🔴 Reduce today\'s workload - consider rescheduling low-priority tasks');
      } else if (risk.type === 'deadline') {
        recommendations.push('🔴 Focus on overdue tasks immediately');
      }
    }
  }
  
  // Suggest opportunities
  for (const opp of opportunities.slice(0, 2)) { // Top 2 opportunities
    if (opp.type === 'focus_block') {
      recommendations.push('💡 Block 90 minutes for focused work');
    } else if (opp.type === 'reschedule') {
      recommendations.push('💡 ' + opp.description);
    } else if (opp.type === 'break') {
      recommendations.push('💡 ' + opp.description);
    }
  }
  
  // Default recommendation if everything is fine
  if (recommendations.length === 0) {
    recommendations.push('✅ Your day looks manageable - stay focused on priorities');
  }
  
  return recommendations;
}

/**
 * Build natural language summary
 */
function buildSummary(context: AutoGLMContext, risks: Risk[], conflicts: Conflict[]): string {
  const parts: string[] = [];
  
  // Workload assessment
  if (context.is_overloaded) {
    parts.push(`You're overloaded today with ${context.total_tasks_today} tasks`);
  } else if (context.total_tasks_today > 0) {
    parts.push(`You have ${context.total_tasks_today} task(s) scheduled today`);
  } else {
    parts.push('Your day is relatively light');
  }
  
  // Risk summary
  const highRisks = risks.filter(r => r.severity === 'high').length;
  if (highRisks > 0) {
    parts.push(`${highRisks} critical issue(s) need attention`);
  }
  
  // Conflict summary
  if (conflicts.length > 0) {
    parts.push(`${conflicts.length} scheduling conflict(s) detected`);
  }
  
  return parts.join('. ') + '.';
}
