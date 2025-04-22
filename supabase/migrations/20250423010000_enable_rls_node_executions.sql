-- Migration: Enable RLS and policies for node_executions

-- Enable RLS on node_executions
ALTER TABLE public.node_executions
  ENABLE ROW LEVEL SECURITY;

-- Allow owners of executions to select their node executions
CREATE POLICY select_own_node_executions
  ON public.node_executions
  FOR SELECT
  USING (
    execution_id IN (
      SELECT id FROM public.workflow_executions WHERE created_by = auth.uid()
    )
  );
