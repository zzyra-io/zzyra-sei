-- Cleanup invalid indexes and triggers, and reapply with defensive DDL

-- Drop problematic indexes
DROP INDEX IF EXISTS profiles_subscription_status_idx;
DROP INDEX IF EXISTS workflow_templates_is_premium_idx;

-- Conditionally recreate indexes only if columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='subscription_status'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS profiles_subscription_status_idx ON public.profiles(subscription_status)';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workflow_templates' AND column_name='is_premium'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS workflow_templates_is_premium_idx ON public.workflow_templates(is_premium)';
  END IF;
END$$;

-- Drop problematic triggers on teams, workflows, profiles
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
DROP TRIGGER IF EXISTS update_team_members_updated_at ON public.team_members;
DROP TRIGGER IF EXISTS update_workflows_updated_at ON public.workflows;
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- Recreate triggers defensively
-- Update timestamp trigger function assumed existing
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER create_profile_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_user();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
