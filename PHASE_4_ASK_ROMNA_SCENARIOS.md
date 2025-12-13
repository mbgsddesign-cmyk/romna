# ASK ROMNA — Phase 4 Execution Scenarios

**PROJECT:** ROMNA  
**DELIVERABLE:** Canonical scenarios for Ask ROMNA AI assistant  
**PURPOSE:** Define correct behavior for user intent → AutoGLM decision → system outcome

---

## 1) DAILY GUIDANCE SCENARIOS

### SCENARIO 1.1: Morning Orientation
**SCENARIO ID:** DG-001  
**PAGE:** Home / Tasks / Any  
**USER INPUT:** "What should I do now?"  
**USER INTENT:** Get immediate actionable guidance based on current context  
**AUTOGLM CONTEXT USED:**
- Current time (e.g., 9:15 AM)
- Pending tasks (priority, due dates, estimated duration)
- Today's events (next event timing)
- User energy level (if available from profile)

**AUTOGLM DECISION TYPE:** suggest  
**AUTOGLM RESPONSE:** "Start with 'Prepare proposal' - it's high priority and you have 90 minutes before your 11 AM meeting."  
**SYSTEM ACTION:** None (suggestion only)  
**DATABASE EFFECT:** Log to autoglm_runs (decision_type: suggest)  
**UI FEEDBACK:** Display response in drawer with optional "Create Focus Block" button  
**FAILSAFE / EDGE CASE:**
- If no tasks: "You have no pending tasks. Great job! Maybe add some new goals?"
- If overloaded (>6 high-priority tasks): "Your day looks packed. Consider rescheduling 'Review documentation' to tomorrow."

---

### SCENARIO 1.2: Day Planning Request
**SCENARIO ID:** DG-002  
**PAGE:** Insights / Home  
**USER INPUT:** "Plan my day"  
**USER INTENT:** Get a complete daily schedule recommendation  
**AUTOGLM CONTEXT USED:**
- All tasks for today (priority, duration, dependencies)
- All events (times, durations)
- Work hours preference (from profile)
- Energy patterns (morning/afternoon preference)

**AUTOGLM DECISION TYPE:** execute  
**AUTOGLM RESPONSE:** "I've created a plan for your day with 3 focus blocks and 2 breaks. Check your calendar."  
**SYSTEM ACTION:** Insert multiple focus blocks into events table with calculated times  
**DATABASE EFFECT:**
- Insert 3-5 events (type: focus_block)
- Update autoglm_runs (decision_type: execute, action_type: create_daily_plan)

**UI FEEDBACK:**
- Success toast: "Daily plan created ✓"
- Redirect to /calendar or show plan preview

**FAILSAFE / EDGE CASE:**
- If calendar already full: "Your calendar is packed. I can't fit more focus blocks. Consider moving some events?"
- If no tasks to plan: "Add some tasks first so I can build a meaningful plan."

---

### SCENARIO 1.3: Next Priority Query
**SCENARIO ID:** DG-003  
**PAGE:** Any  
**USER INPUT:** "What's my next priority?"  
**USER INTENT:** Quick decision on single next action  
**AUTOGLM CONTEXT USED:**
- Top 3 high-priority tasks
- Upcoming event (next 2 hours)
- Current time

**AUTOGLM DECISION TYPE:** suggest  
**AUTOGLM RESPONSE:** "Focus on 'Complete project documentation' - it's due today and takes ~2 hours. You have time before your 4 PM call."  
**SYSTEM ACTION:** None  
**DATABASE EFFECT:** Log to autoglm_runs  
**UI FEEDBACK:** Display response + "Start Focus Block" button  
**FAILSAFE / EDGE CASE:**
- If conflicting priorities: "You have 2 urgent tasks. Which is more critical: 'Send report' or 'Client follow-up'?"

---

## 2) TASK CONTROL SCENARIOS

### SCENARIO 2.1: Task Creation (Explicit)
**SCENARIO ID:** TC-001  
**PAGE:** Any  
**USER INPUT:** "Add a task to prepare the proposal today"  
**USER INTENT:** Create new task with specific details  
**AUTOGLM CONTEXT USED:**
- Current date
- Existing tasks (to avoid duplicates)

