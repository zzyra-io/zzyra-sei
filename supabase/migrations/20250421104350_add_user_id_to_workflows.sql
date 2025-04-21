-- Add user_id column to workflows and RLS policies
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure index on user_id
CREATE INDEX IF NOT EXISTS workflows_user_id_idx ON public.workflows(user_id);

-- Enable Row Level Security in case it was disabled
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "select_workflows_by_user_or_public" ON public.workflows;
CREATE POLICY "select_workflows_by_user_or_public"
  ON public.workflows
  FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "insert_workflows_by_user" ON public.workflows;
CREATE POLICY "insert_workflows_by_user"
  ON public.workflows
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_workflows_by_user" ON public.workflows;
CREATE POLICY "update_workflows_by_user"
  ON public.workflows
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_workflows_by_user" ON public.workflows;
CREATE POLICY "delete_workflows_by_user"
  ON public.workflows
  FOR DELETE
  USING (auth.uid() = user_id);
