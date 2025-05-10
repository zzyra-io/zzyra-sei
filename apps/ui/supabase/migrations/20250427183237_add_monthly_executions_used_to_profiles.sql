-- Add monthly_executions_used column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS monthly_executions_used INTEGER DEFAULT 0 NOT NULL;

-- Comment on the column
COMMENT ON COLUMN public.profiles.monthly_executions_used IS 'Tracks the number of workflow executions used by the user in the current month';