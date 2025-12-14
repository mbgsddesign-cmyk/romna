
export interface DecisionResult {
    title: string;
    reason: string;
    type: 'plan' | 'task' | 'empty';
    priority: number; // 0-100
    originalItem: any;
}


export interface ParsedIntent {
    intent: "task" | "reminder" | "email" | "whatsapp" | "note" | "clarification" | "unknown";
    action: "do" | "schedule" | "send";
    time?: string | null;
    target?: string | null;
    content: string;
    confidence: number;
}

export interface ExecutionResult {
    priority: "critical" | "urgent" | "focus" | "flow";
    execution_type: "immediate" | "scheduled" | "needs_approval";
    reason: string;
}

export class DecisionEngine {
    /**
     * ROMNA Decision Logic - Priority Order:
     * 1. Pending Approvals (NOT snoozed, NOT stale >24h)
     * 2. Overdue Tasks
     * 3. Stale Approvals (>24h old - surfaced after overdue)
     * 4. High Priority Tasks Due Today
     * 5. Any Task Due Today
     * 6. Empty State
     * 
     * Philosophy: One decision at a time. Never block forever.
     */
    static decide(tasks: any[], plans: any[]): DecisionResult {
        const now = new Date();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        // Filter plans: NOT snoozed (skip_until expired or not set)
        const activePlans = plans.filter(p =>
            p.status === 'waiting_approval' &&
            (!p.skip_until || new Date(p.skip_until) < now)
        );

        // Separate fresh vs stale approvals
        const freshApprovals = activePlans.filter(p =>
            (now.getTime() - new Date(p.created_at).getTime()) < TWENTY_FOUR_HOURS
        );
        const staleApprovals = activePlans.filter(p =>
            (now.getTime() - new Date(p.created_at).getTime()) >= TWENTY_FOUR_HOURS
        );

        // 1. Fresh Approvals (< 24h old) - Highest Priority
        if (freshApprovals.length > 0) {
            const top = freshApprovals.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];
            return {
                title: top.payload?.title || top.payload?.subject || 'Action Required',
                reason: "This needs your approval before proceeding.",
                type: 'plan',
                priority: 100,
                originalItem: top
            };
        }

        // 2. Overdue Tasks (surfaced BEFORE stale approvals)
        const overdue = tasks.filter(t =>
            t.due_date && new Date(t.due_date) < now && t.status !== 'done'
        );
        if (overdue.length > 0) {
            const top = overdue.sort((a, b) =>
                new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
            )[0];
            return {
                title: top.title,
                reason: "This is overdue. Clear it to maintain momentum.",
                type: 'task',
                priority: 90,
                originalItem: top
            };
        }

        // 3. Stale Approvals (>24h old) - Show after overdue cleared
        if (staleApprovals.length > 0) {
            const top = staleApprovals.sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )[0]; // Oldest first
            return {
                title: top.payload?.title || top.payload?.subject || 'Stale Action',
                reason: "This has been waiting for over 24 hours. Approve or dismiss.",
                type: 'plan',
                priority: 80,
                originalItem: top
            };
        }

        // 4. Focus: High Priority Due Today
        const today = now.toISOString().split('T')[0];
        const todayHigh = tasks.filter(t =>
            t.due_date &&
            t.due_date.startsWith(today) &&
            (t.priority === 'high' || t.priority === 'urgent') &&
            t.status !== 'done'
        );

        if (todayHigh.length > 0) {
            const top = todayHigh[0];
            return {
                title: top.title,
                reason: "High priority for today.",
                type: 'task',
                priority: 80,
                originalItem: top
            };
        }

        // 5. Flow: Any Task Due Today
        const todayAny = tasks.filter(t =>
            t.due_date &&
            t.due_date.startsWith(today) &&
            t.status !== 'done'
        );
        if (todayAny.length > 0) {
            const top = todayAny[0];
            return {
                title: top.title,
                reason: "Scheduled for today.",
                type: 'task',
                priority: 60,
                originalItem: top
            };
        }

        // 6. Empty State
        return {
            title: "All Caught Up",
            reason: "Nothing urgent right now.",
            type: 'empty',
            priority: 0,
            originalItem: null
        };
    }

    static evaluate(input: ParsedIntent): ExecutionResult {
        // Rule 0: Clarification / Low Confidence (< 0.6) -> Needs Approval (Needs Info)
        if (input.intent === 'clarification' || input.intent === 'unknown' || input.confidence < 0.6) {
            return {
                priority: 'critical',
                execution_type: 'needs_approval',
                reason: 'needs clarification'
            };
        }

        // Rule 1: High Confidence (>= 0.9) -> Proceed to Execution Logic
        // Rule 2: Medium Confidence (0.6 - 0.89) -> FORCE Needs Approval (Inbox Safety)
        if (input.confidence < 0.9) {
            return {
                priority: 'critical',
                execution_type: 'needs_approval',
                reason: 'Confidence check (Safe Mode)'
            };
        }

        // --- High Confidence Zone (>= 0.9) ---

        // Rule 3: "Do it now" -> Immediate
        if (input.action === 'do' && input.intent === 'task') {
            return {
                priority: 'flow',
                execution_type: 'immediate',
                reason: 'User commanded immediate execution.'
            };
        }

        // Rule 4: Schedule -> Scheduled
        if (input.action === 'schedule' || input.time) {
            return {
                priority: 'focus',
                execution_type: 'scheduled',
                reason: `Scheduled for ${input.time || 'later'}`
            };
        }

        // Rule 5: Risky Actions (Email/Whatsapp) -> ALWAYS Needs Approval (regardless of confidence, unless V2 Auto-Exec handles it)
        // Actually, V2 Auto-Exec is handled in VoicePage. Here we define default "type".
        // V2 prompt says: "Auto-execute ONLY when confidence >= 0.9 + safe intent".
        // Risky intents MUST be 'needs_approval' here so VoicePage defaults to approval.
        if (input.intent === 'email' || input.intent === 'whatsapp' || input.action === 'send') {
            return {
                priority: 'critical',
                execution_type: 'needs_approval',
                reason: 'External actions require confirmation.'
            };
        }

        // Default Fallback
        return {
            priority: 'flow',
            execution_type: 'immediate',
            reason: 'captured as task'
        };
    }
}