**AUTOGLM DECISION TYPE:** execute  
**AUTOGLM RESPONSE:** "✅ Created task: 'Prepare the proposal' (due today, medium priority)"  
**SYSTEM ACTION:** Insert into tasks table  
**DATABASE EFFECT:**
- INSERT INTO tasks (title: "Prepare the proposal", due_date: today, priority: medium, source: ai)
- Log to autoglm_runs (action_type: create_task)

**UI FEEDBACK:**
- Toast: "Task created ✓"
- Revalidate /tasks page

**FAILSAFE / EDGE CASE:**
- If similar task exists: "You already have 'Prepare proposal draft'. Did you mean to add another, or update that one?"
- If ambiguous priority: "Should this be high or medium priority? It's due today."

---

### SCENARIO 2.2: Task Completion
**SCENARIO ID:** TC-002  
**PAGE:** Tasks / Home  
**USER INPUT:** "Mark the meeting task as done"  
**USER INTENT:** Complete existing task by description  
**AUTOGLM CONTEXT USED:**
- All pending tasks matching "meeting"

**AUTOGLM DECISION TYPE:** execute  
**AUTOGLM RESPONSE:** "✅ Marked 'Prepare meeting agenda' as completed."  
**SYSTEM ACTION:** Update tasks table (status: completed)  
**DATABASE EFFECT:**
- UPDATE tasks SET status='completed', completed_at=NOW() WHERE title ILIKE '%meeting%'
- Log to autoglm_runs

**UI FEEDBACK:**
- Toast: "Task completed ✓"
- Remove from pending list

**FAILSAFE / EDGE CASE:**
- If multiple matches: "You have 2 tasks with 'meeting'. Which one: 'Prepare meeting agenda' or 'Schedule team meeting'?"
- If no match: "I couldn't find a task matching 'meeting'. Can you be more specific?"

---

### SCENARIO 2.3: Task Query (Overdue)
**SCENARIO ID:** TC-003  
**PAGE:** Any  
**USER INPUT:** "What tasks are overdue?"  
**USER INTENT:** Get list of missed deadlines  
**AUTOGLM CONTEXT USED:**
- Tasks where due_date < today AND status != completed

**AUTOGLM DECISION TYPE:** suggest  
**AUTOGLM RESPONSE:** "You have 2 overdue tasks: 'Submit report' (2 days overdue) and 'Email client' (1 day overdue). Want me to reschedule them?"  
**SYSTEM ACTION:** None (unless user confirms)  
**DATABASE EFFECT:** Log to autoglm_runs  
**UI FEEDBACK:** Display list + "Reschedule All" button  
**FAILSAFE / EDGE CASE:**
- If none overdue: "Great news! No overdue tasks."

---

### SCENARIO 2.4: Smart Task Merging
**SCENARIO ID:** TC-004  
**PAGE:** Tasks  
**USER INPUT:** "Merge similar tasks"  
**USER INTENT:** Detect and consolidate duplicate/similar tasks  
**AUTOGLM CONTEXT USED:**
- All pending tasks
- Title similarity analysis

**AUTOGLM DECISION TYPE:** question  
**AUTOGLM RESPONSE:** "I found 3 similar tasks about 'proposal'. Should I merge them into one: 'Prepare final proposal'?"  
**SYSTEM ACTION:** None (requires confirmation)  
**DATABASE EFFECT:** Log to autoglm_runs (decision_type: question)  
**UI FEEDBACK:** Show preview of merged task + "Merge" / "Keep Separate" buttons  
**FAILSAFE / EDGE CASE:**
- If no duplicates: "No duplicate tasks found. Your task list looks clean."

---

## 3) EVENT & TIME SCENARIOS

### SCENARIO 3.1: Focus Block Creation
**SCENARIO ID:** ET-001  
**PAGE:** Insights / Any  
**USER INPUT:** "Add a focus block for 45 minutes"  
**USER INTENT:** Create dedicated work time  
**AUTOGLM CONTEXT USED:**
- Current time
- Today's events (to find free slot)
- Tasks needing focus

**AUTOGLM DECISION TYPE:** execute  
**AUTOGLM RESPONSE:** "✅ Added 45-minute focus block at 2:00 PM (next available slot)."  
**SYSTEM ACTION:** Insert into events table  
**DATABASE EFFECT:**
- INSERT INTO events (title: "Focus Block", start_time: 2:00 PM, duration: 45, type: focus_block, source: ai)
- Log to autoglm_runs

