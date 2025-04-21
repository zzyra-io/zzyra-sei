-- Add level column to execution_logs for log severity
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'execution_logs'
  ) THEN
    ALTER TABLE public.execution_logs
      ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT 'info';
  END IF;
END
$$;
