-- Add user_id column if missing and backfill existing rows
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- Backfill user_id for existing records using RPC or default mapping (edit as needed)
-- UPDATE public.workflow_executions SET user_id = (SELECT user_id FROM public.workflow_executions WHERE id = workflow_executions.id);

-- Make column NOT NULL after backfill
ALTER TABLE public.workflow_executions
  ALTER COLUMN user_id SET NOT NULL;

-- Create index for user_id
CREATE INDEX IF NOT EXISTS workflow_executions_user_id_idx ON public.workflow_executions(user_id);

-- Ensure RLS enabled
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
CREATE POLICY "Users can view their own execution logs" ON public.workflow_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own execution logs" ON public.workflow_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own execution logs" ON public.workflow_executions
  FOR UPDATE USING (auth.uid() = user_id);
