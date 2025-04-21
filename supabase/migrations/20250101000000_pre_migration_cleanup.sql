-- Pre-migration cleanup: drop problematic indexes and triggers

-- Drop indexes that may conflict
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'profiles_subscription_status_idx'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS profiles_subscription_status_idx';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'workflow_templates_is_premium_idx'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS workflow_templates_is_premium_idx';
  END IF;
END$$;

-- Drop problematic triggers on teams, workflows, profiles (guarded by table existence)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='teams'
  ) THEN
    DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='team_members'
  ) THEN
    DROP TRIGGER IF EXISTS update_team_members_updated_at ON public.team_members;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='workflows'
  ) THEN
    DROP TRIGGER IF EXISTS update_workflows_updated_at ON public.workflows;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='auth' AND table_name='users'
  ) THEN
    DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles'
  ) THEN
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
  END IF;
END
$$;
