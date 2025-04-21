-- Create execution_logs table
CREATE TABLE IF NOT EXISTS public.execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
  message TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS execution_logs_execution_id_idx ON public.execution_logs(execution_id);

-- Enable Row Level Security
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

-- Policy for selecting logs: only owner of execution can view
CREATE POLICY select_execution_logs ON public.execution_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workflow_executions we
      WHERE we.id = execution_logs.execution_id
        AND we.user_id = auth.uid()
    )
  );

-- Policy for inserting logs: only owner of execution can insert logs
CREATE POLICY insert_execution_logs ON public.execution_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workflow_executions we
      WHERE we.id = execution_logs.execution_id
        AND we.user_id = auth.uid()
    )
  );

-- Policy for updating logs: only owner of execution can update
CREATE POLICY update_execution_logs ON public.execution_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workflow_executions we
      WHERE we.id = execution_logs.execution_id
        AND we.user_id = auth.uid()
    )
  );

-- Policy for deleting logs: only owner of execution can delete
CREATE POLICY delete_execution_logs ON public.execution_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workflow_executions we
      WHERE we.id = execution_logs.execution_id
        AND we.user_id = auth.uid()
    )
  );
