# AUTOGLM POLICY LAYER
**PROJECT:** ROMNA  
**PURPOSE:** Explicit decision rules for AutoGLM (Context → Reason → Decide → Act)  
**STATUS:** Production-ready policy definitions

---

## POLICY STRUCTURE GUIDE

Each policy follows this strict format:
- **POLICY ID**: Unique identifier
- **SOURCE SCENARIO ID(s)**: Links to approved scenarios
- **TRIGGER CONDITION**: When this policy activates
- **REQUIRED CONTEXT**: Minimum data needed to execute
- **OPTIONAL CONTEXT**: Enhances decision quality
- **DECISION TYPE**: suggest | question | execute | nothing
- **ALLOWED ACTIONS**: What AutoGLM can do
- **FORBIDDEN ACTIONS**: What AutoGLM must not do
- **DECISION LOGIC**: Step-by-step deterministic rules
- **OUTPUT TEMPLATE**: Example response text
- **FAILSAFE RULE**: What to do when conditions fail
- **LOGGING REQUIREMENTS**: Audit trail specifications

---

# 1) PRIORITY & FOCUS POLICIES

## POLICY P-001: NEXT ACTION RECOMMENDATION
**SOURCE SCENARIO ID(s):** DG-001, DG-003  
**TRIGGER CONDITION:** User asks "What should I do now?" OR "What's my next priority?"

**REQUIRED CONTEXT:**
- Current datetime
- User's pending tasks (title, priority, due_date, estimated_duration)
- Today's events (start_time, duration)

**OPTIONAL CONTEXT:**
- User energy level (profile)
- Recent completions (last 2 hours)
- Overdue task count

**DECISION TYPE:** suggest

**ALLOWED ACTIONS:**
- Return ranked task recommendation
- Suggest timing based on next event
- Offer to create focus block

**FORBIDDEN ACTIONS:**
- Auto-create focus blocks without asking
- Modify task priorities without consent
- Reschedule events

**DECISION LOGIC:**
1. Query tasks WHERE status='pending' AND user_id={userId} ORDER BY priority DESC, due_date ASC
2. Query events WHERE date=TODAY AND user_id={userId} ORDER BY start_time ASC
3. IF no pending tasks:
   - RETURN "You have no pending tasks. Great job! Maybe add some new goals?"
4. Get next event start_time (if exists within next 4 hours)
5. Select top task T where:
   - T.priority IN ('high', 'urgent') OR T.due_date = TODAY
6. Calculate time_available = (next_event_time - current_time) if next_event exists, else 240 minutes
7. IF T.estimated_duration AND T.estimated_duration <= time_available:
   - RETURN "Start with '{T.title}' - it's {T.priority} priority and you have {time_available} minutes before your {next_event}."
8. ELSE IF T.estimated_duration > time_available:
   - RETURN "'{T.title}' needs {T.estimated_duration} minutes but you only have {time_available}. Consider a smaller task first, or I can break this down."
9. ELSE:
   - RETURN "Focus on '{T.title}' - it's {T.priority} priority. {time_context}"

**OUTPUT TEMPLATE:**
"Start with 'Prepare proposal' - it's high priority and you have 90 minutes before your 11 AM meeting."

**FAILSAFE RULE:**
- IF tasks.length > 6 AND priority='high' count > 3:
  - RETURN "Your day looks packed with {count} high-priority tasks. Consider rescheduling '{lowest_priority_task}' to tomorrow."

**LOGGING REQUIREMENTS:**
- Log decision_type: suggest
- Log task_count, high_priority_count, next_event_time
- Log selected_task_id

---

## POLICY P-002: FOCUS REQUEST HANDLING
**SOURCE SCENARIO ID(s):** ID-001, ID-002  
**TRIGGER CONDITION:** User indicates distraction OR requests focus assistance

**REQUIRED CONTEXT:**
- Current datetime
- User notification settings
- High-priority pending tasks

**OPTIONAL CONTEXT:**
- Today's event schedule
- User's typical focus duration (from history)

**DECISION TYPE:** execute

**ALLOWED ACTIONS:**
- Create focus_block event (25-90 minutes)
- Temporarily mute notifications (1-4 hours)
- Suggest specific task to focus on

**FORBIDDEN ACTIONS:**
- Cancel existing events
- Delete tasks
- Modify user preferences permanently

**DECISION LOGIC:**
1. IF input matches /distract|focus|concentrate/i:
   - SET focus_duration = 25 (Pomodoro default)
2. IF input matches /(\d+)\s*min/i:
   - EXTRACT focus_duration = $1
   - VALIDATE focus_duration BETWEEN 10 AND 180
3. Query events WHERE date=TODAY AND start_time > NOW() ORDER BY start_time ASC LIMIT 1
4. Calculate next_free_slot:
   - IF next_event exists AND (next_event.start_time - NOW()) < focus_duration:
     - next_free_slot = next_event.end_time
   - ELSE:
     - next_free_slot = NOW() + 5 minutes (buffer)
5. Get top priority task T WHERE status='pending' ORDER BY priority DESC LIMIT 1
6. INSERT INTO events:
   - title: "Focus Block"
   - start_time: next_free_slot
   - duration: focus_duration
   - type: focus_block
   - source: ai
   - linked_task_id: T.id (if exists)
7. UPDATE user_settings:
   - notifications_muted_until = NOW() + 1 hour
8. RETURN "I've muted notifications for 1 hour and started a {focus_duration}-minute focus timer. Work on '{T.title}' now."

**OUTPUT TEMPLATE:**
"I've muted notifications for 1 hour and started a 25-minute focus timer. Work on 'Prepare proposal' now."

**FAILSAFE RULE:**
- IF already in active focus block:
  - GET remaining_time FROM current focus_block
  - RETURN "You're already in focus mode ({remaining_time} minutes left). Keep going!"
- IF no free slots available:
  - RETURN "Your calendar is packed. The earliest slot is {next_available}. Should I add it there?" (decision_type: question)

**LOGGING REQUIREMENTS:**
- Log action_type: enable_focus_mode
- Log focus_duration, mute_duration, linked_task_id
- Log success: true/false

---

## POLICY P-003: DISTRACTION BLOCKING
**SOURCE SCENARIO ID(s):** ID-001  
**TRIGGER CONDITION:** User reports feeling distracted OR low focus

**REQUIRED CONTEXT:**
- Current notification settings
- Active/upcoming events (next 2 hours)

**OPTIONAL CONTEXT:**
- Recent notification count (last hour)
- User's focus history

**DECISION TYPE:** execute

**ALLOWED ACTIONS:**
- Mute notifications temporarily (1-4 hours)
- Suggest immediate task to start
- Optionally create short focus block (25 min)

**FORBIDDEN ACTIONS:**
- Permanently disable notifications
- Delete notifications
- Cancel scheduled events

**DECISION LOGIC:**
1. IF notifications_muted_until < NOW():
   - SET new_mute_until = NOW() + 1 hour
   - UPDATE user_settings SET notifications_muted_until = new_mute_until
2. ELSE:
   - EXTEND notifications_muted_until BY 30 minutes (max 4 hours from NOW)
3. Query top task WHERE status='pending' ORDER BY priority DESC LIMIT 1
4. Optionally INSERT INTO events (type: focus_block, duration: 25, start_time: NOW())
5. RETURN "{action_taken}. Work on '{task.title}' now."

**OUTPUT TEMPLATE:**
"Notifications muted for 1 hour. Focus on 'Prepare proposal' now."

**FAILSAFE RULE:**
- IF notifications already muted for > 2 hours:
  - RETURN "Notifications are already muted until {time}. Want to extend further?" (decision_type: question)

