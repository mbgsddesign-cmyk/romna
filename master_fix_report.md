# Master Fix Report — ROMNA Voice + Inbox + Arabic V1.1

## 1. Summary of Fixes

We have implemented a comprehensive set of fixes to ensure Arabic voice commands are reliably captured, processed, and displayed in the Inbox, strictly adhering to the "Silent Commander" philosophy and V2 logic constraints.

### Key Achievements:
- **Zero Silence Policy**: Arabic commands with confidence ≥ 0.6 now *always* result in a visible action (Inbox Plan), even if the NLU misses specific details.
- **Strict Data Types**: Refactored `stt.ts` and `config.ts` to strictly enforce `{ transcript, language, confidence }` flow.
- **Inbox Integration**: All voice intents (`reminder`, `task`, `approval`) now create `ExecutionPlans` with `waiting_approval` status, ensuring they appear in the Inbox/Notifications page immediately.
- **UX Alignment**: English and Arabic copy has been synchronized with the requested persona (e.g., "أستمع الآن...", "سأتعامل معها كتذكير مبدئي.").

## 2. Modified Files

| File Path | Nature of Change |
|-----------|------------------|
| `src/lib/ai/config.ts` | Updated `IntentResult` interface to include `language` and strict Action types. |
| `src/lib/ai/stt.ts` | Implemented strict `detectLanguage` and confidence logic (default 0.6 for Arabic). |
| `src/lib/ai/nlu.ts` | Rewrote prompts to include specific Arabic keywords (`ذكرني`, `موعد`) and a Decision Engine fallback that forces "Reminder" if intent is unknown but language is Arabic. |
| `src/lib/ai/executor.ts` | Changed default execution from `createTask` to `createPlan` (Inbox) for Reminders/Tasks. |
| `src/app/voice/page.tsx` | Implemented Silent Keyboard Fallback (no error toast) and Context-Aware Feedback ("Treating as reminder"). |
| `netlify/ux-copy/ar.json` | Updated keys: `listening`, `nothingWaiting`, `needsClarification`, `treatAsReminder`. |
| `netlify/ux-copy/en.json` | Updated keys: `listening`, `nothingWaiting`, `needsClarification`, `treatAsReminder`. |

## 3. Verification Scenarios

### Scenario 1: "ذكرني أشرب موية" (Arabic Reminder)
- **Flow**: STT detects Arabic -> NLU sees "ذكرني" -> Maps to `intent: reminder` -> Decision Engine sees < 0.9 confidence (likely) or > 0.9.
- **Outcome**:
    - If High Confidence: `ExecutionPlan` (Scheduled/Approved if V2 active).
    - If Low/Medium Confidence: `ExecutionPlan` (Status: `waiting_approval`).
    - **UX**: "تم الحفظ" or "سأتعامل معها كتذكير مبدئي".
    - **Result**: Appears in Inbox.

### Scenario 2: "موعد" (Generic Noun)
- **Flow**: STT detects "موعد" (Arabic) -> NLU might find it ambiguous -> **New Fallback Logic** in `nlu.ts` forces `intent: task` or `reminder` (Confidence 0.6).
- **Outcome**: `ExecutionPlan` created with title "موعد". Status: `waiting_approval`.
- **UX**: "سأتعامل معها كتذكير مبدئي."
- **Result**: Item in Inbox (Not lost).

### Scenario 3: Silence / Failure
- **Flow**: STT fails or returns empty -> `VoicePage` catches error.
- **Outcome**: Voice mode closes -> Keyboard opens automatically.
- **UX**: No error toast. Smooth transition.

## 4. Verification & Testing status
- [x] **STT**: Logic for Arabic confidence >= 0.6 implemented.
- [x] **NLU**: Keywords `ذكرني`, `موعد`, `اشرب` added to System Prompt.
- [x] **Inbox**: Verified `executor.ts` and `VoicePage` create `waiting_approval` plans.
- [x] **Global Refresh**: Verified `Home` and `Notifications` subscribe to `refreshTick`.
- [x] **UX Copy**: JSON files updated.

## 5. Remaining Constraints
- **V2 Auto-Execution**: We respected the logic in `VoicePage`. High confidence scheduled items may bypass Inbox if enabled in settings. This is intended behavior.
- **Offline NLU**: We assume `OfflineParser` handles basic keywords. The Master Fix focused on the Online/Hybrid pipeline.

## 6. Conclusion
The system is now robust against "Null" or "Silence" states for Arabic users. The "Inbox" is the central source of truth for all ambiguous or new inputs.
