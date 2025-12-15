# ROMNA V7 Monitoring Setup

## Overview

ROMNA V7 includes built-in monitoring endpoints for health checks and anomaly detection.

---

## Health Check Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/health` | GET | Basic app health | No |
| `/api/health/data` | GET | Supabase connectivity | No |
| `/api/health/voice` | GET | STT configuration | No |
| `/api/monitor/zombies` | POST | Zombie plan detector | Yes (CRON_SECRET) |

---

## Zombie Detector Setup

### Purpose
Detects "zombie" execution plans that could cause UI issues:
- `waiting_approval` status
- Missing or empty `title` in payload

### Configuration

1. **Set CRON_SECRET in Netlify**
   ```
   CRON_SECRET=your-secure-random-string-here
   ```

2. **Create Scheduled Trigger**

   **Option A: Supabase Edge Function (Recommended)**
   
   Create a Supabase Edge Function that calls the endpoint:
   ```javascript
   Deno.serve(async () => {
     const response = await fetch('https://your-app.netlify.app/api/monitor/zombies', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${Deno.env.get('CRON_SECRET')}`
       }
     });
     return new Response(await response.text());
   });
   ```
   
   Schedule it via Supabase Dashboard: **Database → Extensions → pg_cron**

   **Option B: External Cron Service**
   
   Use cron-job.org, EasyCron, or similar:
   - URL: `https://your-app.netlify.app/api/monitor/zombies`
   - Method: POST
   - Header: `Authorization: Bearer <CRON_SECRET>`
   - Frequency: Every 30 minutes

3. **Create monitoring_events table**
   
   Run the migration in Supabase SQL Editor:
   ```sql
   -- See: supabase/migrations/20241216_monitoring_events.sql
   ```

### Response Format

```json
{
  "ok": true,
  "zombie_count": 0,
  "sample_ids": [],
  "checked_at": "2024-12-16T00:00:00.000Z",
  "latency_ms": 45
}
```

If zombies detected:
```json
{
  "ok": true,
  "zombie_count": 3,
  "sample_ids": ["uuid-1", "uuid-2", "uuid-3"],
  "checked_at": "2024-12-16T00:00:00.000Z",
  "latency_ms": 52
}
```

---

## Uptime Monitoring

### UptimeRobot Setup

1. Create account at [uptimerobot.com](https://uptimerobot.com)
2. Add new monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://your-app.netlify.app/api/health`
   - **Interval**: 60 seconds
   - **Alert Contact**: Your email
3. Configure alert conditions:
   - Alert after 2 consecutive failures
   - Alert on recovery

### Alternative: Netlify Analytics

Netlify's built-in analytics can show 5xx error rates. Enable in Site Settings → Analytics.

---

## Log Monitoring

### Console Markers to Watch

| Marker | Meaning | Action |
|--------|---------|--------|
| `[PULSE]` | Data refresh triggered | Normal operation |
| `[VOICE] fallback offline used` | STT failed, used fallback | Monitor frequency |
| `[STT API] error` | STT API failure | Immediate attention |
| `state=blocked` | Technical failure | Immediate attention |
| `[MONITOR/ZOMBIES] ALERT` | Zombies detected | Review Voice/STT settings |

### Sentry Integration (Optional)

Set `SENTRY_DSN` environment variable to enable error tracking.

---

## Alerting Thresholds

| Metric | Threshold | Severity |
|--------|-----------|----------|
| `/api/health` failure | 2 consecutive | CRITICAL |
| `/api/health/data` failure | > 2 minutes | CRITICAL |
| `zombie_count` | > 0 | WARNING |
| `zombie_count` | > 10 | CRITICAL |
| STT offline fallback rate | > 10% | WARNING |

---

## Viewing Monitoring Data

Query monitoring_events in Supabase:

```sql
-- Recent events
SELECT * FROM monitoring_events 
ORDER BY created_at DESC 
LIMIT 50;

-- Warnings in last 24h
SELECT * FROM monitoring_events 
WHERE level = 'warn' 
AND created_at > NOW() - INTERVAL '24 hours';

-- Zombie trends
SELECT 
  date_trunc('hour', created_at) as hour,
  MAX((meta->>'zombie_count')::int) as max_zombies
FROM monitoring_events 
WHERE source = 'zombie_detector'
GROUP BY hour
ORDER BY hour DESC;
```
