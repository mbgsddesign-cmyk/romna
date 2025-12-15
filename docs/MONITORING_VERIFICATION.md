# ROMNA V7 Monitoring Verification

## Manual Test Commands

Replace `<YOUR_DOMAIN>` with your Netlify URL (e.g., `romna.netlify.app`).

### 1. Basic Health Check

```bash
curl https://<YOUR_DOMAIN>/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": 1702684800000,
  "version": "v7",
  "uptime": 12345.67
}
```

### 2. Data Health Check

```bash
curl https://<YOUR_DOMAIN>/api/health/data
```

**Expected Response (Success):**
```json
{
  "status": "ok",
  "latency_ms": 45,
  "timestamp": 1702684800000
}
```

**Expected Response (Failure):**
```json
{
  "status": "error",
  "error": "supabase_connection",
  "message": "..."
}
```

### 3. Voice Health Check

```bash
curl https://<YOUR_DOMAIN>/api/health/voice
```

**Expected Response (Configured):**
```json
{
  "status": "ok",
  "stt": "configured",
  "nlu": "configured",
  "timestamp": 1702684800000
}
```

**Expected Response (Missing Key):**
```json
{
  "status": "error",
  "error": "missing_stt_key",
  "message": "HF_API_KEY is not configured"
}
```

### 4. Zombie Detector

```bash
curl -X POST https://<YOUR_DOMAIN>/api/monitor/zombies \
  -H "Authorization: Bearer <CRON_SECRET>"
```

**Expected Response (No Zombies):**
```json
{
  "ok": true,
  "zombie_count": 0,
  "sample_ids": [],
  "checked_at": "2024-12-16T00:00:00.000Z",
  "latency_ms": 52
}
```

**Expected Response (Zombies Found):**
```json
{
  "ok": true,
  "zombie_count": 3,
  "sample_ids": ["uuid-1", "uuid-2", "uuid-3"],
  "checked_at": "2024-12-16T00:00:00.000Z",
  "latency_ms": 67
}
```

**Expected Response (Unauthorized):**
```json
{
  "ok": false,
  "error": "Unauthorized"
}
```

---

## Required Environment Variables

### Netlify (Server-Only)

| Variable | Required | Description |
|----------|----------|-------------|
| `CRON_SECRET` | Yes (for zombie detector) | Secure random string for cron auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase admin key |
| `HF_API_KEY` | Yes | HuggingFace STT key |
| `GEMINI_API_KEY` | Yes | Google Gemini NLU key |
| `SENTRY_DSN` | Optional | Sentry error tracking DSN |
| `MONITORING_DEBUG` | Optional | Set to `true` for verbose logs |

### Netlify (Public - Safe to Expose)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |

---

## Security Verification

After deploy, verify no secrets are exposed:

```bash
# Check that SERVICE_ROLE_KEY is not in client bundle
grep -r "SERVICE_ROLE" .next/static/

# Should return NO results
```

```bash
# Check for any NEXT_PUBLIC_ AI keys (should be NONE)
grep -r "NEXT_PUBLIC_GEMINI" src/
grep -r "NEXT_PUBLIC_HF" src/
grep -r "NEXT_PUBLIC_HUGGINGFACE" src/

# Should return NO results
```

---

## Supabase Migration Checklist

Before zombie detector works fully:

- [ ] Run `supabase/migrations/20241216_monitoring_events.sql` in Supabase SQL Editor
- [ ] Verify table exists: `SELECT * FROM monitoring_events LIMIT 1;`
- [ ] Verify RLS is enabled: Check table in Supabase Dashboard → Authentication

---

## Cron Job Verification

After setting up scheduled trigger:

1. Wait for first execution (or trigger manually)
2. Check Netlify Function logs for `[MONITOR/ZOMBIES]` entries
3. Query monitoring_events:
   ```sql
   SELECT * FROM monitoring_events 
   WHERE source = 'zombie_detector' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

---

## Troubleshooting

### Zombie Detector Returns 401
- Verify `CRON_SECRET` is set in Netlify
- Verify Authorization header format: `Bearer <secret>` (with space)

### Zombie Detector Returns 500
- Check `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify key has correct permissions
- Check Supabase project is not paused

### monitoring_events Insert Fails
- Run the SQL migration first
- Verify service_role policies are created

### Health Check Shows Missing Keys
- Double-check Netlify environment variables
- Redeploy after adding new variables
