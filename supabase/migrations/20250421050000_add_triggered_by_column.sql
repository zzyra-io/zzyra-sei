-- Add triggered_by column to workflow_executions
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS triggered_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