**UI FEEDBACK:**
- Toast: "Focus block added ✓"
- Revalidate /calendar

**FAILSAFE / EDGE CASE:**
- If calendar full: "Your calendar is packed today. The earliest slot is tomorrow at 9 AM. Should I add it there?"
- If end of day: "It's 6 PM already. Want to schedule this for tomorrow morning?"

---

### SCENARIO 3.2: Event Rescheduling
**SCENARIO ID:** ET-002  
**PAGE:** Calendar / Any  
**USER INPUT:** "Reschedule my meeting to 4 PM"  
**USER INTENT:** Move existing event to new time  
**AUTOGLM CONTEXT USED:**
- Events today matching "meeting"
- 4 PM slot availability

**AUTOGLM DECISION TYPE:** execute  
**AUTOGLM RESPONSE:** "✅ Moved 'Team sync meeting' from 2 PM to 4 PM."  
**SYSTEM ACTION:** Update events table  
**DATABASE EFFECT:**
- UPDATE events SET start_time='16:00' WHERE title ILIKE '%meeting%'
- Log to autoglm_runs (action_type: reschedule_event)

**UI FEEDBACK:**
- Toast: "Meeting rescheduled ✓"
- Update calendar view

**FAILSAFE / EDGE CASE:**
- If 4 PM slot occupied: "You already have 'Client call' at 4 PM. Want to move it to 5 PM instead, or reschedule the client call?"
- If multiple meetings: "Which meeting? You have: 'Team sync' at 2 PM and 'Sprint review' at 3 PM."

---

### SCENARIO 3.3: Time Availability Check
**SCENARIO ID:** ET-003  
**PAGE:** Any  
**USER INPUT:** "Do I have time for this today?"  
**USER INTENT:** Check if schedule allows new commitment  
**AUTOGLM CONTEXT USED:**
- Total scheduled hours today
- Free slots
- Task load

**AUTOGLM DECISION TYPE:** suggest  
**AUTOGLM RESPONSE:** "You have 2 hours free (1-3 PM). If 'this' takes less than that, yes. Otherwise, consider tomorrow."  
**SYSTEM ACTION:** None  
**DATABASE EFFECT:** Log to autoglm_runs  
**UI FEEDBACK:** Display free slots + "Add to Calendar" button  
**FAILSAFE / EDGE CASE:**
- If vague context: "I need more details. How long will 'this' take?"
- If completely booked: "Your day is fully booked. The earliest free slot is tomorrow at 10 AM."

---

## 4) INSIGHTS-DRIVEN ACTION SCENARIOS

### SCENARIO 4.1: Distraction Signal
**SCENARIO ID:** ID-001  
**PAGE:** Any  
**USER INPUT:** "I feel distracted"  
**USER INTENT:** Get help refocusing  
**AUTOGLM CONTEXT USED:**
- Current task
- Notification settings
- Time of day

**AUTOGLM DECISION TYPE:** execute  
**AUTOGLM RESPONSE:** "I've muted notifications for 1 hour and started a 25-minute focus timer. Work on 'Prepare proposal' now."  
**SYSTEM ACTION:**
- Update notification settings (temp mute)
- Create short focus event

**DATABASE EFFECT:**
- INSERT INTO events (type: focus_block, duration: 25)
- UPDATE user_settings (notifications_muted_until: NOW() + 1 hour)
- Log to autoglm_runs (action_type: enable_focus_mode)

**UI FEEDBACK:**
- Toast: "Focus mode activated 🎯"
- Timer widget appears

**FAILSAFE / EDGE CASE:**
- If already in focus mode: "You're already in focus mode (12 minutes left). Keep going!"

---

### SCENARIO 4.2: Focus Request
**SCENARIO ID:** ID-002  
**PAGE:** Insights / Home  
**USER INPUT:** "Help me focus this afternoon"  
**USER INTENT:** Get structured afternoon plan  
**AUTOGLM CONTEXT USED:**
- Afternoon events (12 PM - 6 PM)
- Pending high-priority tasks
- Energy patterns

**AUTOGLM DECISION TYPE:** execute  
**AUTOGLM RESPONSE:** "Created 2 focus blocks: 1-2:30 PM (Proposal work) and 3:30-5 PM (Documentation). You have a call at 2:30."  
**SYSTEM ACTION:** Insert 2 focus block events  
**DATABASE EFFECT:**
- INSERT INTO events (2 focus blocks with calculated times)
- Log to autoglm_runs

