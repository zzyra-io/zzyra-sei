-- Fix: define set_wf_exec_user_id trigger correctly for workflow_executions

-- Create or replace trigger function
CREATE OR REPLACE FUNCTION public.set_wf_exec_user_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS set_wf_exec_user_id ON public.workflow_executions;

-- Attach new trigger to workflow_executions
CREATE TRIGGER set_wf_exec_user_id
  BEFORE INSERT ON public.workflow_executions
  FOR EACH ROW EXECUTE FUNCTION public.set_wf_exec_user_id();
