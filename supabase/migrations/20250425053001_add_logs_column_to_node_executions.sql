-- Add a logs column to node_executions for per-node log entries
ALTER TABLE node_executions ADD COLUMN IF NOT EXISTS logs jsonb;