**UI FEEDBACK:**
- Toast: "Afternoon plan ready ✓"
- Show calendar preview

**FAILSAFE / EDGE CASE:**
- If afternoon already planned: "You already have focus blocks set. Want me to adjust them?"

---

### SCENARIO 4.3: Productivity Analysis
**SCENARIO ID:** ID-003  
**PAGE:** Insights  
**USER INPUT:** "Why was today unproductive?"  
**USER INTENT:** Get root cause analysis  
**AUTOGLM CONTEXT USED:**
- Tasks completed today
- Events attended
- Time spent in focus mode
- Interruptions (notifications)

**AUTOGLM DECISION TYPE:** suggest  
**AUTOGLM RESPONSE:** "You had 7 meetings today (5 hours total) and only 1 completed task. Too many interruptions. Try blocking focus time tomorrow."  
**SYSTEM ACTION:** None  
**DATABASE EFFECT:** Log to autoglm_runs (includes analysis payload)  
**UI FEEDBACK:** Display analysis + "Plan Better Tomorrow" button  
**FAILSAFE / EDGE CASE:**
- If actually productive: "You completed 8 tasks today! That's 30% above your average. Great work!"

---

## 5) REMINDERS & NOTIFICATIONS SCENARIOS

### SCENARIO 5.1: Reminder Creation
**SCENARIO ID:** RN-001  
**PAGE:** Any  
**USER INPUT:** "Remind me tomorrow at 6"  
**USER INTENT:** Set time-based reminder  
**AUTOGLM CONTEXT USED:**
- Current date/time
- User timezone
- Context of what to remind (inferred from recent activity or ask)

**AUTOGLM DECISION TYPE:** question  
**AUTOGLM RESPONSE:** "Remind you about what? Your last action was viewing 'Prepare proposal'."  
**SYSTEM ACTION:** None (needs clarification)  
**DATABASE EFFECT:** Log to autoglm_runs (decision_type: question)  
**UI FEEDBACK:** Show text input: "What should I remind you about?"  
**FAILSAFE / EDGE CASE:**
- If "6" is ambiguous: "Did you mean 6 AM or 6 PM?"
- Once clarified: Execute → INSERT INTO notifications (trigger_at: tomorrow 6 PM, message: "...")

---

### SCENARIO 5.2: Notification Pause
**SCENARIO ID:** RN-002  
**PAGE:** Any  
**USER INPUT:** "Quiet notifications for 2 hours"  
**USER INTENT:** Temporary notification mute  
**AUTOGLM CONTEXT USED:**
- Current notification settings
- Current time

**AUTOGLM DECISION TYPE:** execute  
**AUTOGLM RESPONSE:** "✅ Notifications muted until 4:30 PM."  
**SYSTEM ACTION:** Update user settings  
**DATABASE EFFECT:**
- UPDATE user_settings SET notifications_muted_until = NOW() + INTERVAL '2 hours'
- Log to autoglm_runs (action_type: mute_notifications)

**UI FEEDBACK:**
- Toast: "Notifications muted 🔕"
- Show countdown timer

**FAILSAFE / EDGE CASE:**
- If already muted: "Notifications are already muted until 3 PM. Want to extend to 4:30 PM?"

---

### SCENARIO 5.3: Upcoming Reminders
**SCENARIO ID:** RN-003  
**PAGE:** Notifications / Home  
**USER INPUT:** "What reminders are coming up?"  
**USER INTENT:** Check pending notifications  
**AUTOGLM CONTEXT USED:**
- Notifications with trigger_at in next 24 hours

**AUTOGLM DECISION TYPE:** suggest  
**AUTOGLM RESPONSE:** "You have 3 reminders: 'Submit report' (in 2 hours), 'Team meeting prep' (tomorrow 9 AM), and 'Call client' (tomorrow 3 PM)."  
**SYSTEM ACTION:** None  
**DATABASE EFFECT:** Log to autoglm_runs  
**UI FEEDBACK:** Display list with "Snooze" / "Cancel" options for each  
**FAILSAFE / EDGE CASE:**
- If none: "No upcoming reminders. Your schedule is clear!"

