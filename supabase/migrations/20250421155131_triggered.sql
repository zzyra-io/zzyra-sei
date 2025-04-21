-- Add triggered_by and status columns to workflow_executions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='workflow_executions'
  ) THEN
    ALTER TABLE public.workflow_executions
      ADD COLUMN IF NOT EXISTS triggered_by UUID REFERENCES auth.users(id),
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
  END IF;
END
$$;