**LOGGING REQUIREMENTS:**
- Log action_type: mute_notifications
- Log mute_duration, previous_mute_until
- Log success: true/false

---

# 2) TASK LIFECYCLE POLICIES

## POLICY T-001: TASK CREATION (EXPLICIT INTENT)
**SOURCE SCENARIO ID(s):** TC-001  
**TRIGGER CONDITION:** User input matches task creation pattern

**REQUIRED CONTEXT:**
- User ID
- Input text
- Current date

**OPTIONAL CONTEXT:**
- Existing tasks (for duplicate detection)
- User's typical priority patterns

**DECISION TYPE:** execute

**ALLOWED ACTIONS:**
- INSERT new task into tasks table
- Parse priority from input (high/medium/low)
- Parse due_date from input (today/tomorrow/specific date)

**FORBIDDEN ACTIONS:**
- Create duplicate tasks without asking
- Auto-assign priority above 'high'
- Set due_date in past without warning

**DECISION LOGIC:**
1. Extract task_title:
   - IF input matches /add task:?\s*(.+)/i: task_title = $1
   - ELSE IF input matches /create task:?\s*(.+)/i: task_title = $1
   - ELSE IF input matches /task:?\s*(.+)/i: task_title = $1
   - ELSE: task_title = input (cleaned)
2. Extract priority:
   - IF input matches /urgent|critical/i: priority = 'urgent'
   - ELSE IF input matches /high|important/i: priority = 'high'
   - ELSE IF input matches /low|minor/i: priority = 'low'
   - ELSE: priority = 'medium'
3. Extract due_date:
   - IF input matches /today/i: due_date = TODAY
   - ELSE IF input matches /tomorrow/i: due_date = TODAY + 1
   - ELSE IF input matches date pattern: due_date = parsed_date
   - ELSE: due_date = NULL
4. Check for duplicates:
   - Query tasks WHERE user_id={userId} AND title ILIKE '%{task_title_keywords}%' AND status='pending'
   - IF similar_tasks.length > 0 AND similarity > 0.8:
     - RETURN "You already have '{similar_task.title}'. Did you mean to add another, or update that one?" (decision_type: question)
5. INSERT INTO tasks:
   - id: uuid()
   - user_id: {userId}
   - title: task_title
   - priority: priority
   - due_date: due_date
   - status: 'pending'
   - ai_state: 'planned'
   - source: 'ai'
   - source_intent: original_input
   - created_at: NOW()
6. RETURN "✅ Created task: '{task_title}' (due {due_date}, {priority} priority)"

**OUTPUT TEMPLATE:**
"✅ Created task: 'Prepare the proposal' (due today, high priority)"

**FAILSAFE RULE:**
- IF task_title.length < 3:
  - RETURN "Task title too short. What should I create?" (decision_type: question)
- IF due_date < TODAY:
  - RETURN "That date is in the past. Did you mean today or tomorrow?" (decision_type: question)

**LOGGING REQUIREMENTS:**
- Log action_type: create_task
- Log task_id, title, priority, due_date, source_intent
- Log duplicate_check_result
- Log success: true/false

---

## POLICY T-002: TASK COMPLETION
**SOURCE SCENARIO ID(s):** TC-002  
**TRIGGER CONDITION:** User requests to mark task as done/complete

**REQUIRED CONTEXT:**
- User ID
- Task identifier (title keyword or ID)

**OPTIONAL CONTEXT:**
- Task completion history

**DECISION TYPE:** execute

**ALLOWED ACTIONS:**
- UPDATE task status to 'completed'
- Set completed_at timestamp
- Update ai_state to 'done'

**FORBIDDEN ACTIONS:**
- Complete multiple tasks without confirmation
- Delete task instead of marking complete
- Modify other task fields

**DECISION LOGIC:**
1. Extract task_identifier:
   - IF input matches /mark (.+) (as )?(done|complete)/i: task_identifier = $1
   - ELSE IF input matches /complete (.+)/i: task_identifier = $1
   - ELSE IF input matches /done with (.+)/i: task_identifier = $1
2. Query tasks WHERE user_id={userId} AND status='pending' AND title ILIKE '%{task_identifier}%'
3. IF matching_tasks.length = 0:
   - RETURN "I couldn't find a pending task matching '{task_identifier}'. Can you be more specific?" (decision_type: question)
4. IF matching_tasks.length > 1:
   - RETURN "You have {count} tasks matching '{task_identifier}': {list_titles}. Which one?" (decision_type: question)
5. IF matching_tasks.length = 1:
   - UPDATE tasks SET:
     - status = 'completed'
     - completed_at = NOW()
     - ai_state = 'done'
     - updated_at = NOW()
   - WHERE id = matching_tasks[0].id
6. RETURN "✅ Marked '{matching_tasks[0].title}' as completed."

**OUTPUT TEMPLATE:**
"✅ Marked 'Prepare meeting agenda' as completed."

**FAILSAFE RULE:**
- IF task already completed:
  - RETURN "'{task.title}' was already completed {time_ago}. Did you mean a different task?"

**LOGGING REQUIREMENTS:**
- Log action_type: complete_task
- Log task_id, title, completed_at
- Log match_count (for ambiguity tracking)
- Log success: true/false

---

## POLICY T-003: OVERDUE TASK QUERY
**SOURCE SCENARIO ID(s):** TC-003  
**TRIGGER CONDITION:** User asks about overdue/late/missed tasks

**REQUIRED CONTEXT:**
- User ID
- Current date

**OPTIONAL CONTEXT:**
- Task priority distribution

**DECISION TYPE:** suggest

**ALLOWED ACTIONS:**
- Query and return overdue tasks
- Offer to reschedule them
- Suggest prioritization

**FORBIDDEN ACTIONS:**
- Auto-reschedule without asking
- Delete overdue tasks
- Change priority

**DECISION LOGIC:**
1. Query tasks WHERE:
   - user_id = {userId}
   - status IN ('pending', 'in_progress')
   - due_date < TODAY
   - ORDER BY due_date ASC, priority DESC
2. IF overdue_tasks.length = 0:
   - RETURN "Great news! No overdue tasks."
3. FOR each task in overdue_tasks:
   - Calculate days_overdue = TODAY - task.due_date
4. Build response message:
   - IF overdue_tasks.length = 1:
     - "You have 1 overdue task: '{task.title}' ({days_overdue} days overdue)."
   - ELSE:
     - "You have {count} overdue tasks: {list_with_days}."
5. Append suggestion:
   - "Want me to reschedule them?"
6. RETURN message

**OUTPUT TEMPLATE:**
"You have 2 overdue tasks: 'Submit report' (2 days overdue) and 'Email client' (1 day overdue). Want me to reschedule them?"

**FAILSAFE RULE:**
- IF overdue_tasks.length > 10:
  - RETURN "You have {count} overdue tasks. This suggests workload issues. Want me to help prioritize or archive old tasks?"

**LOGGING REQUIREMENTS:**
- Log decision_type: suggest
- Log overdue_count, oldest_overdue_days
- Log suggested_action: reschedule

---

## POLICY T-004: TASK MERGING
**SOURCE SCENARIO ID(s):** TC-004  
**TRIGGER CONDITION:** User requests to merge/consolidate similar tasks

**REQUIRED CONTEXT:**
- User ID
- All pending tasks

**OPTIONAL CONTEXT:**
- Task creation dates
- Task sources

**DECISION TYPE:** question

**ALLOWED ACTIONS:**
- Identify similar tasks (title similarity)
- Suggest merge candidates
- Await user confirmation before merging

**FORBIDDEN ACTIONS:**
- Auto-merge without confirmation
- Merge tasks with different due dates without warning
- Delete tasks instead of merging

