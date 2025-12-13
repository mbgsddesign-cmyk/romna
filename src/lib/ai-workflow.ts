export type AIState = 'actionable_now' | 'scheduled' | 'blocked' | 'low_priority' | 'overdue' | 'completed';
export type SmartAction = 'mark_done' | 'reschedule' | 'ask_romna' | 'snooze';

export interface TaskWithAI {
  id: string;
  title: string;
  due_date?: string;
  priority: string;
  status: string;
  source?: string;
  intent_type?: string;
  confidence?: number;
  transcript?: string;
  ai_state?: AIState;
  smart_action?: SmartAction;
  created_at: string;
}

/**
 * Compute AI state for a task based on time, priority, and context
 */
export function computeAIState(task: any): AIState {
  const now = new Date();
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  
  if (task.status === 'done') return 'completed';
  
  if (!dueDate) {
    // No due date - determine by priority and age
    if (task.priority === 'high') return 'actionable_now';
    return 'low_priority';
  }
  
  // Has due date
  if (dueDate < now) return 'overdue';
  
  const hoursDiff = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursDiff <= 2) return 'actionable_now';
  if (hoursDiff <= 24) return 'scheduled';
  
  return 'low_priority';
}

/**
 * Determine the smart action based on AI state
 */
export function computeSmartAction(task: any): SmartAction {
  const aiState = task.ai_state || computeAIState(task);
  
  switch (aiState) {
    case 'overdue':
      return 'reschedule';
    case 'actionable_now':
      return 'mark_done';
    case 'scheduled':
      return 'snooze';
    case 'low_priority':
      return 'ask_romna';
    case 'blocked':
      return 'ask_romna';
    default:
      return 'mark_done';
  }
}

/**
 * Filter tasks based on time and context awareness
 * Only show actionable tasks - hide low priority unless explicitly requested
 */
export function filterActionableTasks(tasks: any[]): any[] {
  return tasks.filter(task => {
    const aiState = task.ai_state || computeAIState(task);
    
    // Show: actionable_now, scheduled, overdue
    // Hide: low_priority, blocked (unless explicitly requested)
    return ['actionable_now', 'scheduled', 'overdue'].includes(aiState);
  });
}

/**
 * Check if a task should be shown now based on time of day and context
 */
export function shouldShowTaskNow(task: any): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Morning tasks (6am - 12pm)
  const isMorning = currentHour >= 6 && currentHour < 12;
  // Afternoon tasks (12pm - 6pm)
  const isAfternoon = currentHour >= 12 && currentHour < 18;
  // Evening tasks (6pm - 11pm)
  const isEvening = currentHour >= 18 && currentHour < 23;
  
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const dueHour = dueDate.getHours();
    
    // Match time of day
    if (isMorning && dueHour >= 6 && dueHour < 12) return true;
    if (isAfternoon && dueHour >= 12 && dueHour < 18) return true;
    if (isEvening && dueHour >= 18) return true;
    
    // Show overdue tasks always
    if (dueDate < now) return true;
    
    // Show tasks due within next 2 hours
    const hoursDiff = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursDiff <= 2 && hoursDiff >= 0) return true;
  }
  
  // High priority tasks always show
  if (task.priority === 'high') return true;
  
  return false;
}
