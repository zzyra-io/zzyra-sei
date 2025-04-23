-- Add duration_ms column to workflow_executions table
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS duration_ms integer;
