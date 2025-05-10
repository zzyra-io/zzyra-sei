-- Create unified block executions table
CREATE TABLE IF NOT EXISTS block_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id VARCHAR(255) NOT NULL,
  workflow_execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  block_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  inputs JSONB,
  outputs JSONB,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for block executions
CREATE INDEX IF NOT EXISTS idx_block_executions_workflow 
  ON block_executions(workflow_execution_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_block_executions_node 
  ON block_executions(node_id, started_at DESC);

-- Create block execution logs table
CREATE TABLE IF NOT EXISTS block_execution_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES block_executions(id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL,
  level VARCHAR(10) NOT NULL CHECK (level IN ('info', 'error', 'warn')),
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for execution logs
CREATE INDEX IF NOT EXISTS idx_block_execution_logs_execution 
  ON block_execution_logs(execution_id, timestamp DESC);

-- Add RLS policies
ALTER TABLE block_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_execution_logs ENABLE ROW LEVEL SECURITY;

-- Add user_id to workflow_executions if not exists
ALTER TABLE workflow_executions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Add index for faster user queries
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id
  ON workflow_executions(user_id);

-- RLS policy for block executions
CREATE POLICY "Users can view their own block executions"
  ON block_executions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workflow_executions we
    WHERE we.id = block_executions.workflow_execution_id
    AND we.user_id = auth.uid()
  ));

-- RLS policy for execution logs
CREATE POLICY "Users can view their own block execution logs"
  ON block_execution_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM block_executions be
    JOIN workflow_executions we ON we.id = be.workflow_execution_id
    WHERE be.id = block_execution_logs.execution_id
    AND we.user_id = auth.uid()
  ));

-- Function to update execution metrics
CREATE OR REPLACE FUNCTION update_block_execution_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    NEW.execution_time_ms := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_block_execution_metrics_trigger
  BEFORE UPDATE ON block_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_block_execution_metrics();

-- Migrate data from custom_block_executions if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'custom_block_executions') THEN
    INSERT INTO block_executions (
      id,
      node_id,
      workflow_execution_id,
      block_type,
      status,
      started_at,
      completed_at,
      error,
      inputs,
      outputs,
      execution_time_ms,
      created_at
    )
    SELECT
      id,
      node_id,
      workflow_execution_id,
      'custom' as block_type,
      status,
      started_at,
      completed_at,
      error,
      inputs,
      outputs,
      execution_time_ms,
      created_at
    FROM custom_block_executions;

    -- Drop old tables
    DROP TABLE IF EXISTS custom_block_execution_logs;
    DROP TABLE IF EXISTS custom_block_executions;
  END IF;
END $$;
