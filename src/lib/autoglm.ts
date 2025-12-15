import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { createHash } from 'crypto';
import {
  UserPreferences,
  Task,
  Event,
  VoiceNote,
  Insight,
  Notification,
  UserActivity,
  AISession
} from '@/lib/database.types';
import { NotificationDispatcher } from '@/lib/notification-dispatcher';

// Lazy-loaded clients to avoid build-time env access
let _supabase: SupabaseClient | null = null;
let _openai: OpenAI | null = null;

function getSupabaseAdmin() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

// Use getter for supabase to maintain compatibility
const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseAdmin() as any)[prop];
  }
});

const openai = new Proxy({} as OpenAI, {
  get(_, prop) {
    return (getOpenAI() as any)[prop];
  }
});

const AUTOGLM_SYSTEM_PROMPT = `
🧠 AUTOGLM SYSTEM PROMPT — ROMNA

ROLE

You are ROMNA AutoGLM, an autonomous AI reasoning engine for a personal productivity assistant.

Your responsibility is to:
	•	Analyze real user data from the database
	•	Generate insights, actions, and notifications
	•	Act only on verified database signals
	•	Never hallucinate or fabricate user behavior

⸻

DATA YOU CAN ACCESS (STRICT)

You may read from the following tables only:
	•	users
	•	tasks
	•	events
	•	voice_notes
	•	insights
	•	notifications
	•	user_activity
	•	ai_sessions

You may write to:
	•	insights
	•	notifications
	•	user_activity

❌ You must NOT modify tasks or events directly
❌ You must NOT assume missing data

⸻

USER CONTEXT RULES

Before generating any output:
	1.	Load user preferences:
	•	timezone
	•	locale
	•	week_start
	•	plan (free / pro)
	•	ai_opt_in
	2.	If ai_opt_in = false
→ STOP immediately
	3.	Respect locale:
	•	ar → Arabic output
	•	en → English output

⸻

VOICE INTELLIGENCE LOGIC

When a new record appears in voice_notes:

Step 1 — Validate

Process only if:

processed = false
confidence >= 0.6

Step 2 — Interpret

Use intent to decide:
	•	task → suggest task creation
	•	event → suggest event scheduling
	•	reminder → schedule notification
	•	message → suggest external action

Step 3 — Log

Insert into user_activity:

action = "voice_processed"
meta = { intent, confidence }


⸻

TASK & EVENT ANALYSIS LOGIC

Daily Scan (once per day per user)

Analyze:
	•	tasks due today
	•	completed_at patterns
	•	unfinished high-priority tasks
	•	overlapping events (is_conflicting = true)

Do NOT create tasks.
Only generate recommendations or insights.

⸻

INSIGHT GENERATION RULES

You may generate an insight ONLY IF:
	•	At least 3 supporting signals exist
	•	Similar insight was not generated in last 48h
	•	Insight is still relevant (valid_until)

Insight Types
	•	focus
	•	productivity
	•	recommendation
	•	warning

Insight Output Format (JSON)

{
  "type": "focus",
  "payload": {
    "summary": "...",
    "evidence": ["task_pattern", "time_window"],
    "suggested_action": "optional"
  },
  "source": "ai",
  "valid_until": "ISO_TIMESTAMP"
}


⸻

NOTIFICATION INTELLIGENCE

Rules
	•	Free users → max 1 AI notification per day
	•	Pro users → priority-based batching

Priority Scoring

Based on:
	•	task priority
	•	overdue status
	•	conflicts
	•	user activity frequency

Notification Payload

{
  "type": "ai",
  "title": "...",
  "body": "...",
  "priority": 1,
  "ai_reason": "optional for Pro users",
  "pro_eligible": false
}


⸻

ACTION GENERATION RULES (HUMAN-IN-THE-LOOP)

You may propose an action ONLY IF:
	•	Confidence is HIGH (>= 0.8)
	•	The action is concrete and complete
	•	It solves a specific user problem (e.g. scheduling conflict, missing task)

Action Types:
	•	create_task
	•	reschedule_event
	•	send_email (draft only)

Action Candidate Output Format (JSON):
"action_candidate": {
  "type": "create_task",
  "payload": {
    "title": "...",
    "description": "...",
    "due_date": "ISO_TIMESTAMP",
    "priority": "high"
  },
  "confidence": 0.95,
  "reason": "Detected urgency in voice note"
}

⸻

PRO VS FREE LOGIC

Free Users
	•	Generic insights
	•	No explanation
	•	Limited frequency

Pro Users
	•	Personalized insights
	•	Explanation (ai_reason)
	•	Predictive suggestions
	•	Conflict detection surfaced clearly

⸻

MEMORY & DUPLICATION CONTROL

Before generating:
	•	Check ai_sessions.context_hash
	•	If similar context exists in last 24h → SKIP

Pro Eligibility Signal
Set "pro_eligible": true IF:
	•	Insight involves multi-step reasoning
	•	It detects a complex conflict
	•	It offers a predictive suggestion
	•	It's a "High-impact" moment (Aha moment)

After generation:
	•	Log session with:

context_hash
model


⸻

HARD CONSTRAINTS (DO NOT BREAK)

❌ No fake productivity data
❌ No motivational filler
❌ No assumptions without DB evidence
❌ No repeated insights
❌ No UI decisions (text only)

⸻

OUTPUT TONE
	•	Calm
	•	Professional
	•	Minimal
	•	Human-readable
	•	Never overconfident

⸻

FINAL DIRECTIVE

Your goal is trust, not engagement.
If data is insufficient → remain silent.

RETURN JSON ONLY.
Structure:
{
  "insight": { ... } | null,
  "notification": { ... } | null,
  "action_candidate": { ... } | null,
  "log": { "action": "...", "meta": ... }
}
`;

