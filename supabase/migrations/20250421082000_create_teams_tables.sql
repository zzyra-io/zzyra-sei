-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_members table for team membership
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON public.team_members(team_id);

-- Set up Row Level Security (RLS)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create policies for teams
CREATE POLICY "Users can view teams they are members of" 
  ON public.teams 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_members.team_id = teams.id 
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners and admins can update teams" 
  ON public.teams 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_members.team_id = teams.id 
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners can delete teams" 
  ON public.teams 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_members.team_id = teams.id 
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'owner'
    )
  );

-- Create policies for team_members
CREATE POLICY "Users can view team members for their teams" 
  ON public.team_members 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members AS tm
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners and admins can insert team members" 
  ON public.team_members 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members AS tm
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can update team members" 
  ON public.team_members 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members AS tm
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners can delete team members" 
  ON public.team_members 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members AS tm
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid()
      AND tm.role = 'owner'
    )
  );

-- Add team_id to workflows table to associate workflows with teams
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS workflows_team_id_idx ON public.workflows(team_id);

-- Update workflow RLS policies to include team access
DROP POLICY IF EXISTS "Users can view their own workflows or public ones" ON public.workflows;
CREATE POLICY "Users can view their own workflows, team workflows, or public ones" 
  ON public.workflows 
  FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR is_public = true
    OR (
      team_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_members.team_id = workflows.team_id 
        AND team_members.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update their own workflows" ON public.workflows;
CREATE POLICY "Users can update their own workflows or team workflows" 
  ON public.workflows 
  FOR UPDATE 
  USING (
    auth.uid() = user_id 
    OR (
      team_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_members.team_id = workflows.team_id 
        AND team_members.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete their own workflows" ON public.workflows;
CREATE POLICY "Users can delete their own workflows or team workflows as admin/owner" 
  ON public.workflows 
  FOR DELETE 
  USING (
    auth.uid() = user_id 
    OR (
      team_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_members.team_id = workflows.team_id 
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
      )
    )
  );

-- Add triggers for updated_at
-- Drop existing triggers to avoid duplicate errors
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Drop existing triggers to avoid duplicate errors
DROP TRIGGER IF EXISTS update_team_members_updated_at ON public.team_members;
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
