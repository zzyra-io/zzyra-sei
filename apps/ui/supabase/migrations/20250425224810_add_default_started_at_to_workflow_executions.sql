-- Migration: add default and not-null constraint for started_at on workflow_executions
-- Backfill existing rows where started_at is null
UPDATE public.workflow_executions
SET started_at = created_at
WHERE started_at IS NULL;

ALTER TABLE public.workflow_executions
  ALTER COLUMN started_at SET DEFAULT now(),
  ALTER COLUMN started_at SET NOT NULL;