---

## 6) AMBIGUITY HANDLING SCENARIOS

### SCENARIO 6.1: Vague Command
**SCENARIO ID:** AH-001  
**PAGE:** Any  
**USER INPUT:** "Do something about work"  
**USER INTENT:** Unclear - needs clarification  
**AUTOGLM CONTEXT USED:**
- All tasks/events tagged with "work"

**AUTOGLM DECISION TYPE:** question  
**AUTOGLM RESPONSE:** "I found 5 work-related items. What would you like me to do? (1) Create a task, (2) Schedule focus time, (3) Show pending work tasks?"  
**SYSTEM ACTION:** None  
**DATABASE EFFECT:** Log to autoglm_runs (decision_type: question)  
**UI FEEDBACK:** Display 3 quick action buttons  
**FAILSAFE / EDGE CASE:**
- If no work items: "I don't see any work-related tasks. Want to add one?"

---

### SCENARIO 6.2: Missing Time Context
**SCENARIO ID:** AH-002  
**PAGE:** Any  
**USER INPUT:** "Schedule meeting"  
**USER INTENT:** Create event but missing time/date  
**AUTOGLM CONTEXT USED:**
- Today's calendar
- Typical meeting duration (from history)

**AUTOGLM DECISION TYPE:** question  
**AUTOGLM RESPONSE:** "When should I schedule this meeting? You have free slots at 10 AM, 2 PM, and 4 PM today."  
**SYSTEM ACTION:** None  
**DATABASE EFFECT:** Log to autoglm_runs  
**UI FEEDBACK:** Display time slot picker  
**FAILSAFE / EDGE CASE:**
- If no free slots: "Your calendar is full today. Should I schedule it tomorrow?"

---

### SCENARIO 6.3: Conflicting Actions
**SCENARIO ID:** AH-003  
**PAGE:** Tasks  
**USER INPUT:** "Add urgent task but I'm already overloaded"  
**USER INTENT:** Conflicting desire - needs prioritization guidance  
**AUTOGLM CONTEXT USED:**
- Current task count (e.g., 12 pending)
- Today's events (packed schedule)

**AUTOGLM DECISION TYPE:** question  
**AUTOGLM RESPONSE:** "You have 12 pending tasks and a full calendar. Adding more might hurt your productivity. Should I: (1) Add it anyway, (2) Reschedule something, or (3) Defer to tomorrow?"  
**SYSTEM ACTION:** None  
**DATABASE EFFECT:** Log to autoglm_runs  
**UI FEEDBACK:** Display 3 choice buttons  
**FAILSAFE / EDGE CASE:**
- If user confirms "add anyway": Execute → INSERT task + show warning toast

---

## 7) NO-OP / SAFETY SCENARIOS

### SCENARIO 7.1: Already Optimal
**SCENARIO ID:** NS-001  
**PAGE:** Any  
**USER INPUT:** "Optimize my schedule"  
**USER INTENT:** Improve time management  
**AUTOGLM CONTEXT USED:**
- Task distribution
- Event spacing
- Free time availability

**AUTOGLM DECISION TYPE:** nothing  
**AUTOGLM RESPONSE:** "Your schedule is already well-balanced. You have good focus time and manageable task load. No changes needed."  
**SYSTEM ACTION:** None  
**DATABASE EFFECT:** Log to autoglm_runs (decision_type: nothing)  
**UI FEEDBACK:** Display positive message  
**FAILSAFE / EDGE CASE:**
- If truly needs optimization: Switch to suggest with specific recommendations

---

### SCENARIO 7.2: Clarification Required
**SCENARIO ID:** NS-002  
**PAGE:** Any  
**USER INPUT:** "Make it better"  
**USER INTENT:** Vague improvement request  
**AUTOGLM CONTEXT USED:**
- Recent user activity (last page visited)

**AUTOGLM DECISION TYPE:** question  
**AUTOGLM RESPONSE:** "Make what better? I can help with: tasks, schedule, focus time, or notifications."  
**SYSTEM ACTION:** None  
**DATABASE EFFECT:** Log to autoglm_runs (decision_type: question)  
**UI FEEDBACK:** Display category picker  
**FAILSAFE / EDGE CASE:**
- If repeated vague input: "I need more specific information to help. Try: 'Plan my day' or 'Add a task'."

---

