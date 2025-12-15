-- ROMNA V7: Monitoring Events Table
-- Purpose: Store monitoring alerts and health check results
-- 
-- RLS: Enabled. Only service role can write.

CREATE TABLE IF NOT EXISTS monitoring_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'critical')),
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    meta JSONB DEFAULT '{}'::jsonb
);

-- Index for querying by level and time
CREATE INDEX IF NOT EXISTS idx_monitoring_events_level_created 
ON monitoring_events (level, created_at DESC);

-- Index for querying by source
CREATE INDEX IF NOT EXISTS idx_monitoring_events_source 
ON monitoring_events (source, created_at DESC);

-- Enable RLS
ALTER TABLE monitoring_events ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert (for cron jobs)
CREATE POLICY "Service role can insert monitoring events"
ON monitoring_events
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow service role to read all events
CREATE POLICY "Service role can read monitoring events"
ON monitoring_events
FOR SELECT
TO service_role
USING (true);

-- Cleanup: Auto-delete events older than 30 days
-- Run this as a scheduled job in Supabase
-- DELETE FROM monitoring_events WHERE created_at < NOW() - INTERVAL '30 days';

COMMENT ON TABLE monitoring_events IS 'ROMNA V7 Monitoring: Stores health check results and alerts';
