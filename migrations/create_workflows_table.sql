-- Create the workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create an index on user_id for faster queries
CREATE INDEX IF NOT EXISTS workflows_user_id_idx ON public.workflows(user_id);

-- Set up Row Level Security (RLS)
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Create policies for row level security
-- Users can view their own workflows or public workflows
CREATE POLICY "Users can view their own workflows or public ones" 
  ON public.workflows 
  FOR SELECT 
  USING (auth.uid() = user_id OR is_public = true);

-- Users can insert their own workflows
CREATE POLICY "Users can insert their own workflows" 
  ON public.workflows 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own workflows
CREATE POLICY "Users can update their own workflows" 
  ON public.workflows 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own workflows
CREATE POLICY "Users can delete their own workflows" 
  ON public.workflows 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
