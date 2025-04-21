-- Fix user_id constraint and default on workflow_executions

-- Drop NOT NULL constraint to allow trigger to set default
ALTER TABLE public.workflow_executions
  ALTER COLUMN user_id DROP NOT NULL;

-- Set default to auth.uid()
ALTER TABLE public.workflow_executions
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Create or replace trigger function to enforce user_id
CREATE OR REPLACE FUNCTION public.set_wf_exec_user_id() RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger and recreate
DROP TRIGGER IF EXISTS set_wf_exec_user_id ON public.workflow_executions;
CREATE TRIGGER set_wf_exec_user_id
  BEFORE INSERT ON public.workflow_executions
  FOR EACH ROW EXECUTE FUNCTION public.set_wf_exec_user_id();
