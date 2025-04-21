-- Create the workflow_executions table
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS workflow_executions_workflow_id_idx ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_executions_user_id_idx ON public.workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS workflow_executions_status_idx ON public.workflow_executions(status);

-- Set up Row Level Security (RLS)
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies to avoid duplicates
DROP POLICY IF EXISTS "Users can view their own execution logs" ON public.workflow_executions;
DROP POLICY IF EXISTS "Users can insert their own execution logs" ON public.workflow_executions;
DROP POLICY IF EXISTS "Users can update their own execution logs" ON public.workflow_executions;

-- Create policies for row level security
-- Users can view their own execution logs
CREATE POLICY "Users can view their own execution logs" 
  ON public.workflow_executions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own execution logs
CREATE POLICY "Users can insert their own execution logs" 
  ON public.workflow_executions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own execution logs
CREATE POLICY "Users can update their own execution logs" 
  ON public.workflow_executions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create the profiles table for user settings
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  telegram_handle TEXT,
  discord_webhook TEXT,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  monthly_execution_quota INTEGER DEFAULT 100,
  monthly_executions_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='subscription_status'
  ) THEN
    CREATE INDEX IF NOT EXISTS profiles_subscription_status_idx ON public.profiles(subscription_status);
  END IF;
END$$;

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for row level security
-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Create a trigger to create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_for_user();

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create the workflow_templates table
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS workflow_templates_category_idx ON public.workflow_templates(category);
CREATE INDEX IF NOT EXISTS workflow_templates_is_premium_idx ON public.workflow_templates(is_premium);

-- Set up Row Level Security (RLS)
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for row level security
-- Everyone can view templates
CREATE POLICY IF NOT EXISTS "Everyone can view templates" 
  ON public.workflow_templates 
  FOR SELECT 
  USING (true);

-- Only admins can insert/update/delete templates (we'll handle this in the application)
