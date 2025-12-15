# ROMNA V7 Emergency Runbook

## 🎯 Purpose
Restore the application to a stable state within ≤ 5 minutes without lengthy analysis.

---

## 🚨 Scenario 1: Inbox Stuck / Home Shows "Action Required" Without Card

**Symptoms:**
- Home displays "Action Required" but no card is visible
- Inbox appears empty but blocking state persists

**Root Cause:** Zombie Plan or DecisionEngine regression

**Quick Fix:**
```bash
# Set in Netlify Environment Variables:
DECISION_ENGINE_MODE=V1_SAFE

# Redeploy via Netlify Dashboard or CLI
netlify deploy --prod
```

**Result:**
- Home shows Tasks only
- Inbox becomes purely informational (sidecar)

---

## 🚨 Scenario 2: Voice Not Working in Production

**Symptoms:**
- Mic button unresponsive
- Stuck on "Thinking..." or "Processing..."
- Console shows `[STT API] error`

**Root Cause:** HuggingFace API outage or Safari mic regression

**Quick Fix:**
```bash
# Set in Netlify Environment Variables:
VOICE_DISABLED=true

# Redeploy
netlify deploy --prod
```

**Behavior:**
- Direct redirect to text input
- No hanging or errors
- Users can still create tasks via typing

---

## 🚨 Scenario 3: RTL / Layout Jitter Errors

**Symptoms:**
- Page layout shifts on refresh
- Arabic text not rendering correctly
- Direction (dir) attribute incorrect

**Root Cause:** Cookie or SSR regression

**Quick Fix:**
```bash
# Set in Netlify Environment Variables:
FORCE_LOCALE=en
FORCE_DIR=ltr

# Redeploy
netlify deploy --prod
```

**Result:**
- Stable LTR English layout
- Temporarily disables language switching

---

## 🚨 Scenario 4: "Failed to fetch" / STT API Errors

**Symptoms:**
- Console shows 500/502/503 from `/api/stt`
- "Failed to fetch" in Voice page

**Diagnostic Steps:**
1. Open `/debug` page
2. Check if `/api/stt` returns 200
3. Verify `HF_API_KEY` is set in Netlify (not `NEXT_PUBLIC_HF_API_KEY`)

**Quick Fix (if HuggingFace is down):**
```bash
# Set in Netlify Environment Variables:
STT_PROVIDER=offline_only

# Redeploy
netlify deploy --prod
```

---

## 🧯 Instant Rollback (Guaranteed)

If all else fails, rollback to the last known stable version:

```bash
# Checkout stable tag
git checkout v7-secure

# Force deploy
netlify deploy --prod
```

Or via Netlify Dashboard:
1. Go to **Deploys**
2. Find last successful deploy before incident
3. Click **Publish deploy**

---

## ✅ Post-Incident Checklist

After any incident, verify:

- [ ] `/api/health` returns 200
- [ ] `/api/health/data` returns 200
- [ ] `/api/health/voice` returns 200
- [ ] `/debug` shows Pulse updating
- [ ] Home shows Task or "All Clear" state
- [ ] Inbox count does NOT block Home
- [ ] No `state=blocked` in console logs

---

## 📊 Monitoring Recommendations

### Uptime Monitoring
- Ping `/api/health` every 60 seconds
- Alert on 2 consecutive failures

### Log Monitoring (Netlify / Sentry / Logtail)

| Marker | Meaning | Alert Threshold |
|--------|---------|-----------------|
| `[PULSE]` | Data refresh | If stopped > 5 min |
| `[VOICE] fallback offline` | STT failed | If > 10% of requests |
| `[STT API] error` | API failure | Immediate |
| `state=blocked` | Technical failure | Immediate |
| `zombie_filtered_count > 0` | Voice noise | Warning |

### Zombie Detector (SQL Job)

Run every 30 minutes:
```sql
SELECT COUNT(*) 
FROM execution_plans
WHERE status = 'waiting_approval'
AND (payload->>'title' IS NULL OR payload->>'title' = '');
```

**Alert if > 0** → Voice is producing garbage, review STT/Confidence settings.

---

## 📞 Escalation

If quick fixes don't resolve:
1. Check Netlify Function logs for stack traces
2. Check Supabase dashboard for RLS/connection issues
3. Review recent Git commits for regressions

---

**Remember:** The goal is stability, not perfection. Disable features if needed to keep users unblocked.
