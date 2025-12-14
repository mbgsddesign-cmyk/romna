# ROMNA V6 Netlify Deploy Checklist

## Pre-Deployment

### 1. Code Verification
- [ ] `npm run build` succeeds locally (exit code 0)
- [ ] `npm run verify:runtime` passes key checks
- [ ] No TypeScript errors in console
- [ ] `/debug` page shows correct config

### 2. Environment Variables
Set in Netlify Site Settings → Environment Variables:

**Required:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `HF_API_KEY` (server-only, NO `NEXT_PUBLIC_` prefix)
- [ ] `GEMINI_API_KEY` (server-only)

**Optional:**
- [ ] `HF_STT_MODEL` (default: `openai/whisper-small`)
- [ ] `CRON_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `TWILIO_*` variables (if WhatsApp enabled)

### 3. netlify.toml
Verify file contains:
```toml
[build]
command = "npm run build"
publish = ".next"

[[plugins]]
package = "@netlify/plugin-nextjs"
```

---

## Post-Deployment Verification

### 4. Basic Checks
- [ ] Home page loads without errors
- [ ] `/debug` page shows API config
- [ ] No console errors about "Failed to fetch"

### 5. API Route Tests
Test these endpoints return valid responses:

| Endpoint | Method | Expected |
|----------|--------|----------|
| `/api/stt` | POST (empty) | 400 with error message |
| `/api/plans/skip` | POST (no auth) | 401 |
| `/api/actions/approve` | POST (no auth) | 401 |

### 6. Voice Flow
- [ ] Tap mic → recording starts (console: `[VOICE] recorder started`)
- [ ] Speak → processing happens (console: `[STT]` logs)
- [ ] Result or fallback shown (no stuck "Thinking...")

### 7. Localization
- [ ] Set `romna_locale=ar` cookie → page loads RTL
- [ ] No layout jitter on refresh
- [ ] Arabic text uses Cairo font

---

## Troubleshooting

### "Failed to fetch" in Voice
1. Check Network tab for `/api/stt` request
2. Verify response is not 500/503
3. Check Netlify Function logs for errors
4. Verify `HF_API_KEY` is set (not `NEXT_PUBLIC_HF_API_KEY`)

### Blank Page
1. Check browser console for errors
2. Verify Supabase keys are correct
3. Check Netlify build logs for SSR errors

### Ghost Cards
1. Navigate to `/debug` → check Plans count
2. Snooze action should set `skip_until`
3. Check DecisionEngine respects skip_until

---

## GO / NO-GO

Before marking deployment complete:

- [ ] Voice never stuck on "Thinking..."
- [ ] No ghost cards blocking Home
- [ ] RTL stable (no jitter)
- [ ] Settings page loads without crash
- [ ] Console shows `[PULSE]`, `[STT]`, `[VOICE]` markers

✅ **All checks pass = PRODUCTION READY**
