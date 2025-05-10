-- Enable Row Level Security and add policies for workflows table

-- Enable RLS on workflows
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Allow users to insert only workflows they own
CREATE POLICY "Allow insert own workflows" ON public.workflows
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow users to select only their own workflows
CREATE POLICY "Allow select own workflows" ON public.workflows
  FOR SELECT USING (user_id = auth.uid());

-- Allow users to update only their own workflows
CREATE POLICY "Allow update own workflows" ON public.workflows
  FOR UPDATE USING (user_id = auth.uid());

-- (Optional) Allow users to delete only their own workflows
CREATE POLICY "Allow delete own workflows" ON public.workflows
  FOR DELETE USING (user_id = auth.uid());