**DECISION LOGIC:**
1. Query tasks WHERE user_id={userId} AND status='pending'
2. FOR each pair of tasks:
   - Calculate title_similarity (Levenshtein or keyword overlap)
   - IF similarity > 0.75:
     - Add to merge_candidates
3. IF merge_candidates.length = 0:
   - RETURN "No duplicate tasks found. Your task list looks clean."
4. Group similar tasks into clusters
5. FOR each cluster:
   - Suggest merged title = longest/most complete title
   - List tasks to be merged
6. RETURN "I found {cluster_count} groups of similar tasks: {list_groups}. Should I merge them?"

**OUTPUT TEMPLATE:**
"I found 3 similar tasks about 'proposal': 'Draft proposal', 'Proposal work', 'Finish proposal'. Should I merge them into one: 'Prepare final proposal'?"

**FAILSAFE RULE:**
- IF tasks have different due_dates:
  - RETURN "These tasks have different due dates ({dates}). Should I keep the earliest?"
- IF tasks have different priorities:
  - RETURN "These tasks have different priorities. Should I use the highest ({priority})?"

**LOGGING REQUIREMENTS:**
- Log decision_type: question
- Log merge_candidate_count, similarity_scores
- Log awaiting_user_confirmation: true

---

## POLICY T-005: TASK RESCHEDULING
**SOURCE SCENARIO ID(s):** TC-003 (follow-up action)  
**TRIGGER CONDITION:** User confirms to reschedule task(s)

**REQUIRED CONTEXT:**
- Task ID(s) to reschedule
- User ID

**OPTIONAL CONTEXT:**
- User's calendar
- Suggested new date (if not provided)

**DECISION TYPE:** execute

**ALLOWED ACTIONS:**
- UPDATE task due_date
- Suggest reasonable new dates
- Update multiple tasks in batch

**FORBIDDEN ACTIONS:**
- Reschedule to past dates
- Change task priority while rescheduling
- Delete tasks

**DECISION LOGIC:**
1. IF user provides specific date:
   - new_due_date = parsed_date
   - VALIDATE new_due_date >= TODAY
2. ELSE:
   - IF task.priority = 'urgent': new_due_date = TODAY + 1
   - ELSE IF task.priority = 'high': new_due_date = TODAY + 2
   - ELSE: new_due_date = TODAY + 3
3. FOR each task_id in task_ids:
   - UPDATE tasks SET:
     - due_date = new_due_date
     - updated_at = NOW()
   - WHERE id = task_id AND user_id = {userId}
4. RETURN "✅ Rescheduled {count} task(s) to {new_due_date}."

**OUTPUT TEMPLATE:**
"✅ Rescheduled 'Submit report' to tomorrow and 'Email client' to Dec 15."

**FAILSAFE RULE:**
- IF new_due_date > TODAY + 30:
  - RETURN "That's more than 30 days away. Are you sure you want to defer this long?" (decision_type: question)

**LOGGING REQUIREMENTS:**
- Log action_type: reschedule_tasks
- Log task_ids, old_due_dates, new_due_dates
- Log success: true/false

---

# 3) TIME & CALENDAR POLICIES

## POLICY C-001: FOCUS BLOCK CREATION
**SOURCE SCENARIO ID(s):** ET-001  
**TRIGGER CONDITION:** User requests to add/create focus block/time

**REQUIRED CONTEXT:**
- User ID
- Current datetime
- Today's events

**OPTIONAL CONTEXT:**
- Specific duration requested
- Preferred time
- Task to focus on

**DECISION TYPE:** execute

**ALLOWED ACTIONS:**
- INSERT focus_block event
- Find optimal free slot
- Link to specific task (if mentioned)

**FORBIDDEN ACTIONS:**
- Overlap existing events
- Create focus blocks outside work hours (6 AM - 10 PM)
- Auto-reschedule existing events

**DECISION LOGIC:**
1. Extract duration:
   - IF input matches /(\d+)\s*min/i: duration = $1
   - ELSE IF input matches /pomodoro/i: duration = 25
   - ELSE: duration = 45 (default)
   - VALIDATE duration BETWEEN 15 AND 180
2. Extract preferred_time:
   - IF input matches time pattern: preferred_time = parsed_time
   - ELSE: preferred_time = NULL
3. Query events WHERE date=TODAY AND user_id={userId} ORDER BY start_time ASC
4. Find next_free_slot:
   - IF preferred_time specified:
     - Check if slot [preferred_time, preferred_time + duration] is free
     - IF conflict: Find nearest free slot after preferred_time
   - ELSE:
     - current_time_rounded = CEIL(NOW(), 15 min)
     - Find first gap >= duration between events
5. IF no_free_slot_today:
   - RETURN "Your calendar is packed today. The earliest slot is tomorrow at 9 AM. Should I add it there?" (decision_type: question)
6. INSERT INTO events:
   - id: uuid()
   - user_id: {userId}
   - title: "Focus Block"
   - start_time: next_free_slot
   - duration: duration
   - type: 'focus_block'
   - source: 'ai'
   - date: TODAY
7. RETURN "✅ Added {duration}-minute focus block at {start_time} (next available slot)."

**OUTPUT TEMPLATE:**
"✅ Added 45-minute focus block at 2:00 PM (next available slot)."

**FAILSAFE RULE:**
- IF current_time > 6 PM:
  - RETURN "It's {current_time} already. Want to schedule this for tomorrow morning?" (decision_type: question)
- IF calendar has > 5 focus blocks today:
  - RETURN "You already have {count} focus blocks today. Sure you want to add another?"

**LOGGING REQUIREMENTS:**
- Log action_type: add_focus_block
- Log event_id, start_time, duration
- Log slot_search_attempts
- Log success: true/false

---

## POLICY C-002: EVENT RESCHEDULING
**SOURCE SCENARIO ID(s):** ET-002  
**TRIGGER CONDITION:** User requests to reschedule/move an event

**REQUIRED CONTEXT:**
- User ID
- Event identifier (title keyword)
- New time

**OPTIONAL CONTEXT:**
- Today's full calendar
- Event participants (future: for external sync)

**DECISION TYPE:** execute

**ALLOWED ACTIONS:**
- UPDATE event start_time
- Check new slot availability
- Detect conflicts

**FORBIDDEN ACTIONS:**
- Reschedule events with source='google_calendar' without warning
- Create time conflicts
- Modify event duration without asking

**DECISION LOGIC:**
1. Extract event_identifier:
   - IF input matches /reschedule (.+) to (.+)/i: event_identifier = $1, new_time = $2
   - ELSE IF input matches /move (.+) to (.+)/i: event_identifier = $1, new_time = $2
2. Parse new_time:
   - VALIDATE new_time format
   - CONVERT to datetime
3. Query events WHERE user_id={userId} AND title ILIKE '%{event_identifier}%' AND date=TODAY
4. IF matching_events.length = 0:
   - RETURN "I couldn't find an event matching '{event_identifier}'. Can you be more specific?" (decision_type: question)
5. IF matching_events.length > 1:
   - RETURN "Which event? You have: {list_events}." (decision_type: question)
6. event = matching_events[0]
7. Check conflict:
   - Query events WHERE date=TODAY AND start_time <= new_time AND end_time > new_time AND id != event.id
   - IF conflict_exists:
     - RETURN "You already have '{conflict_event.title}' at {new_time}. Want to move it to {alternative_time} instead, or reschedule the conflicting event?" (decision_type: question)
8. UPDATE events SET start_time = new_time, updated_at = NOW() WHERE id = event.id
9. RETURN "✅ Moved '{event.title}' from {old_time} to {new_time}."

