/**
 * ROMNA AI Workflow Engine - Phase 2
 * 
 * Rule-based deterministic intelligence for task workflow management.
 * No LLM calls, pure logic-based decision making.
 */

export type SourceIntent = 'task' | 'reminder' | 'event';
export type AIPriority = 'low' | 'medium' | 'high';
export type EnergyCost = 'low' | 'medium' | 'high';
export type TimeFlexibility = 'fixed' | 'semi' | 'flexible';
export type DeadlineConfidence = 'strong' | 'weak' | 'inferred';
export type WorkflowState = 'inbox' | 'planned' | 'suggested' | 'auto_ready' | 'completed';

export interface TaskWithWorkflow {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: string;
  status: string;
  source?: string;
  source_intent?: SourceIntent;
  ai_priority?: AIPriority;
  energy_cost?: EnergyCost;
  time_flexibility?: TimeFlexibility;
  deadline_confidence?: DeadlineConfidence;
  workflow_state?: WorkflowState;
  ai_explanation?: string;
  estimated_duration?: number;
  created_at: string;
}

export interface WorkflowDecision {
  workflow_state: WorkflowState;
  ai_priority: AIPriority;
  energy_cost: EnergyCost;
  time_flexibility: TimeFlexibility;
  deadline_confidence: DeadlineConfidence;
  explanation: string;
  warnings: string[];
}

export interface DayLoadAnalysis {
  total_tasks: number;
  high_priority_count: number;
  estimated_total_minutes: number;
  available_work_hours: number;
  is_overloaded: boolean;
  load_percentage: number;
  explanation: string;
}

/**
 * Compute comprehensive workflow decision for a task
 */
export function computeWorkflowDecision(task: TaskWithWorkflow, context: {
  allTasks: TaskWithWorkflow[];
  events?: any[];
  currentTime?: Date;
}): WorkflowDecision {
  const now = context.currentTime || new Date();
  const warnings: string[] = [];
  
  // Step 1: Infer source intent if not set
  const sourceIntent = task.source_intent || inferSourceIntent(task);
  
  // Step 2: Calculate AI priority (independent of user priority)
  const aiPriority = calculateAIPriority(task, now, warnings);
  
  // Step 3: Estimate energy cost
  const energyCost = estimateEnergyCost(task);
  
  // Step 4: Determine time flexibility
  const timeFlexibility = determineTimeFlexibility(task, now);
  
  // Step 5: Assess deadline confidence
  const deadlineConfidence = assessDeadlineConfidence(task);
  
  // Step 6: Determine workflow state
  const workflowState = determineWorkflowState(
    task, 
    aiPriority, 
    timeFlexibility, 
    deadlineConfidence, 
    now,
    context.allTasks,
    warnings
  );
  
  // Step 7: Generate human-readable explanation
  const explanation = generateExplanation(
    workflowState, 
    aiPriority, 
    timeFlexibility,
    deadlineConfidence,
    task,
    now
  );
  
  return {
    workflow_state: workflowState,
    ai_priority: aiPriority,
    energy_cost: energyCost,
    time_flexibility: timeFlexibility,
    deadline_confidence: deadlineConfidence,
    explanation,
    warnings,
  };
}

/**
 * Infer task intent from title, description, and metadata
 */
