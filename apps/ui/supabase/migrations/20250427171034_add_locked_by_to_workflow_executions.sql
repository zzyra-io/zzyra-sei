-- Add locked_by column to workflow_executions table
ALTER TABLE public.workflow_executions
ADD COLUMN IF NOT EXISTS locked_by TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workflow_executions_locked_by
ON public.workflow_executions(locked_by);

-- Add index for faster status lookups
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status
ON public.workflow_executions(status);