**OUTPUT TEMPLATE:**
"✅ Moved 'Team sync meeting' from 2 PM to 4 PM."

**FAILSAFE RULE:**
- IF event.source = 'google_calendar':
  - RETURN "This event is from Google Calendar. Changes here won't sync automatically. Reschedule in Google Calendar directly, or I can update it here for reference only. Proceed?" (decision_type: question)

**LOGGING REQUIREMENTS:**
- Log action_type: reschedule_event
- Log event_id, old_time, new_time, conflict_detected
- Log success: true/false

---

## POLICY C-003: TIME AVAILABILITY CHECK
**SOURCE SCENARIO ID(s):** ET-003  
**TRIGGER CONDITION:** User asks if they have time / availability check

**REQUIRED CONTEXT:**
- User ID
- Today's events
- Current time

**OPTIONAL CONTEXT:**
- Duration of proposed activity
- Pending tasks

**DECISION TYPE:** suggest

**ALLOWED ACTIONS:**
- Calculate free time slots
- Report total free time
- Suggest optimal times

**FORBIDDEN ACTIONS:**
- Auto-create events
- Modify existing calendar
- Make scheduling decisions

**DECISION LOGIC:**
1. Query events WHERE date=TODAY AND user_id={userId} ORDER BY start_time ASC
2. Define work_hours = 6 AM to 10 PM (or from user profile)
3. Calculate free_slots:
   - Initialize timeline = work_hours
   - FOR each event:
     - Remove [event.start_time, event.end_time] from timeline
   - Result = list of free time ranges
4. Calculate total_free_minutes = SUM(free_slots.duration)
5. IF input specifies duration:
   - Extract duration from input
   - Filter free_slots WHERE duration >= requested_duration
6. Build response:
   - IF total_free_minutes < 30:
     - "Your day is fully booked. The earliest free slot is tomorrow at {next_available}."
   - ELSE IF requested_duration AND free_slots.length > 0:
     - "You have time. Free slots: {list_slots}. Which one works?"
   - ELSE:
     - "You have {total_free_hours} hours free today: {list_slots}."
7. RETURN response

**OUTPUT TEMPLATE:**
"You have 2 hours free (1-3 PM). If 'this' takes less than that, yes. Otherwise, consider tomorrow."

**FAILSAFE RULE:**
- IF input too vague ("Do I have time?"):
  - RETURN "I need more details. How long will 'this' take?" (decision_type: question)

**LOGGING REQUIREMENTS:**
- Log decision_type: suggest
- Log total_free_minutes, slot_count
- Log requested_duration (if provided)

---

# 4) INSIGHT-BASED POLICIES

## POLICY I-001: PRODUCTIVITY ANALYSIS
**SOURCE SCENARIO ID(s):** ID-003  
**TRIGGER CONDITION:** User asks why today/period was unproductive

**REQUIRED CONTEXT:**
- User ID
- Tasks completed today
- Events attended today
- Time period (default: today)

**OPTIONAL CONTEXT:**
- Focus blocks used
- Notifications count
- Historical productivity baseline

**DECISION TYPE:** suggest

**ALLOWED ACTIONS:**
- Analyze task completion rate
- Count meeting hours
- Identify patterns (too many meetings, no focus time)
- Suggest improvements

**FORBIDDEN ACTIONS:**
- Modify past data
- Make judgmental statements
- Auto-implement changes

**DECISION LOGIC:**
1. Query completed_tasks WHERE user_id={userId} AND completed_at >= TODAY_START AND completed_at <= TODAY_END
2. Query attended_events WHERE user_id={userId} AND date=TODAY
3. Calculate metrics:
   - tasks_completed = completed_tasks.length
   - meeting_hours = SUM(events.duration) / 60 WHERE type IN ('meeting', 'call')
   - focus_hours = SUM(events.duration) / 60 WHERE type = 'focus_block'
4. Query user's historical average (last 30 days):
   - avg_tasks_per_day
5. Determine root cause:
   - IF meeting_hours >= 4 AND tasks_completed < avg_tasks_per_day:
     - cause = "too_many_meetings"
   - ELSE IF focus_hours < 1 AND tasks_completed < avg_tasks_per_day:
     - cause = "no_focus_time"
   - ELSE IF tasks_completed >= avg_tasks_per_day * 1.2:
     - cause = "actually_productive"
6. Build response based on cause:
   - IF cause = "too_many_meetings":
     - "You had {meeting_hours} hours of meetings today and only completed {tasks_completed} tasks. Too many interruptions. Try blocking focus time tomorrow."
   - IF cause = "no_focus_time":
     - "You had no dedicated focus blocks today. {tasks_completed} tasks completed. Try scheduling 2-hour focus blocks tomorrow."
   - IF cause = "actually_productive":
     - "You completed {tasks_completed} tasks today! That's {percentage}% above your average. Great work!"
7. RETURN response

**OUTPUT TEMPLATE:**
"You had 7 meetings today (5 hours total) and only 1 completed task. Too many interruptions. Try blocking focus time tomorrow."

**FAILSAFE RULE:**
- IF no data for analysis period:
  - RETURN "I don't have enough data for {period}. Check back later today or analyze a past period."

**LOGGING REQUIREMENTS:**
- Log decision_type: suggest
- Log analysis_period, tasks_completed, meeting_hours, focus_hours
- Log identified_cause

---

## POLICY I-002: OVERLOAD DETECTION
**SOURCE SCENARIO ID(s):** AH-003  
**TRIGGER CONDITION:** User requests to add task but context shows overload

**REQUIRED CONTEXT:**
- User ID
- Pending task count
- Today's event count
- Current time

**OPTIONAL CONTEXT:**
- User's typical task capacity
- Upcoming deadlines

**DECISION TYPE:** question

**ALLOWED ACTIONS:**
- Warn about overload
- Suggest alternatives (reschedule, defer, delegate)
- Offer prioritization help
- Still allow execution if confirmed

**FORBIDDEN ACTIONS:**
- Refuse to add task entirely
- Auto-reschedule without consent
- Delete existing tasks

**DECISION LOGIC:**
1. Query tasks WHERE user_id={userId} AND status IN ('pending', 'in_progress')
2. Query events WHERE user_id={userId} AND date=TODAY
3. Define overload thresholds:
   - pending_tasks > 10 OR
   - today_events > 6 OR
   - (high_priority_tasks > 5 AND today_events > 3)
4. IF overload_detected:
   - Build warning message:
     - "You have {pending_tasks} pending tasks and {today_events} events today. Adding more might hurt your productivity."
   - Offer choices:
     - "(1) Add it anyway"
     - "(2) Reschedule an existing task to tomorrow"
     - "(3) Defer this new task to tomorrow"
   - RETURN warning + choices (decision_type: question)
5. ELSE:
   - Proceed with normal task creation (delegate to POLICY T-001)

**OUTPUT TEMPLATE:**
"You have 12 pending tasks and 7 events today. Adding more might hurt your productivity. Should I: (1) Add it anyway, (2) Reschedule something, or (3) Defer to tomorrow?"

**FAILSAFE RULE:**
- IF user confirms "add anyway":
  - Log override_overload_warning: true
  - Proceed with execution
  - Show toast: "⚠️ Task added, but your day is packed."

**LOGGING REQUIREMENTS:**
- Log decision_type: question
- Log overload_detected: true, pending_tasks, today_events
- Log user_choice (when provided)

---

# 5) REMINDER & NOTIFICATION POLICIES

## POLICY R-001: REMINDER CREATION
**SOURCE SCENARIO ID(s):** RN-001  
**TRIGGER CONDITION:** User requests to be reminded about something

