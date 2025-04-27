-- Create execution_queue table for managing workflow execution jobs
CREATE TABLE IF NOT EXISTS public.execution_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'paused')),
  priority INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  payload JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ,
  locked_by TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS execution_queue_status_idx ON public.execution_queue(status);
CREATE INDEX IF NOT EXISTS execution_queue_workflow_id_idx ON public.execution_queue(workflow_id);
CREATE INDEX IF NOT EXISTS execution_queue_execution_id_idx ON public.execution_queue(execution_id);
CREATE INDEX IF NOT EXISTS execution_queue_scheduled_for_idx ON public.execution_queue(scheduled_for);

-- Add RLS policies
ALTER TABLE public.execution_queue ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own execution queue items"
  ON public.execution_queue
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role can do everything with execution_queue"
  ON public.execution_queue
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on execution_queue
CREATE TRIGGER update_execution_queue_updated_at
BEFORE UPDATE ON public.execution_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to claim next job
CREATE OR REPLACE FUNCTION public.claim_next_execution_job(worker_id TEXT, batch_size INTEGER DEFAULT 1)
RETURNS SETOF public.execution_queue AS $$
DECLARE
  lock_duration INTERVAL := '5 minutes';
BEGIN
  RETURN QUERY
  WITH claimable_jobs AS (
    SELECT id FROM public.execution_queue
    WHERE 
      (status = 'pending' OR (status = 'processing' AND locked_until < now()))
      AND (scheduled_for <= now())
    ORDER BY priority DESC, scheduled_for ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.execution_queue eq
  SET 
    status = 'processing',
    locked_by = worker_id,
    locked_until = now() + lock_duration,
    retry_count = CASE WHEN eq.status = 'processing' THEN eq.retry_count + 1 ELSE eq.retry_count END
  FROM claimable_jobs
  WHERE eq.id = claimable_jobs.id
  RETURNING eq.*;
END;
$$ LANGUAGE plpgsql;
