-- RLS & Realtime Setup for Execution System

-- Enable RLS
ALTER TABLE execution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_queue ENABLE ROW LEVEL SECURITY;

-- Configure Replica Identity for Realtime (Full Payload)
ALTER TABLE execution_events REPLICA IDENTITY FULL;
ALTER TABLE execution_plans REPLICA IDENTITY FULL;
ALTER TABLE execution_queue REPLICA IDENTITY FULL;

-- Drop existing policies to ensure idempotency
DROP POLICY IF EXISTS "Users can view own plans" ON execution_plans;
DROP POLICY IF EXISTS "Users can insert own plans" ON execution_plans;
DROP POLICY IF EXISTS "Users can update own plans" ON execution_plans;
DROP POLICY IF EXISTS "Users can view own queue items" ON execution_queue;
DROP POLICY IF EXISTS "Users can view own events" ON execution_events;
DROP POLICY IF EXISTS "Users can insert own events" ON execution_events;

-- Policies: execution_plans
CREATE POLICY "Users can view own plans" ON execution_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans" ON execution_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans" ON execution_plans
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies: execution_queue
-- Using direct user_id column for performance (avoiding JOINs)
CREATE POLICY "Users can view own queue items" ON execution_queue
  FOR SELECT USING (auth.uid() = user_id);

-- Policies: execution_events
CREATE POLICY "Users can view own events" ON execution_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON execution_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant Access
GRANT SELECT, INSERT, UPDATE ON execution_plans TO authenticated;
GRANT SELECT ON execution_queue TO authenticated;
GRANT SELECT, INSERT ON execution_events TO authenticated;