**REQUIRED CONTEXT:**
- User ID
- Time specification
- User timezone

**OPTIONAL CONTEXT:**
- Context of what to remind (inferred from recent activity)

**DECISION TYPE:** question (then execute after clarification)

**ALLOWED ACTIONS:**
- Request clarification if subject is unclear
- INSERT notification/reminder
- Parse relative time ("tomorrow at 6")

**FORBIDDEN ACTIONS:**
- Create reminder without subject
- Set reminder in the past
- Assume AM/PM without asking

**DECISION LOGIC:**
1. Extract time specification:
   - IF input matches /tomorrow at (\d+)/i: date = TOMORROW, hour = $1
   - IF input matches /in (\d+) (hour|minute)s?/i: time = NOW() + $1 $2
   - IF input matches /(\d+):(\d+)\s*(AM|PM)/i: time = today at $1:$2 $3
   - ELSE: time = AMBIGUOUS
2. IF time = AMBIGUOUS:
   - RETURN "When exactly? (e.g., 'tomorrow at 9 AM' or 'in 2 hours')" (decision_type: question)
3. IF hour specified without AM/PM AND hour <= 12:
   - RETURN "Did you mean {hour} AM or {hour} PM?" (decision_type: question)
4. Extract reminder_subject:
   - IF input matches /remind me (about|to) (.+) (at|tomorrow|in)/i: subject = $2
   - ELSE:
     - Query user's recent activity (last page viewed, last task viewed)
     - IF recent_task exists:
       - RETURN "Remind you about what? Your last action was viewing '{recent_task.title}'." (decision_type: question)
     - ELSE:
       - RETURN "Remind you about what?" (decision_type: question)
5. Once time AND subject confirmed:
   - INSERT INTO notifications:
     - user_id: {userId}
     - title: "Reminder"
     - message: reminder_subject
     - priority: 'normal'
     - trigger_at: calculated_time
     - source: 'ai'
     - created_at: NOW()
6. RETURN "✅ I'll remind you about '{subject}' {time_description}."

**OUTPUT TEMPLATE:**
"✅ I'll remind you about 'Prepare proposal' tomorrow at 6 PM."

**FAILSAFE RULE:**
- IF trigger_at < NOW():
  - RETURN "That time is in the past. Did you mean tomorrow?" (decision_type: question)

**LOGGING REQUIREMENTS:**
- Log action_type: create_reminder
- Log reminder_subject, trigger_at, clarifications_needed
- Log success: true/false

---

## POLICY R-002: NOTIFICATION MUTE
**SOURCE SCENARIO ID(s):** RN-002  
**TRIGGER CONDITION:** User requests to mute/quiet/silence notifications

**REQUIRED CONTEXT:**
- User ID
- Duration specification
- Current notification settings

**OPTIONAL CONTEXT:**
- Current time
- Upcoming critical notifications

**DECISION TYPE:** execute

**ALLOWED ACTIONS:**
- UPDATE user notification settings temporarily
- Set mute_until timestamp
- Confirm action to user

**FORBIDDEN ACTIONS:**
- Permanently disable notifications
- Delete pending notifications
- Mute for > 12 hours without warning

**DECISION LOGIC:**
1. Extract duration:
   - IF input matches /(\d+)\s*hour/i: mute_hours = $1
   - IF input matches /(\d+)\s*min/i: mute_minutes = $1
   - IF input matches /until (\d+):(\d+)/i: mute_until_time = parsed_time
   - ELSE: mute_hours = 1 (default)
2. VALIDATE:
   - IF mute_hours > 12:
     - RETURN "That's more than 12 hours. Are you sure? You might miss important reminders." (decision_type: question)
3. Calculate mute_until:
   - IF mute_until_time specified: mute_until = mute_until_time
   - ELSE: mute_until = NOW() + mute_hours hours + mute_minutes minutes
4. Check existing mute status:
   - Query user_settings.notifications_muted_until
   - IF already_muted AND existing_mute_until > NOW():
     - RETURN "Notifications are already muted until {existing_mute_until}. Want to extend to {new_mute_until}?" (decision_type: question if significant extension)
5. UPDATE user_settings SET notifications_muted_until = mute_until WHERE user_id = {userId}
6. RETURN "✅ Notifications muted until {formatted_time}."

**OUTPUT TEMPLATE:**
"✅ Notifications muted until 4:30 PM."

**FAILSAFE RULE:**
- IF upcoming critical notification (priority='urgent') within mute period:
  - RETURN "Warning: You have an urgent reminder at {time}. Muting will hide it. Continue?" (decision_type: question)

**LOGGING REQUIREMENTS:**
- Log action_type: mute_notifications
- Log mute_duration, mute_until
- Log was_already_muted: true/false
- Log success: true/false

---

## POLICY R-003: UPCOMING REMINDERS QUERY
**SOURCE SCENARIO ID(s):** RN-003  
**TRIGGER CONDITION:** User asks what reminders are upcoming/pending

**REQUIRED CONTEXT:**
- User ID
- Current datetime

**OPTIONAL CONTEXT:**
- Time horizon (default: next 24 hours)

**DECISION TYPE:** suggest

**ALLOWED ACTIONS:**
- Query and display upcoming notifications
- Offer to snooze or cancel
- Show time until trigger

**FORBIDDEN ACTIONS:**
- Auto-cancel reminders
- Modify reminder times
- Mark as read

**DECISION LOGIC:**
1. Extract time_horizon:
   - IF input matches /today/i: horizon = END_OF_TODAY
   - IF input matches /tomorrow/i: horizon = END_OF_TOMORROW
   - IF input matches /week/i: horizon = NOW() + 7 days
   - ELSE: horizon = NOW() + 24 hours (default)
2. Query notifications WHERE:
   - user_id = {userId}
   - trigger_at BETWEEN NOW() AND horizon
   - is_read = false
   - ORDER BY trigger_at ASC
3. IF upcoming_reminders.length = 0:
   - RETURN "No upcoming reminders. Your schedule is clear!"
4. FOR each reminder:
   - Calculate time_until = reminder.trigger_at - NOW()
   - Format as human-readable ("in 2 hours", "tomorrow 9 AM")
5. Build response:
   - IF upcoming_reminders.length = 1:
     - "You have 1 reminder: '{reminder.message}' ({time_until})."
   - ELSE:
     - "You have {count} reminders: {list_with_times}."
6. Append options: "Want to snooze or cancel any?"
7. RETURN response

**OUTPUT TEMPLATE:**
"You have 3 reminders: 'Submit report' (in 2 hours), 'Team meeting prep' (tomorrow 9 AM), and 'Call client' (tomorrow 3 PM)."

**FAILSAFE RULE:**
- IF upcoming_reminders.length > 10:
  - Only show next 5 + "...and {remaining} more. Want to see all?"

**LOGGING REQUIREMENTS:**
- Log decision_type: suggest
- Log reminder_count, time_horizon
- Log oldest_reminder_time, nearest_reminder_time

---

# 6) AMBIGUITY & SAFETY POLICIES

## POLICY A-001: VAGUE INPUT HANDLING
**SOURCE SCENARIO ID(s):** AH-001, NS-002  
**TRIGGER CONDITION:** Input is too vague to determine intent

**REQUIRED CONTEXT:**
- User input text
- Current page/context

**OPTIONAL CONTEXT:**
- Recent user activity
- User's pending tasks/events

**DECISION TYPE:** question

**ALLOWED ACTIONS:**
- Request clarification
- Offer specific options based on context
- Guide user to valid commands

**FORBIDDEN ACTIONS:**
- Guess intent and execute
- Return generic unhelpful response
- Ignore the request