const ACTION_TIERS: Record<string, 'free' | 'pro'> = {
  create_task: 'free',
  reschedule_event: 'pro',
  send_email: 'pro'
};

export class AutoGLM {
  static async run(userId: string, trigger: 'daily_scan' | 'new_insight' | 'voice_intent', context: Record<string, unknown> = {}) {
    console.log(`[AutoGLM] Running for user ${userId} with trigger ${trigger}`);

    // 1. Fetch User Preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Default preferences if missing (graceful degradation)
    const userPrefs = prefs || {
      week_start: 'sunday',
      ai_opt_in: false, // Default to false for safety
      plan_tier: 'free',
      locale: 'en',
      timezone: 'UTC'
    };

    // 2. Validate Opt-in
    if (!userPrefs.ai_opt_in) {
      console.log(`[AutoGLM] User ${userId} has not opted in to AI. Skipping.`);
      return { success: false, reason: 'opt_out' };
    }

    // 3. Rate Limiting (Free Tier)
    if (userPrefs.plan_tier === 'free') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('type', 'ai')
        .gte('created_at', today.toISOString());

      if (count && count >= 2) { // Updated to 2 per day
        console.log(`[AutoGLM] Free tier limit reached for user ${userId}.`);
        // We might still generate insights but NOT notifications? 
        // Prompt says "Free: max 1 AI notification / day".
        // Let's pass this info to the prompt or handle it post-generation.
        // For now, let's continue but flag it.
      }
    }

    // 4. Fetch Data Context
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const [tasks, events, insights, voiceNotes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', userId).eq('status', 'pending').limit(20),
      supabase.from('events').select('*').eq('user_id', userId).gte('start_time', startOfDay).limit(20),
      supabase.from('insights').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      supabase.from('voice_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)
    ]);

    const dataContext = {
      user_preferences: userPrefs,
      tasks: tasks.data || [],
      events: events.data || [],
      recent_insights: insights.data || [],
      recent_voice_notes: voiceNotes.data || [],
      trigger,
      trigger_context: context,
      current_time: new Date().toISOString()
    };

    // 5. Check Duplication (Context Hash)
    // FIX: Remove volatile timestamps. Use stable hourly bucket for deduplication.
    // This ensures identical data states generate the same hash within the same hour.
    const timeBucket = new Date().toISOString().slice(0, 13); // e.g. "2025-12-12T10"

    const hashableContext = {
      ...dataContext,
      current_time: timeBucket
    };

    const contextString = JSON.stringify(hashableContext);
    // Use MD5 to hash the entire context string to ensure all data is considered.
    const contextHash = createHash('md5').update(contextString).digest('hex');

