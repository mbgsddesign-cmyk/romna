-- Audit Fixes: Execution Events & Schema Alignment

-- 1. Create execution_events table
CREATE TABLE IF NOT EXISTS execution_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_plan_id UUID REFERENCES execution_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- references auth.users(id) ideally, but keeping minimal as requested
  event_type TEXT NOT NULL, -- APPROVAL_REQUESTED, APPROVED, CANCELLED, EXECUTED, FAILED
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE execution_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own events (or service role handles it)
CREATE POLICY "Users can insert own events" ON execution_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can select their own events
CREATE POLICY "Users can view own events" ON execution_events
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Add approved_at to execution_plans
ALTER TABLE execution_plans 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 3. (Optional) Comment for documentation clarity on retry_count
COMMENT ON COLUMN execution_queue.retry_count IS 'Alias: attempts. Tracks number of execution attempts.';
