import { IntentResult } from './config';
import { StorageAdapter } from '@/lib/storage-adapter';
import { toast } from 'sonner';
import { Memory } from './memory';
import { ExecutionIntentType } from '@/lib/execution/types';

export async function executeIntent(intent: IntentResult, userId: string | null): Promise<void> {
    console.log("[Executor] Executing:", intent);

    // 1. Save to Memory
    if (intent.original_text) {
        const response = intent.ai_response || `Captured ${intent.intent}`;
        Memory.saveInteraction(intent.original_text, response);
    }

    if (!userId) {
        console.warn("[Executor] No User ID provided (Local mode?)");
        // For local dev, we might still want to proceed if Supabase is mocked or strict mode is off
    }

    try {
        // MAPPING: Intent -> ExecutionIntentType
        let intentType: ExecutionIntentType = 'task';
        let requiresApproval = true; // Default to Inbox
        let executionStatus: 'waiting_approval' | 'pending' | 'scheduled' = 'waiting_approval';

        switch (intent.intent) {
            case 'reminder':
                intentType = 'reminder';
                break;
            case 'task':
                intentType = 'task';
                break;
            case 'email':
                intentType = 'email';
                break;
            case 'whatsapp':
                intentType = 'whatsapp';
                break;
            case 'note':
                intentType = 'task'; // Map note to task
                break;
            case 'unknown':
            case 'clarification':
                // Should have been caught by Decision Engine or UI, but if here:
                toast.error(intent.language === 'ar' ? "لم أفهم ذلك" : "I didn't capture that.");
                return;
        }

        // Logic check: If scheduled and high confidence, maybe auto-schedule?
        // User said: "Inbox Creation... ensure... create execution_plan with status pending_approval OR scheduled"
        // We will default to 'waiting_approval' to ensure it hits the Inbox unless V2 logic (handled in VoicePage) overrides.
        // But this Executor function seems to be the "Default" handler.

        // V2 Auto-Execution Logic is partially in VoicePage, but we should support it here if confidence is high and intent is safe.
        // Use requirement: "Do not change Business Logic of V2 Auto Execution".
        // VoicePage calls storageAdapter directly for V2. This executeIntent might be a fallback or for text input?
        // Let's assume this handles general execution.

        if (intent.action === 'schedule' && intent.datetime) {
            // It has a specific time.
            // If confidence is visibly high, strictly speaking V2 might auto-schedule. 
            // BUT complying with "Inbox Creation" request: ensure it ends up in a valid state.
            // 'waiting_approval' is safest for Inbox visibility.
        }

        const payload: any = {
            title: intent.title,
            description: intent.original_text,
            target: intent.target,
            // If note
            is_note: intent.intent === 'note'
        };

        const plan = {
            source: 'voice', // or text
            intent_type: intentType,
            status: executionStatus,
            requires_approval: requiresApproval,
            scheduled_for: intent.datetime || undefined, // undefined relies on DB default or null
            payload: payload
        };

        const result = await StorageAdapter.createPlan(userId || 'local-user', true, plan);

        if (result) {
            // Success Feedback
            const msg = intent.language === 'ar' ? "تم الحفظ في الصندوق الوارد" : "Saved to Inbox";
            toast.success(msg);
        } else {
            // If result is null (local mode without mock), show warning but don't crash
            console.warn("[Executor] Plan created but no result returned (Local mode?)");
            toast.success("Captured (Local)");
        }

    } catch (error) {
        console.error("[Executor] Failed:", error);
        toast.error("Something went wrong executing that.");
    }
}
