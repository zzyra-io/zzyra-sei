-- Update existing null user_ids with triggered_by
UPDATE workflow_executions
SET user_id = triggered_by
WHERE user_id IS NULL AND triggered_by IS NOT NULL;

-- Delete any executions with no user_id or triggered_by
DELETE FROM workflow_executions
WHERE user_id IS NULL AND triggered_by IS NULL;

-- Now make user_id non-nullable
ALTER TABLE workflow_executions
  ALTER COLUMN user_id SET NOT NULL;

-- Update RLS policy for workflow_executions
DROP POLICY IF EXISTS "Users can view their own workflow executions" ON workflow_executions;
CREATE POLICY "Users can view their own workflow executions"
  ON workflow_executions FOR SELECT
  USING (user_id = auth.uid());

-- Update RLS policy for block_executions
DROP POLICY IF EXISTS "Users can view their own block executions" ON block_executions;
CREATE POLICY "Users can view their own block executions"
  ON block_executions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workflow_executions we
    WHERE we.id = block_executions.workflow_execution_id
    AND we.user_id = auth.uid()
  ));

-- Update RLS policy for block_execution_logs
DROP POLICY IF EXISTS "Users can view their own block execution logs" ON block_execution_logs;
CREATE POLICY "Users can view their own block execution logs"
  ON block_execution_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM block_executions be
    JOIN workflow_executions we ON we.id = be.workflow_execution_id
    WHERE be.id = block_execution_logs.execution_id
    AND we.user_id = auth.uid()
  ));