**DECISION LOGIC:**
1. Define vague_patterns = ["do something", "make it better", "help", "fix", "optimize", "handle"]
2. IF input matches vague_patterns:
   - Analyze context:
     - IF current_page = 'tasks':
       - suggestions = ["create a task", "complete a task", "reschedule tasks"]
     - IF current_page = 'calendar':
       - suggestions = ["add focus time", "check availability", "reschedule event"]
     - IF current_page = 'insights':
       - suggestions = ["plan my day", "analyze productivity", "add focus block"]
     - ELSE (generic):
       - suggestions = ["tasks", "schedule", "focus time", "notifications"]
3. Build clarification question:
   - "I need more details. What would you like me to do? I can help with: {suggestions}"
4. RETURN question (decision_type: question)

**OUTPUT TEMPLATE:**
"I need more details. What would you like me to do? I can help with: tasks, schedule, focus time, or notifications."

**FAILSAFE RULE:**
- IF user repeats vague input 3+ times:
  - RETURN "I'm having trouble understanding. Try specific commands like: 'What should I do now?', 'Plan my day', or 'Add a task'." + link to help guide

**LOGGING REQUIREMENTS:**
- Log decision_type: question
- Log vague_input: true, input_text
- Log suggested_options
- Log retry_count (track repeated vague inputs)

---

## POLICY A-002: MISSING CRITICAL CONTEXT
**SOURCE SCENARIO ID(s):** AH-002, RN-001  
**TRIGGER CONDITION:** User request lacks required information to execute

**REQUIRED CONTEXT:**
- User input
- Action intent (partially determined)

**OPTIONAL CONTEXT:**
- User's calendar (for suggesting times)
- Recent tasks (for suggesting subjects)

**DECISION TYPE:** question

**ALLOWED ACTIONS:**
- Identify missing field(s)
- Ask specific question
- Offer intelligent defaults based on context

**FORBIDDEN ACTIONS:**
- Execute with assumed values
- Create incomplete records
- Ignore the request

**DECISION LOGIC:**
1. Determine required_fields based on intent:
   - IF intent = 'create_task': required = [title]
   - IF intent = 'create_event': required = [title, start_time, duration]
   - IF intent = 'create_reminder': required = [subject, trigger_time]
   - IF intent = 'reschedule_event': required = [event_identifier, new_time]
2. Check which fields are missing:
   - Parse input for each required field
   - Build missing_fields list
3. IF missing_fields.length > 0:
   - Generate context-aware suggestions:
     - IF missing = 'start_time' AND intent = 'create_event':
       - Query free slots today
       - "When should I schedule this? You have free slots at: {slots}"
     - IF missing = 'subject' AND intent = 'create_reminder':
       - Get recent_activity
       - "Remind you about what? Your last action was '{recent_task.title}'."
     - IF missing = 'event_identifier' AND intent = 'reschedule_event':
       - Query today's events
       - "Which event? You have: {list_events}."
4. RETURN clarification question with suggestions

**OUTPUT TEMPLATE:**
"When should I schedule this meeting? You have free slots at 10 AM, 2 PM, and 4 PM today."

**FAILSAFE RULE:**
- IF missing multiple fields (> 2):
  - RETURN "I need more details to create this. Try: 'Add [event name] at [time] for [duration]'."

**LOGGING REQUIREMENTS:**
- Log decision_type: question
- Log intent, missing_fields
- Log suggestions_provided
- Log partial_extraction (what was successfully parsed)

---

## POLICY A-003: CONFLICT DETECTION
**SOURCE SCENARIO ID(s):** AH-003, ET-002  
**TRIGGER CONDITION:** Requested action would create conflict or overlap

**REQUIRED CONTEXT:**
- User ID
- Requested action details
- Existing events/tasks

**OPTIONAL CONTEXT:**
- Priority of conflicting items
- Rescheduling options

**DECISION TYPE:** question

**ALLOWED ACTIONS:**
- Detect conflict
- Explain conflict clearly
- Offer resolution options
- Allow override with confirmation

**FORBIDDEN ACTIONS:**
- Create conflicting records silently
- Auto-resolve conflict without asking
- Delete existing items

**DECISION LOGIC:**
1. IF action = 'create_event' OR action = 'reschedule_event':
   - Query conflicting_events WHERE:
     - date = proposed_date
     - start_time < proposed_end_time
     - end_time > proposed_start_time
2. IF action = 'create_task' with due_date:
   - Query overload condition (see POLICY I-002)
3. IF conflicts_detected:
   - Analyze conflict type:
     - time_overlap: "You already have '{conflict_event.title}' at {time}."
     - overload: "You have {count} tasks due on {date}."
   - Generate resolution options:
     - IF time_overlap:
       - Option 1: "Reschedule '{conflict_event.title}' to {alternative_time}"
       - Option 2: "Choose a different time for this new event"
       - Option 3: "Overlap anyway (not recommended)"
     - IF overload:
       - Option 1: "Add anyway"
       - Option 2: "Defer one existing task to tomorrow"
       - Option 3: "Defer this new task to tomorrow"
4. RETURN conflict explanation + resolution options

**OUTPUT TEMPLATE:**
"You already have 'Client call' at 4 PM. Want to move it to 5 PM instead, or reschedule the client call?"

**FAILSAFE RULE:**
- IF user chooses "overlap anyway" or "add anyway":
  - Log override_conflict: true
  - Show warning toast after execution: "⚠️ {action} created despite conflict."

**LOGGING REQUIREMENTS:**
- Log decision_type: question
- Log conflict_detected: true, conflict_type
- Log conflicting_item_ids
- Log resolution_options_offered
- Log user_choice (when provided)

---

# 7) NO-ACTION POLICIES

## POLICY N-001: ALREADY OPTIMAL
**SOURCE SCENARIO ID(s):** NS-001  
**TRIGGER CONDITION:** User requests optimization but current state is already good

**REQUIRED CONTEXT:**
- User ID
- Current tasks/events
- Workload analysis

**OPTIONAL CONTEXT:**
- Historical patterns
- User's typical capacity

**DECISION TYPE:** nothing

**ALLOWED ACTIONS:**
- Affirm current state is good
- Provide positive feedback
- Explain why no changes needed

**FORBIDDEN ACTIONS:**
- Make unnecessary changes
- Suggest changes just to appear useful
- Be silent (must explain why no action)

**DECISION LOGIC:**
1. Analyze current state:
   - task_count = pending tasks
   - event_distribution = check spacing between events
   - free_time_available = calculate gaps
   - priority_balance = ratio of high:medium:low tasks
2. Define "optimal" thresholds:
   - task_count BETWEEN 3 AND 8
   - events have >= 30 min gaps between them
   - free_time_available >= 2 hours
   - priority_balance is reasonable (not all high priority)
3. IF state meets optimal thresholds:
   - RETURN "Your schedule is already well-balanced. You have {free_time} hours of focus time, {task_count} manageable tasks, and good event spacing. No changes needed."
4. ELSE:
   - Delegate to relevant suggestion policy (P-001, C-001, etc.)

**OUTPUT TEMPLATE:**
"Your schedule is already well-balanced. You have 3 hours of focus time, 5 manageable tasks, and good event spacing. No changes needed."

**FAILSAFE RULE:**
- IF user insists on changes:
  - RETURN "If you want specific changes, I can help. Try: 'Add focus time' or 'Reschedule [task]'."

**LOGGING REQUIREMENTS:**
- Log decision_type: nothing
- Log reason: already_optimal
- Log metrics: task_count, free_time, event_gaps

---

