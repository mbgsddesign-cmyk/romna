
export interface DecisionItem {
    id: string;
    title: string;
    reason: string;
    type: 'plan' | 'task';
    priority: number; // 0-100
    originalItem: any;
}

export interface DecisionResult {
    primary: DecisionItem | null;
    secondary: DecisionItem[];
    inbox: {
        count: number;
        items: DecisionItem[];
        hasZombies: boolean;
        hasStale: boolean;
    };
    // technical failure only, or blocked by system issues
    state: 'clear' | 'focused' | 'overloaded' | 'blocked';
    debug?: string[];
}

export interface ParsedIntent {
    intent: "task" | "reminder" | "email" | "whatsapp" | "note" | "clarification" | "unknown" | "confirm" | "cancel";
    action: "do" | "schedule" | "send";
    time?: string | null;
    target?: string | null;
    content: string;
    confidence: number;
    language?: 'en' | 'ar';
}

export interface ExecutionResult {
    priority: "critical" | "urgent" | "focus" | "flow";
    execution_type: "immediate" | "scheduled" | "needs_approval";
    reason: string;
}

export class DecisionEngine {
    /**
     * ROMNA Decision Logic V2 (Non-Blocking Architect)
     * 
     * Core Philosophy: "Information flows; it does not block."
     */
    static decide(tasks: any[], plans: any[]): DecisionResult {
        const now = new Date();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        const debugLog: string[] = [];

        // --- 1. Filter Zombies & Snoozed (Global Filter) ---
        let hasZombies = false;
        let hasStale = false;

        const validPlans = plans.filter(p => {
            // Only care about waiting_approval plans for this filter
            if (p.status !== 'waiting_approval') return false; // Ignore non-inbox plans in this stream

            // Check Payload
            const payload = p.payload || {};
            const title = payload.title || payload.subject;

            // Zombie Rule A: No Title
            if (!title || title.trim().length === 0) {
                debugLog.push(`Dropped Zombie [${p.id}]: Empty Title`);
                hasZombies = true;
                return false;
            }

            // Zombie Rule B: Voice Garbage (Low Confidence)
            // Assuming p.payload.confidence is stored if available
            if (p.source === 'voice' && payload.confidence && payload.confidence < 0.6) {
                debugLog.push(`Dropped Zombie [${p.id}]: Low Confidence`);
                hasZombies = true;
                return false;
            }

            // Zombie Rule C: "Unknown" Intent
            if (p.intent_type === 'unknown' || p.intent_type === 'clarification') {
                debugLog.push(`Dropped Zombie [${p.id}]: Bad Intent`);
                hasZombies = true;
                return false;
            }

            // Snooze / Ignore Rules
            // ignored_at exists? -> Exclude
            if (p.ignored_at) return false;

            // skip_until > now? -> Exclude
            if (p.skip_until && new Date(p.skip_until) > now) return false;

            return true;
        });

        // --- 2. Inbox Items (Sidecar) ---
        // Stale Logic: > 24h old
        const inboxItems: DecisionItem[] = validPlans.map(p => {
            const age = now.getTime() - new Date(p.created_at).getTime();
            const isStale = age >= TWENTY_FOUR_HOURS;
            if (isStale) hasStale = true;

            return {
                id: p.id,
                title: p.payload?.title || p.payload?.subject || "Review Item",
                reason: isStale ? "Stale Item (>24h)" : "Needs Approval",
                type: 'plan',
                priority: isStale ? 20 : 50, // Stale items lower priority in inbox listing
                originalItem: { ...p, isStale }
            };
        }).sort((a, b) => b.priority - a.priority); // Sort inbox by priority

        // --- 3. Primary Tasks (The Real Work) ---
        let primary: DecisionItem | null = null;
        let secondary: DecisionItem[] = [];

        // 3.1 Overdue (CRITICAL) - Priority 1
        const overdue = tasks.filter(t =>
            t.due_date && new Date(t.due_date) < now && t.status !== 'done'
        ).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

        if (overdue.length > 0) {
            primary = {
                id: overdue[0].id,
                title: overdue[0].title,
                reason: "Overdue",
                type: 'task',
                priority: 100,
                originalItem: overdue[0]
            };
            // Remaining overdue go to secondary
            secondary = overdue.slice(1).map(t => ({
                id: t.id,
                title: t.title,
                reason: "Overdue",
                type: 'task',
                priority: 95,
                originalItem: t
            }));
        }

        // 3.2 High Priority Today - Priority 2
        // Only if no primary yet
        const todayStr = now.toISOString().split('T')[0];
        const todayTasks = tasks.filter(t =>
            t.due_date?.startsWith(todayStr) && t.status !== 'done'
        );

        if (!primary) {
            const todayHigh = todayTasks.filter(t => t.priority === 'high' || t.priority === 'urgent')
                .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

            if (todayHigh.length > 0) {
                primary = {
                    id: todayHigh[0].id,
                    title: todayHigh[0].title,
                    reason: "High Priority",
                    type: 'task',
                    priority: 80,
                    originalItem: todayHigh[0]
                };
                // Remaining high go to secondary
                const remainingHigh = todayHigh.slice(1).map(t => ({
                    id: t.id,
                    title: t.title,
                    reason: "High Priority",
                    type: 'task',
                    priority: 75,
                    originalItem: t
                }));
                secondary = [...secondary, ...remainingHigh];
            }
        }

        // 3.3 Normal Tasks Today - Priority 3
        if (!primary) {
            const todayNormal = todayTasks.filter(t => t.priority !== 'high' && t.priority !== 'urgent')
                .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

            if (todayNormal.length > 0) {
                primary = {
                    id: todayNormal[0].id,
                    title: todayNormal[0].title,
                    reason: "Scheduled",
                    type: 'task',
                    priority: 60,
                    originalItem: todayNormal[0]
                };
                // Remaining normal go to secondary
                const remainingNormal = todayNormal.slice(1).map(t => ({
                    id: t.id,
                    title: t.title,
                    reason: "Scheduled",
                    type: 'task',
                    priority: 55,
                    originalItem: t
                }));
                secondary = [...secondary, ...remainingNormal];
            }
        } else {
            // If primary was high priority, add normal tasks to secondary
            const todayNormal = todayTasks.filter(t => t.priority !== 'high' && t.priority !== 'urgent');
            const normalSecondary = todayNormal.map(t => ({
                id: t.id,
                title: t.title,
                reason: "Scheduled",
                type: 'task',
                priority: 55,
                originalItem: t
            }));
            secondary = [...secondary, ...normalSecondary];
        }

        // --- 4. Determine State ---
        let currentState: 'clear' | 'focused' | 'overloaded' | 'blocked' = 'clear';

        if (overdue.length > 2 || secondary.length > 4) {
            currentState = 'overloaded';
        } else if (primary) {
            currentState = 'focused';
        } else {
            currentState = 'clear';
        }
        // 'blocked' is reserved for technical failure, not set here (logic succeeds)

        return {
            primary,
            secondary,
            inbox: {
                count: inboxItems.length,
                items: inboxItems,
                hasZombies,
                hasStale
            },
            state: currentState,
            debug: debugLog
        };
    }