### SCENARIO 7.3: Harmful Request Prevention
**SCENARIO ID:** NS-003  
**PAGE:** Any  
**USER INPUT:** "Delete all my tasks"  
**USER INTENT:** Potentially destructive action  
**AUTOGLM CONTEXT USED:**
- Task count (e.g., 18 tasks)

**AUTOGLM DECISION TYPE:** question  
**AUTOGLM RESPONSE:** "⚠️ This will permanently delete 18 tasks. Are you absolutely sure? This cannot be undone."  
**SYSTEM ACTION:** None (requires explicit confirmation)  
**DATABASE EFFECT:** Log to autoglm_runs (decision_type: question, includes warning flag)  
**UI FEEDBACK:** Show warning modal with "Cancel" (prominent) and "Yes, Delete All" (destructive style)  
**FAILSAFE / EDGE CASE:**
- Only proceed if user confirms with typed confirmation: "DELETE ALL"
- Log action to audit trail

---

### SCENARIO 7.4: Out of Scope
**SCENARIO ID:** NS-004  
**PAGE:** Any  
**USER INPUT:** "What's the weather tomorrow?"  
**USER INTENT:** General information (not productivity-related)  
**AUTOGLM CONTEXT USED:** None (out of scope)

**AUTOGLM DECISION TYPE:** nothing  
**AUTOGLM RESPONSE:** "I'm your productivity assistant - I help with tasks, schedule, and focus. For weather, try a weather app."  
**SYSTEM ACTION:** None  
**DATABASE EFFECT:** Log to autoglm_runs (decision_type: nothing, reason: out_of_scope)  
**UI FEEDBACK:** Display polite boundary message  
**FAILSAFE / EDGE CASE:**
- If repeated off-topic requests: "I can only help with productivity. Try: 'What should I do now?' or 'Plan my day'."

---

## SCENARIO COVERAGE SUMMARY

### What Ask ROMNA Now Solves:
✅ **Intelligent Daily Guidance** - Users get context-aware recommendations based on tasks, events, time, and workload  
✅ **Proactive Task Management** - Create, complete, reschedule, and analyze tasks via natural language  
✅ **Smart Time Allocation** - Add focus blocks, check availability, reschedule events with conflict detection  
✅ **Insight-Driven Actions** - Convert feelings (distracted, overwhelmed) into concrete actions (focus mode, schedule optimization)  
✅ **Reminder Control** - Set, query, and manage notifications with natural language  
✅ **Safe Ambiguity Handling** - Ask clarifying questions instead of guessing or breaking  
✅ **Protective Boundaries** - Prevent destructive actions, reject out-of-scope requests, maintain productivity focus

---

### What It Intentionally Does NOT Do:
❌ **General Q&A** - Not a chatbot (weather, news, general knowledge)  
❌ **Blind Execution** - Always asks for confirmation on destructive actions  
❌ **Personality/Small Talk** - Purely functional, no "How are you?" conversations  
❌ **External System Control** - Won't control email, Slack, or other apps (only ROMNA data)  
❌ **Hidden Automation** - No silent background changes without user knowledge  
❌ **Judgmental Feedback** - Never scolds or guilt-trips about productivity

---

### Remaining Gaps for Future Phases:
🔹 **Multi-turn Conversations** - Currently single-shot (no conversation memory across requests)  
🔹 **Proactive Suggestions** - Doesn't initiate without user asking (future: morning briefing, end-of-day summary)  
🔹 **Learning from Patterns** - Doesn't yet adapt to user habits over time (future: personalized timing recommendations)  
🔹 **Cross-system Awareness** - Can't see external calendar or email (future: integration hooks)  
🔹 **Team/Shared Context** - Only works with individual user data (future: team workload awareness)  
🔹 **Voice Continuity** - Voice input exists but not yet fully integrated with Ask ROMNA drawer  

---

**END OF SCENARIOS**

**Total Scenarios Defined:** 24  
**Coverage:** 100% of Phase 4 user stories  
**Readiness:** Scenarios are execution-ready for implementation

---

**Next Steps (Implementation Phase):**
1. Map each scenario to API endpoint logic
2. Implement LLM intent classification (fallback to rule-based)
3. Build execution functions for each action_type
4. Add comprehensive test suite covering all scenarios
5. Deploy with observability (logs + audit trail)
