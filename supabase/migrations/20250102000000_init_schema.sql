-- Initial consolidated schema setup for Zyra

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Workflows
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  is_public BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflows_user ON public.workflows(user_id);
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_workflows_select ON public.workflows;
CREATE POLICY p_workflows_select ON public.workflows FOR SELECT
  USING (auth.uid() = user_id OR is_public);
DROP POLICY IF EXISTS p_workflows_insert ON public.workflows;
CREATE POLICY p_workflows_insert ON public.workflows FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS p_workflows_update ON public.workflows;
CREATE POLICY p_workflows_update ON public.workflows FOR UPDATE
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS p_workflows_delete ON public.workflows;
CREATE POLICY p_workflows_delete ON public.workflows FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER workflows_updated_at BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Workflow Executions
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  result JSONB,
  logs JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wf_exec_wf ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_user ON public.workflow_executions(user_id);
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_exec_select ON public.workflow_executions;
CREATE POLICY p_exec_select ON public.workflow_executions FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS p_exec_insert ON public.workflow_executions;
CREATE POLICY p_exec_insert ON public.workflow_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS p_exec_update ON public.workflow_executions;
CREATE POLICY p_exec_update ON public.workflow_executions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER execs_updated_at BEFORE UPDATE ON public.workflow_executions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Node Executions
CREATE TABLE IF NOT EXISTS public.node_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  output_data JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_node_exec_exec ON public.node_executions(execution_id);
ALTER TABLE public.node_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_nodes_select ON public.node_executions;
CREATE POLICY p_nodes_select ON public.node_executions FOR SELECT
  USING (TRUE);

-- Execution Logs
CREATE TABLE IF NOT EXISTS public.execution_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_logs_exec ON public.execution_logs(execution_id);
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_logs_select ON public.execution_logs;
CREATE POLICY p_logs_select ON public.execution_logs FOR SELECT
  USING (TRUE);

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  monthly_quota INT DEFAULT 100,
  monthly_used INT DEFAULT 0,
  dark_mode BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_profiles_select ON public.profiles;
CREATE POLICY p_profiles_select ON public.profiles FOR SELECT
  USING (auth.uid() = id);
DROP POLICY IF EXISTS p_profiles_update ON public.profiles;
CREATE POLICY p_profiles_update ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Teams and Membership
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id,user_id)
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_teams_select ON public.teams;
CREATE POLICY p_teams_select ON public.teams FOR SELECT
  USING (EXISTS(SELECT 1 FROM public.team_members tm WHERE tm.team_id=teams.id AND tm.user_id=auth.uid()));
DROP POLICY IF EXISTS p_teams_update ON public.teams;
CREATE POLICY p_teams_update ON public.teams FOR UPDATE
  USING (EXISTS(SELECT 1 FROM public.team_members tm WHERE tm.team_id=teams.id AND tm.user_id=auth.uid() AND tm.role IN ('owner','admin')));
DROP POLICY IF EXISTS p_teams_delete ON public.teams;
CREATE POLICY p_teams_delete ON public.teams FOR DELETE
  USING (EXISTS(SELECT 1 FROM public.team_members tm WHERE tm.team_id=teams.id AND tm.user_id=auth.uid() AND tm.role='owner'));

-- Workflow Templates
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  category TEXT,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_templates_select ON public.workflow_templates;
CREATE POLICY p_templates_select ON public.workflow_templates FOR SELECT
  USING (TRUE);
