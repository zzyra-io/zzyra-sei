-- Create execution logs table
CREATE TABLE IF NOT EXISTS custom_block_execution_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES custom_block_executions(id) ON DELETE CASCADE,
  level VARCHAR(10) NOT NULL CHECK (level IN ('info', 'error', 'warn')),
  message TEXT NOT NULL,
  node_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster log queries
CREATE INDEX IF NOT EXISTS idx_custom_block_execution_logs_execution 
  ON custom_block_execution_logs(execution_id, timestamp DESC);

-- Add RLS policies
ALTER TABLE custom_block_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own block execution logs"
  ON custom_block_execution_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM custom_block_executions cbe
    JOIN custom_blocks cb ON cb.id = cbe.block_id
    WHERE cbe.id = custom_block_execution_logs.execution_id
    AND cb.user_id = auth.uid()
  ));