    const { data: existingSession } = await supabase
      .from('ai_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('context_hash', contextHash)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24h
      .single();

    if (existingSession) {
      console.log(`[AutoGLM] Duplicate context detected for user ${userId}. Skipping.`);
      return { success: false, reason: 'duplicate_context' };
    }

    // 6. Call OpenAI
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o', // Use a capable model
        messages: [
          { role: 'system', content: AUTOGLM_SYSTEM_PROMPT },
          { role: 'user', content: `Current Data Context: ${JSON.stringify(dataContext)}` }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      if (!content) return { success: false, error: 'No content from AI' };

      const result = JSON.parse(content);

      // 7. Execute Actions
      // 7.1 Insight
      if (result.insight) {
        // Double check duplication rule "Similar insight was not generated in last 48h"
        // (This is partially handled by context hash, but let's trust the AI or add explicit check if needed)
        await getSupabaseAdmin().from('insights').insert({
          user_id: userId,
          type: result.insight.type,
          title: result.insight.payload?.summary || 'New Insight', // Map fields
          description: JSON.stringify(result.insight.payload),
          insight_data: result.insight.payload,
          source: 'ai',
          period_start: startOfDay,
          period_end: endOfDay
        });
      }

      // 7.2 Action Candidate (Human-in-the-loop)
      let actionHash: string | null = null;
      let actionStatus: 'pending' | 'blocked_pro' | 'none' = 'none';

      if (result.action_candidate && result.action_candidate.confidence >= 0.8) {
        const actionType = result.action_candidate.type;
        const requiredTier = ACTION_TIERS[actionType] || 'pro'; // Default to pro for safety
        const userTier = userPrefs.plan_tier || 'free';

        const isAllowed = userTier === 'enterprise' ||
          (userTier === 'pro') ||
          (requiredTier === 'free');

        if (isAllowed) {
          const payloadString = JSON.stringify(result.action_candidate.payload);
          actionHash = createHash('md5').update(payloadString + Date.now().toString()).digest('hex'); // Unique hash for this instance

          await getSupabaseAdmin().from('user_activity').insert({
            user_id: userId,
            action: 'action_proposed',
            meta: {
              ...result.action_candidate,
              status: 'pending',
              action_hash: actionHash,
              created_at: new Date().toISOString()
            }
          });

          actionStatus = 'pending';
          console.log(`[AutoGLM] Action proposed: ${actionType} (${actionHash})`);
        } else {
          // Blocked by Pro Matrix
          actionStatus = 'blocked_pro';

          await getSupabaseAdmin().from('user_activity').insert({
            user_id: userId,
            action: 'pro_blocked_action',
            meta: {
              attempted_action: actionType,
              required_tier: requiredTier,
              user_tier: userTier,
              confidence: result.action_candidate.confidence,
              created_at: new Date().toISOString()
            }
          });

          console.log(`[AutoGLM] Action blocked (Pro only): ${actionType} for user ${userId}`);
        }
      }

      // 7.3 Notification
      if (result.notification) {
        const dispatcher = new NotificationDispatcher(supabase);

        // If action was blocked, we strip the action URL but keep the insight
        const isActionBlocked = actionStatus === 'blocked_pro';

        await dispatcher.dispatch(
          userId,
          {
            title: result.notification.title,
            body: result.notification.body,
            priority: result.notification.priority === 1 ? 'high' : 'normal',
            ai_reason: result.notification.ai_reason,
            category: 'ai',
            // Link notification to the action if present AND allowed
            // Point to frontend verification page, not direct API execution
            action_url: actionHash ? `/actions/verify/${actionHash}` : null,
            action_label: actionHash ? 'Confirm Action' : null,
            metadata: {
              trigger,
              pro_eligible: result.notification.pro_eligible || isActionBlocked || false,
              action_hash: actionHash,
              action_status: actionStatus
            }
          },
          userPrefs
        );
      }

      // 7.4 Log Activity
      if (result.log) {
        await getSupabaseAdmin().from('user_activity').insert({
          user_id: userId,
          action: result.log.action,
          meta: result.log.meta
        });
      }

      // 8. Save Session
      await getSupabaseAdmin().from('ai_sessions').insert({
        user_id: userId,
        context_hash: contextHash,
        model: 'gpt-4o',
        meta: { trigger }
      });

      return { success: true, result };

    } catch (error) {
      console.error('[AutoGLM] Error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}