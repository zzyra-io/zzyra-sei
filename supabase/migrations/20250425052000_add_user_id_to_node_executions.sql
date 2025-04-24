-- Add user_id column to node_executions for tracking node ownership
ALTER TABLE node_executions
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- Optional: index for performance
-- CREATE INDEX idx_node_executions_user_id ON node_executions(user_id);
