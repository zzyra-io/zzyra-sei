-- Set default user_id for workflow_executions to current authenticated user
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='workflow_executions'
  ) THEN
    -- Assign auth.uid() as default for new inserts without explicit user_id
    ALTER TABLE public.workflow_executions
      ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END
$$;
