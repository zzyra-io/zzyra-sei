-- Add workflow_pauses table
CREATE TABLE IF NOT EXISTS workflow_pauses (
  id UUID PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES workflow_executions(id),
  node_id TEXT NOT NULL,
  paused_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  context JSONB NOT NULL,
  resumed_at TIMESTAMPTZ,
  resume_data JSONB,
  created_by UUID NOT NULL
);

-- Alter node_executions: add started_at, duration_ms, index
ALTER TABLE node_executions
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS duration_ms INT;
CREATE INDEX IF NOT EXISTS idx_node_exec_execution_node ON node_executions(execution_id, node_id);

-- Create transaction_attempts table
CREATE TABLE IF NOT EXISTS transaction_attempts (
  id UUID PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES workflow_executions(id),
  node_id TEXT NOT NULL,
  attempt_no INT NOT NULL,
  tx_hash TEXT,
  gas_used NUMERIC,
  status TEXT NOT NULL,
  error TEXT,
  tried_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enhance custom_blocks
ALTER TABLE custom_blocks
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
-- Add unique constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_custom_blocks_user_name'
  ) THEN
    ALTER TABLE custom_blocks
      ADD CONSTRAINT uq_custom_blocks_user_name UNIQUE (user_id, name);
  END IF;
END
$$;
CREATE INDEX IF NOT EXISTS idx_custom_blocks_user_public ON custom_blocks(user_id, is_public);

-- Enhance execution_logs
ALTER TABLE execution_logs
  ALTER COLUMN timestamp SET DEFAULT now(),
  ALTER COLUMN timestamp SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exec_logs_execution_timestamp ON execution_logs(execution_id, timestamp);

-- Enhance notifications
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
  ALTER COLUMN read SET DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, read, created_at);

-- Enhance profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
-- Ensure user_id is foreign key only if constraint does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_user'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;
END
$$;
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON profiles(subscription_status, subscription_expires_at);
