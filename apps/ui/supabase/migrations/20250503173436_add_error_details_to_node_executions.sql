-- Add error_details column to node_executions
ALTER TABLE node_executions
ADD COLUMN IF NOT EXISTS error_details jsonb;

-- Create index for error searching
CREATE INDEX IF NOT EXISTS idx_node_executions_error_details
ON node_executions USING gin(error_details);

-- Add comment
COMMENT ON COLUMN node_executions.error_details IS 'Detailed error information including stack trace, inputs, and configuration';