function inferSourceIntent(task: TaskWithWorkflow): SourceIntent {
  const text = `${task.title} ${task.description || ''}`.toLowerCase();
  
  // Reminder keywords
  if (text.match(/remind|don't forget|remember|note to self/)) {
    return 'reminder';
  }
  
  // Event-derived keywords
  if (text.match(/meeting|call|appointment|session|event/)) {
    return 'event';
  }
  
  return 'task';
}

/**
 * Calculate AI-driven priority (distinct from user priority)
 */
function calculateAIPriority(
  task: TaskWithWorkflow, 
  now: Date, 
  warnings: string[]
): AIPriority {
  let score = 0;
  
  // Factor 1: Due date proximity (40 points max)
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDue < 0) {
      score += 40;
      warnings.push('Task is overdue');
    } else if (hoursUntilDue <= 2) {
      score += 35;
      warnings.push('Due within 2 hours');
    } else if (hoursUntilDue <= 6) {
      score += 25;
    } else if (hoursUntilDue <= 24) {
      score += 15;
    } else if (hoursUntilDue <= 72) {
      score += 5;
    }
  } else {
    warnings.push('No deadline set');
  }
  
  // Factor 2: User priority (30 points max)
  if (task.priority === 'high' || task.priority === 'urgent') {
    score += 30;
  } else if (task.priority === 'medium') {
    score += 15;
  } else {
    score += 5;
  }
  
  // Factor 3: Age of task (20 points max - older tasks get higher priority)
  const taskAge = (now.getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (taskAge > 7) {
    score += 20;
    warnings.push('Task has been pending for over a week');
  } else if (taskAge > 3) {
    score += 10;
  }
  
  // Factor 4: Source intent (10 points max)
  if (task.source_intent === 'event') {
    score += 10;
  } else if (task.source_intent === 'reminder') {
    score += 5;
  }
  
  // Convert score to priority level
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

/**
 * Estimate energy/cognitive cost of a task
 */
function estimateEnergyCost(task: TaskWithWorkflow): EnergyCost {
  const text = `${task.title} ${task.description || ''}`.toLowerCase();
  
  // High energy keywords
  const highEnergyKeywords = [
    'design', 'plan', 'strategy', 'create', 'develop', 'write', 
    'analyze', 'research', 'review', 'report', 'presentation'
  ];
  
  // Low energy keywords
  const lowEnergyKeywords = [
    'call', 'email', 'reply', 'check', 'buy', 'send', 'pay',
    'book', 'schedule', 'confirm', 'remind'
  ];
  
  const hasHighEnergy = highEnergyKeywords.some(keyword => text.includes(keyword));
  const hasLowEnergy = lowEnergyKeywords.some(keyword => text.includes(keyword));
  
  if (hasHighEnergy) return 'high';
  if (hasLowEnergy) return 'low';
  
  // Default based on estimated duration
  if (task.estimated_duration) {
    if (task.estimated_duration > 120) return 'high';
    if (task.estimated_duration < 30) return 'low';
  }
  
  return 'medium';
}

/**
 * Determine time flexibility of a task
 */
function determineTimeFlexibility(task: TaskWithWorkflow, now: Date): TimeFlexibility {
  // Fixed: Has specific due date/time, event-derived, or urgent
  if (task.source_intent === 'event') return 'fixed';
  
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Less than 24 hours = fixed
    if (hoursUntilDue < 24) return 'fixed';
    
    // 1-3 days = semi-flexible
    if (hoursUntilDue < 72) return 'semi';
  }
  
  // No due date or far future = flexible
  return 'flexible';
}

/**
 * Assess confidence in the deadline
 */
function assessDeadlineConfidence(task: TaskWithWorkflow): DeadlineConfidence {
  // Strong: Has exact due date/time from event or user explicitly set
  if (task.source_intent === 'event' && task.due_date) {
    return 'strong';
  }
  
  // Strong: User manually set a specific date
  if (task.source === 'manual' && task.due_date) {
    return 'strong';
  }
  
  // Weak: Voice/AI inferred with due date
  if ((task.source === 'voice' || task.source === 'ai') && task.due_date) {
    return 'weak';
  }
  
  // Inferred: No due date, system will suggest one
  return 'inferred';
}

/**
 * Determine workflow state based on all factors
 */
function determineWorkflowState(
  task: TaskWithWorkflow,
  aiPriority: AIPriority,
  timeFlexibility: TimeFlexibility,
  deadlineConfidence: DeadlineConfidence,
  now: Date,
  allTasks: TaskWithWorkflow[],
  warnings: string[]
): WorkflowState {
  // Completed tasks stay completed
  if (task.status === 'done' || task.status === 'completed') {
    return 'completed';
  }
  
  // New tasks with no processing start in inbox
  if (!task.workflow_state || task.workflow_state === 'inbox') {
    // Auto-promote high priority tasks with strong deadlines
    if (aiPriority === 'high' && deadlineConfidence === 'strong') {
      return 'planned';
    }
    
    // Keep in inbox if needs user attention
    if (deadlineConfidence === 'inferred' || !task.due_date) {
      return 'inbox';
    }
  }
  
  // Tasks with due dates and medium+ priority move to planned
  if (task.due_date && aiPriority !== 'low' && deadlineConfidence !== 'inferred') {
    // Check for overload
    const dayLoad = analyzeDayLoad(task.due_date, allTasks);
    if (dayLoad.is_overloaded) {
      warnings.push(`${task.due_date.split('T')[0]} is overloaded (${Math.round(dayLoad.load_percentage)}% capacity)`);
      return 'suggested'; // AI suggests moving it
    }
    
    return 'planned';
  }
  
  // Fixed timeline tasks that are ready for automation
  if (timeFlexibility === 'fixed' && aiPriority === 'high') {
    return 'auto_ready';
  }
  
  // Everything else gets AI suggestion
  return 'suggested';
}

/**
 * Analyze load for a specific day
 */
