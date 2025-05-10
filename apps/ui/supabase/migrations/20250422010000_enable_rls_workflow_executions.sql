-- Enable Row Level Security and define policies for workflow_executions

-- 1. Ensure RLS is enabled
ALTER TABLE public.workflow_executions
ENABLE ROW LEVEL SECURITY;

-- 2. Allow authenticated users to insert only their own executions
DROP POLICY IF EXISTS insert_own_execution ON public.workflow_executions;
CREATE POLICY insert_own_execution
  ON public.workflow_executions
  FOR INSERT
  WITH CHECK (auth.uid() = triggered_by);

-- 3. Allow authenticated users to read only their own executions
DROP POLICY IF EXISTS select_own_execution ON public.workflow_executions;
CREATE POLICY select_own_execution
  ON public.workflow_executions
  FOR SELECT
  USING (auth.uid() = triggered_by);
