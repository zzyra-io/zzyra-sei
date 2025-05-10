-- Add indexes to execution_logs table for improved query performance
-- Index on execution_id for faster filtering when viewing logs for a specific execution
CREATE INDEX IF NOT EXISTS idx_execution_logs_execution_id ON execution_logs(execution_id);

-- Index on timestamp for faster sorting when displaying logs chronologically
CREATE INDEX IF NOT EXISTS idx_execution_logs_timestamp ON execution_logs(timestamp);

-- Composite index for common query pattern: filtering by execution_id and sorting by timestamp
CREATE INDEX IF NOT EXISTS idx_execution_logs_execution_id_timestamp ON execution_logs(execution_id, timestamp);

-- Add indexes to node_executions table
CREATE INDEX IF NOT EXISTS idx_node_executions_execution_id ON node_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_node_executions_node_id ON node_executions(node_id);
CREATE INDEX IF NOT EXISTS idx_node_executions_status ON node_executions(status);