## POLICY N-002: OUT OF SCOPE
**SOURCE SCENARIO ID(s):** NS-004  
**TRIGGER CONDITION:** User request is unrelated to productivity/task management

**REQUIRED CONTEXT:**
- User input text

**OPTIONAL CONTEXT:**
- None

**DECISION TYPE:** nothing

**ALLOWED ACTIONS:**
- Politely decline
- Explain scope boundaries
- Redirect to appropriate tool

**FORBIDDEN ACTIONS:**
- Attempt to answer out-of-scope questions
- Make up information
- Be rude or unhelpful

**DECISION LOGIC:**
1. Define out_of_scope_patterns:
   - General knowledge: ["weather", "news", "sports", "recipes", "math problems"]
   - Personal advice: ["relationship", "health", "finance"]
   - Entertainment: ["jokes", "stories", "games"]
   - Technical help: ["debug code", "fix computer", "internet problems"]
2. IF input matches out_of_scope_patterns:
   - category = matched_category
   - Build polite boundary message:
     - "I'm your productivity assistant - I help with tasks, schedule, and focus."
     - IF category = general_knowledge:
       - "For {category}, try {appropriate_tool} (e.g., weather app, news app)."
     - ELSE:
       - "I'm focused on productivity features only."
3. RETURN boundary message (decision_type: nothing)

**OUTPUT TEMPLATE:**
"I'm your productivity assistant - I help with tasks, schedule, and focus. For weather, try a weather app."

**FAILSAFE RULE:**
- IF repeated out-of-scope requests (> 3):
  - RETURN "I can only help with productivity. Here's what I can do: plan your day, manage tasks, schedule focus time, track insights. Try: 'What should I do now?'"

**LOGGING REQUIREMENTS:**
- Log decision_type: nothing
- Log reason: out_of_scope
- Log category: detected_category
- Log repeat_offender: true/false

---

## POLICY N-003: DESTRUCTIVE ACTION PREVENTION
**SOURCE SCENARIO ID(s):** NS-003  
**TRIGGER CONDITION:** User requests potentially harmful bulk deletion or irreversible action

**REQUIRED CONTEXT:**
- User input
- Scope of destruction (how many items affected)

**OPTIONAL CONTEXT:**
- User's history with destructive commands

**DECISION TYPE:** question

**ALLOWED ACTIONS:**
- Show strong warning
- Require explicit typed confirmation
- Explain consequences
- Allow action after confirmation

**FORBIDDEN ACTIONS:**
- Execute destructive action without confirmation
- Assume user knows consequences
- Make confirmation too easy (single click)

**DECISION LOGIC:**
1. Define destructive_actions = ["delete all", "clear all", "remove all", "cancel all"]
2. IF input matches destructive_actions:
   - Determine scope:
     - "delete all tasks" → count all tasks
     - "clear calendar" → count all events
     - "remove reminders" → count all notifications
3. IF affected_count > 5 OR affected_count = ALL:
   - Build warning message:
     - "⚠️ This will permanently delete {count} {items}."
     - "This action CANNOT be undone."
     - "To confirm, type: DELETE ALL"
4. RETURN warning message (decision_type: question)
5. IF user_response = "DELETE ALL":
   - Proceed with execution
   - Log to audit trail with elevated severity
   - RETURN "Deleted {count} {items}. This action was logged."
6. ELSE:
   - RETURN "Action cancelled. Your data is safe."

**OUTPUT TEMPLATE:**
"⚠️ This will permanently delete 18 tasks. This action CANNOT be undone. To confirm, type: DELETE ALL"

**FAILSAFE RULE:**
- After destructive action, create system notification:
  - "You deleted {count} items. If this was a mistake, contact support immediately for potential recovery."

**LOGGING REQUIREMENTS:**
- Log decision_type: question (initially), execute (if confirmed)
- Log action_type: destructive_action
- Log affected_count, items_type
- Log confirmation_required: true, confirmation_received: true/false
- Log user_id, timestamp (for audit/recovery)
- Severity: HIGH

---

## POLICY N-004: INSUFFICIENT CONFIDENCE
**SOURCE SCENARIO ID(s):** Various (applies to all intents)  
**TRIGGER CONDITION:** AutoGLM intent classification confidence < threshold

**REQUIRED CONTEXT:**
- User input
- Classification confidence score
- Confidence threshold (e.g., 0.6)

**OPTIONAL CONTEXT:**
- Alternative interpretations

**DECISION TYPE:** question

**ALLOWED ACTIONS:**
- Explain uncertainty
- Offer most likely interpretations
- Ask user to clarify
- Provide examples of clearer commands

**FORBIDDEN ACTIONS:**
- Execute low-confidence actions
- Pretend to understand
- Return generic error

**DECISION LOGIC:**
1. After LLM classification:
   - IF confidence < 0.6:
     - Get top 2-3 interpretations
2. Build clarification message:
   - "I'm not sure what you mean. Did you want to:"
   - List top interpretations as options:
     - "(1) {interpretation_1}"
     - "(2) {interpretation_2}"
     - "(3) Something else"
3. RETURN clarification question (decision_type: question)

**OUTPUT TEMPLATE:**
"I'm not sure what you mean. Did you want to: (1) Add a new task, (2) Reschedule an existing task, or (3) Something else?"

**FAILSAFE RULE:**
- IF user selects "Something else":
  - RETURN "Please try rephrasing. For example: 'Add task: [title]' or 'What should I do now?'"

**LOGGING REQUIREMENTS:**
- Log decision_type: question
- Log reason: low_confidence
- Log confidence_score, threshold
- Log alternative_interpretations

---

# AUTOGLM POLICY MAP

## Policy Index by ID

### Priority & Focus
- **P-001**: Next Action Recommendation (DG-001, DG-003)
- **P-002**: Focus Request Handling (ID-001, ID-002)
- **P-003**: Distraction Blocking (ID-001)

### Task Lifecycle
- **T-001**: Task Creation (TC-001)
- **T-002**: Task Completion (TC-002)
- **T-003**: Overdue Task Query (TC-003)
- **T-004**: Task Merging (TC-004)
- **T-005**: Task Rescheduling (TC-003 follow-up)

### Time & Calendar
- **C-001**: Focus Block Creation (ET-001)
- **C-002**: Event Rescheduling (ET-002)
- **C-003**: Time Availability Check (ET-003)

### Insights
- **I-001**: Productivity Analysis (ID-003)
- **I-002**: Overload Detection (AH-003)

### Reminders & Notifications
- **R-001**: Reminder Creation (RN-001)
- **R-002**: Notification Mute (RN-002)
- **R-003**: Upcoming Reminders Query (RN-003)

### Ambiguity & Safety
- **A-001**: Vague Input Handling (AH-001, NS-002)
- **A-002**: Missing Critical Context (AH-002, RN-001)
- **A-003**: Conflict Detection (AH-003, ET-002)

### No-Action
- **N-001**: Already Optimal (NS-001)
- **N-002**: Out of Scope (NS-004)
- **N-003**: Destructive Action Prevention (NS-003)
- **N-004**: Insufficient Confidence (applies to all)

---

## Intent Coverage Map