function analyzeDayLoad(targetDate: string, allTasks: TaskWithWorkflow[]): DayLoadAnalysis {
  const date = new Date(targetDate).toISOString().split('T')[0];
  
  const tasksOnDay = allTasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false;
    const taskDate = new Date(t.due_date).toISOString().split('T')[0];
    return taskDate === date;
  });
  
  const highPriorityCount = tasksOnDay.filter(t => 
    t.ai_priority === 'high' || t.priority === 'high'
  ).length;
  
  // Estimate total minutes (default 30 min per task if not specified)
  const estimatedTotalMinutes = tasksOnDay.reduce((sum, t) => 
    sum + (t.estimated_duration || 30), 0
  );
  
  // Available work hours: 8 hours = 480 minutes
  const availableMinutes = 480;
  const loadPercentage = (estimatedTotalMinutes / availableMinutes) * 100;
  const isOverloaded = loadPercentage > 80; // Over 80% capacity
  
  let explanation = '';
  if (isOverloaded) {
    explanation = `Day is overloaded with ${tasksOnDay.length} tasks (${Math.round(estimatedTotalMinutes / 60)}h scheduled, ${availableMinutes / 60}h available)`;
  } else if (loadPercentage > 50) {
    explanation = `Busy day with ${tasksOnDay.length} tasks (${Math.round(loadPercentage)}% capacity)`;
  } else {
    explanation = `Light day with ${tasksOnDay.length} tasks (${Math.round(loadPercentage)}% capacity)`;
  }
  
  return {
    total_tasks: tasksOnDay.length,
    high_priority_count: highPriorityCount,
    estimated_total_minutes: estimatedTotalMinutes,
    available_work_hours: availableMinutes / 60,
    is_overloaded: isOverloaded,
    load_percentage: loadPercentage,
    explanation,
  };
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(
  state: WorkflowState,
  priority: AIPriority,
  flexibility: TimeFlexibility,
  confidence: DeadlineConfidence,
  task: TaskWithWorkflow,
  now: Date
): string {
  const explanations: Record<WorkflowState, string> = {
    inbox: confidence === 'inferred' 
      ? "Needs your input - no deadline set yet"
      : "New task - review and schedule when ready",
    
    planned: task.due_date 
      ? `Scheduled for ${formatDate(task.due_date, now)}`
      : "Ready to be scheduled",
    
    suggested: task.due_date && analyzeDayLoad(task.due_date, [task]).is_overloaded
      ? "AI suggests moving to a less busy day"
      : priority === 'low'
        ? "Low priority - consider doing later"
        : "AI suggests tackling this soon",
    
    auto_ready: "Ready for automation - fixed time and high priority",
    
    completed: "Done ✓",
  };
  
  return explanations[state];
}

/**
 * Format date relative to now
 */
function formatDate(dateStr: string, now: Date): string {
  const date = new Date(dateStr);
  const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (diffHours < 0) return 'overdue';
  if (diffHours < 2) return 'within 2 hours';
  if (diffHours < 24) return 'today';
  if (diffHours < 48) return 'tomorrow';
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Detect conflicts with calendar events
 */
export function detectEventConflicts(
  tasks: TaskWithWorkflow[], 
  events: any[]
): { task: TaskWithWorkflow; event: any; suggestion: string }[] {
  const conflicts: { task: TaskWithWorkflow; event: any; suggestion: string }[] = [];
  
  for (const task of tasks) {
    if (!task.due_date || task.status === 'done') continue;
    
    const taskDate = new Date(task.due_date);
    
    for (const event of events) {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      
      // Check if task due time overlaps with event
      if (taskDate >= eventStart && taskDate <= eventEnd) {
        conflicts.push({
          task,
          event,
          suggestion: `Task "${task.title}" conflicts with "${event.title}" at ${eventStart.toLocaleTimeString()}`,
        });
      }
    }
  }
  
  return conflicts;
}

/**
 * Flag unrealistic deadlines
 */
export function flagUnrealisticDeadlines(
  tasks: TaskWithWorkflow[]
): { task: TaskWithWorkflow; reason: string }[] {
  const unrealistic: { task: TaskWithWorkflow; reason: string }[] = [];
  
  for (const task of tasks) {
    if (!task.due_date || task.status === 'done') continue;
    
    const now = new Date();
    const dueDate = new Date(task.due_date);
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Overdue by more than a week
    if (hoursUntilDue < -168) {
      unrealistic.push({
        task,
        reason: 'Task is overdue by more than a week',
      });
    }
    
    // Due in less than estimated duration
    if (task.estimated_duration && hoursUntilDue > 0 && hoursUntilDue * 60 < task.estimated_duration) {
      unrealistic.push({
        task,
        reason: `Not enough time - needs ${task.estimated_duration}min but only ${Math.round(hoursUntilDue * 60)}min available`,
      });
    }
    
    // Missing duration for high priority task
    if (!task.estimated_duration && (task.priority === 'high' || task.ai_priority === 'high')) {
      unrealistic.push({
        task,
        reason: 'High priority task missing time estimate',
      });
    }
  }
  
  return unrealistic;
}

/**
 * Group tasks by workflow state for display
 */
export function groupTasksByWorkflowState(tasks: TaskWithWorkflow[]): Record<WorkflowState, TaskWithWorkflow[]> {
  const groups: Record<WorkflowState, TaskWithWorkflow[]> = {
    inbox: [],
    planned: [],
    suggested: [],
    auto_ready: [],
    completed: [],
  };
  
  for (const task of tasks) {
    const state = task.workflow_state || 'inbox';
    groups[state].push(task);
  }
  
  return groups;
}
