-- Create node_executions table to log individual node execution details
CREATE TABLE IF NOT EXISTS public.node_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  output_data JSONB,
  error TEXT
);

-- Index for querying by execution_id
CREATE INDEX IF NOT EXISTS idx_node_executions_execution_id ON public.node_executions(execution_id);
