-- Add retry_count column to workflow_executions table
ALTER TABLE workflow_executions 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add locked_by column if it doesn't exist (used for worker claiming)
ALTER TABLE workflow_executions 
ADD COLUMN IF NOT EXISTS locked_by TEXT DEFAULT NULL;

-- Add indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status_locked_by 
ON workflow_executions(status, locked_by);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_locked_by 
ON workflow_executions(locked_by);

COMMENT ON COLUMN workflow_executions.retry_count IS 'Number of times this execution has been retried';
COMMENT ON COLUMN workflow_executions.locked_by IS 'ID of the worker that has claimed this execution';