-- Set default for workflows.user_id to the authenticated user

ALTER TABLE public.workflows
  ALTER COLUMN user_id SET DEFAULT auth.uid();
