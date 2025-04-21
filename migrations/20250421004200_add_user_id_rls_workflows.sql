-- Add user_id column and RLS policies to workflows
ALTER TABLE IF EXISTS public.workflows
  ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL;

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS workflows_user_id_idx ON public.workflows(user_id);

-- Enable Row Level Security
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own or public workflows
CREATE POLICY IF NOT EXISTS "Users can view their own workflows or public ones"
  ON public.workflows
  FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

-- Policy: Users can insert their own workflows
CREATE POLICY IF NOT EXISTS "Users can insert their own workflows"
  ON public.workflows
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own workflows
CREATE POLICY IF NOT EXISTS "Users can update their own workflows"
  ON public.workflows
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own workflows
CREATE POLICY IF NOT EXISTS "Users can delete their own workflows"
  ON public.workflows
  FOR DELETE
  USING (auth.uid() = user_id);
