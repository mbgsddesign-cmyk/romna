# ROMNA V7 Netlify Deploy Checklist

## Pre-Deployment

### 1. Code Verification
- [ ] `npm run build` succeeds locally (exit code 0)
- [ ] No TypeScript errors in console
- [ ] `/debug` page shows correct config

### 2. Security Verification (CRITICAL)
- [ ] `NEXT_PUBLIC_GEMINI_API_KEY` is **NOT** set in Netlify
- [ ] `NEXT_PUBLIC_HUGGINGFACE_API_KEY` is **NOT** set in Netlify
- [ ] `src/lib/ai/config.ts` does NOT reference `NEXT_PUBLIC_` for AI keys

### 3. Environment Variables
Set in Netlify Site Settings → Environment Variables:

**Required:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `HF_API_KEY` (server-only, NO `NEXT_PUBLIC_` prefix)
- [ ] `GEMINI_API_KEY` (server-only)

**Optional:**
- [ ] `CRON_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `TWILIO_*` variables (if WhatsApp enabled)

### 4. netlify.toml
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

### 5. Basic Checks
- [ ] Home page loads without errors
- [ ] `/debug` page shows API config
- [ ] No console errors about "Failed to fetch"

### 6. API Route Tests
Test these endpoints return valid responses:

| Endpoint | Method | Expected |
|----------|--------|----------|
| `/api/stt` | POST (empty) | 400 with error message |
| `/api/plans/skip` | POST (no auth) | 401 |
| `/api/actions/approve` | POST (no auth) | 401 |

### 7. Voice Flow
- [ ] Tap mic → recording starts (console: `[VOICE] recorder started`)
- [ ] Speak → processing happens (console: `[STT]` logs)
- [ ] Result or fallback shown (no stuck "Thinking...")

### 8. DecisionEngine V2 Verification
- [ ] Overdue task shows as Primary (even with Inbox items)
- [ ] Zombie plans (empty title) are filtered from Inbox
- [ ] Snoozed items do not appear

### 9. Localization
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
1. Navigate to `/debug` → check Zombie count
2. Snooze action should set `skip_until`
3. Check DecisionEngine respects skip_until

---

## Monitoring Setup (Post-Deploy)

### UptimeRobot Configuration

1. Create account at [uptimerobot.com](https://uptimerobot.com)
2. Add new HTTP(s) monitor:
   - **URL**: `https://<YOUR_DOMAIN>/api/health`
   - **Interval**: 60 seconds
   - **Alert Contact**: Your email/Slack
3. Alert conditions:
   - Alert after **2 consecutive failures**
   - Alert on recovery

### Zombie Detector Setup

1. Set `CRON_SECRET` in Netlify environment variables
2. Configure scheduled trigger (every 30 min):
   - **URL**: `https://<YOUR_DOMAIN>/api/monitor/zombies`
   - **Method**: POST
   - **Header**: `Authorization: Bearer <CRON_SECRET>`
3. See `docs/MONITORING.md` for full setup instructions

---

## GO / NO-GO

Before marking deployment complete:

- [ ] Voice never stuck on "Thinking..."
- [ ] No ghost cards blocking Home
- [ ] RTL stable (no jitter)
- [ ] Settings page loads without crash
- [ ] Console shows `[PULSE]`, `[STT]`, `[VOICE]` markers
- [ ] **NO API keys exposed in browser bundle**
- [ ] `/api/health` returns 200
- [ ] `/api/health/data` returns 200
- [ ] `/api/health/voice` returns 200

✅ **All checks pass = PRODUCTION READY**