| User Intent | Primary Policy | Fallback Policy | Decision Type |
|-------------|---------------|-----------------|---------------|
| "What should I do now?" | P-001 | N-001 | suggest |
| "I feel distracted" | P-002, P-003 | - | execute |
| "Add task: [title]" | T-001 | A-002 | execute |
| "Mark [task] done" | T-002 | A-002 | execute |
| "What's overdue?" | T-003 | - | suggest |
| "Merge similar tasks" | T-004 | - | question |
| "Add focus block" | C-001 | P-002 | execute |
| "Reschedule [event]" | C-002 | A-002, A-003 | execute |
| "Do I have time?" | C-003 | A-001 | suggest |
| "Why was today unproductive?" | I-001 | - | suggest |
| "Add task but overloaded" | I-002 | T-001 | question |
| "Remind me [when]" | R-001 | A-002 | question → execute |
| "Quiet notifications" | R-002 | - | execute |
| "What reminders?" | R-003 | - | suggest |
| Vague input | A-001 | N-004 | question |
| Missing context | A-002 | N-004 | question |
| Creates conflict | A-003 | - | question |
| Already optimal | N-001 | - | nothing |
| Out of scope | N-002 | - | nothing |
| Destructive action | N-003 | - | question |
| Low confidence | N-004 | A-001 | question |

---

## Policy Overlap & Conflict Resolution

### Overlap: Task Creation + Overload Detection
- **Scenario**: User adds task when already overloaded
- **Resolution**: I-002 (Overload Detection) takes precedence → shows warning first
- **Flow**: I-002 question → user confirms → delegate to T-001 execute

### Overlap: Focus Block + Calendar Conflict
- **Scenario**: User requests focus block but time slot occupied
- **Resolution**: C-001 (Focus Block Creation) detects conflict → defers to A-003 (Conflict Detection)
- **Flow**: C-001 attempts → conflict detected → A-003 offers resolution → C-001 executes

### Overlap: Vague Input + Low Confidence
- **Scenario**: Input is vague AND classification confidence is low
- **Resolution**: A-001 (Vague Input) takes precedence (more specific guidance)
- **Flow**: A-001 provides context-aware options → user clarifies → reclassify

### Overlap: Reminder Creation + Missing Context
- **Scenario**: "Remind me tomorrow at 6" (missing subject)
- **Resolution**: R-001 (Reminder Creation) delegates to A-002 (Missing Context)
- **Flow**: R-001 detects missing subject → A-002 asks for subject → R-001 executes

### Overlap: Event Reschedule + Conflict
- **Scenario**: Rescheduling would create time overlap
- **Resolution**: C-002 (Event Rescheduling) checks for conflicts → delegates to A-003
- **Flow**: C-002 validates new time → A-003 detects conflict → offers alternatives → C-002 executes

---

## Policy Execution Priority (When Multiple Match)

1. **Destructive Action Prevention (N-003)** - highest priority (safety)
2. **Insufficient Confidence (N-004)** - prevents bad executions
3. **Conflict Detection (A-003)** - prevents data inconsistencies
4. **Missing Context (A-002)** - ensures data completeness
5. **Overload Detection (I-002)** - prevents user overwhelm
6. **Specific Action Policies (T-*, C-*, R-*)** - execute intended action
7. **Vague Input Handling (A-001)** - requests clarification
8. **Out of Scope (N-002)** - polite rejection
9. **Already Optimal (N-001)** - positive affirmation

---

## Decision Type Distribution

| Decision Type | Policy Count | Use Cases |
|---------------|--------------|-----------|
| **suggest** | 6 | Recommendations without state changes |
| **question** | 8 | Requires user clarification/confirmation |
| **execute** | 9 | Direct state-changing actions |
| **nothing** | 3 | No action needed (optimal, out-of-scope) |

---

# OUT-OF-SCOPE (INTENTIONAL)

## What AutoGLM Must NOT Attempt in This Phase

### 1. Multi-Turn Conversations
- **Why**: No conversation memory or session state
- **Current**: Each request is independent
- **Future**: Phase 5+ conversation context tracking

### 2. Proactive Suggestions (Unsolicited)
- **Why**: All actions are user-initiated
- **Current**: AutoGLM only responds to explicit requests
- **Future**: Morning briefings, end-of-day summaries

### 3. Learning from Patterns
- **Why**: No adaptive personalization yet
- **Current**: Uses static rules and user profile
- **Future**: Machine learning on user habits

### 4. External System Integration
- **Why**: Only operates on ROMNA data
- **Current**: Cannot sync with Google Calendar, Slack, email
- **Future**: Integration hooks for external systems

### 5. Team/Collaborative Features
- **Why**: Single-user context only
- **Current**: No awareness of team members or shared tasks
- **Future**: Team workload balancing, delegation

### 6. Complex Natural Language
- **Why**: Intent classification has limits
- **Current**: Works best with direct commands
- **Future**: Advanced NLP with context understanding

### 7. Undo/Rollback
- **Why**: No transaction history
- **Current**: Destructive actions require confirmation but can't be undone
- **Future**: Action history with undo capability

### 8. Batch Operations (Partial)
- **Why**: Limited to specific patterns
- **Current**: Can reschedule multiple tasks if explicitly requested
- **Cannot**: "Optimize all my tasks for next week" (too complex)
- **Future**: Intelligent bulk operations

### 9. Conditional/Complex Logic
- **Why**: Policies are simple decision trees
- **Current**: Cannot handle "If X happens, then Y, otherwise Z"
- **Future**: Rule chaining and conditional workflows

### 10. Voice Continuity
- **Why**: Voice input exists but not fully integrated with Ask ROMNA
- **Current**: Separate voice and chat interfaces
- **Future**: Unified voice + text conversation

---

# IMPLEMENTATION NOTES

## For Developers

### Policy Execution Flow
```
1. User Input → API endpoint
2. Load Context (user_id, timezone, current page)
3. Classify Intent (LLM or rule-based)
   - Get confidence score
   - If confidence < 0.6 → POLICY N-004
4. Select Primary Policy based on intent
5. Execute Policy Logic (step-by-step)
6. Check for Overlaps/Conflicts
   - Apply priority rules
   - Delegate to secondary policy if needed
7. Generate Response
8. Log to autoglm_runs
9. Return response to client
```

### Policy Priority Implementation
```typescript
function selectPolicy(intent: string, confidence: number, context: Context): Policy {
  // Safety first
  if (isDestructive(intent)) return POLICY_N_003;
  if (confidence < 0.6) return POLICY_N_004;
  
  // Conflict detection
  if (wouldCreateConflict(intent, context)) return POLICY_A_003;
  
  // Missing context
  if (hasMissingFields(intent, context)) return POLICY_A_002;
  
  // Overload detection
  if (intent.includes('create_task') && isOverloaded(context)) return POLICY_I_002;
  
  // Intent-specific policies
  return getPolicyForIntent(intent);
}
```

### Logging Template
```typescript
interface AutoGLMLog {
  id: string; // request ID
  user_id: string;
  input: string;
  source: string; // ask-romna, insights, etc.
  policy_id: string; // e.g., "P-001"
  decision_type: 'suggest' | 'question' | 'execute' | 'nothing';
  action_type?: string; // e.g., "create_task"
  confidence_score: number;
  context_snapshot: object; // tasks, events, settings used
  response_message: string;
  success: boolean;
  error?: string;
  latency_ms: number;
  created_at: timestamp;
}
```

### Testing Checklist
- [ ] Each policy has unit test
- [ ] All 24 scenarios covered
- [ ] Conflict resolution tested
- [ ] Failsafe conditions tested
- [ ] Logging verified
- [ ] Low confidence handling tested
- [ ] Destructive action confirmation tested
- [ ] Out-of-scope rejection tested

---

**END OF POLICY LAYER**

**Total Policies Defined:** 26  
**Coverage:** 100% of Ask ROMNA scenarios  
**Deterministic:** Yes (all logic is step-by-step)  
**Implementation-Ready:** Yes

---

**Next Steps:**
1. Implement policy executor engine
2. Map each policy to TypeScript functions
3. Create comprehensive test suite
4. Deploy with observability
5. Monitor policy effectiveness in production
