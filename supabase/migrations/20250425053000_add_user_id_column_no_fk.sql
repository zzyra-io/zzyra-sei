-- Add user_id column to node_executions without foreign key constraint
ALTER TABLE IF EXISTS node_executions
  ADD COLUMN IF NOT EXISTS user_id UUID;