    static evaluate(input: ParsedIntent): ExecutionResult {
        // [V7 FIX] Raised Confidence Floor
        if (input.confidence < 0.6) {
            return {
                priority: 'critical',
                execution_type: 'needs_approval',
                reason: 'Low confidence'
            };
        }

        // Rule 0: Clarification / Unknown
        if (input.intent === 'clarification' || input.intent === 'unknown') {
            return {
                priority: 'critical',
                execution_type: 'needs_approval',
                reason: 'Needs clarification'
            };
        }

        // Rule 1: High Confidence (>= 0.9) -> Auto-Execute Candidate
        if (input.confidence >= 0.9) {
            if (input.action === 'do' && input.intent === 'task') {
                return { priority: 'flow', execution_type: 'immediate', reason: 'Immediate' };
            }
            if (input.action === 'schedule' || input.time) {
                return { priority: 'focus', execution_type: 'scheduled', reason: 'Scheduled' };
            }
        }

        // Rule 2: Medium Confidence (0.6 - 0.89) -> Fallback Logic
        // V7 Change: If safe task, default to 'scheduled' (Pending) rather than 'needs_approval' (Inbox)
        if (input.intent === 'task' || input.intent === 'reminder') {
            return {
                priority: 'flow',
                execution_type: 'scheduled',
                reason: 'Captured as pending task'
            };
        }

        // Rule 3: Risky Actions -> Inbox
        return {
            priority: 'critical',
            execution_type: 'needs_approval',
            reason: 'Requires confirmation'
        };
    }
}
