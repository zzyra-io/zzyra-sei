-- Migration: fix RLS on team_members to avoid recursion
BEGIN;

-- Create a helper function to check team membership, SECURITY DEFINER to bypass RLS on team_members
CREATE OR REPLACE FUNCTION public.is_team_member(user_uuid UUID, team_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.team_members
    WHERE user_id = user_uuid AND team_id = team_uuid
  );
$$;

-- Drop the old SELECT policy that caused recursion
DROP POLICY IF EXISTS "Users can view team members for their teams" ON public.team_members;

-- Create a new policy using the helper function
CREATE POLICY "Users can view team members for their teams"
  ON public.team_members
  FOR SELECT
  USING (
    is_team_member(auth.uid(), team_members.team_id)
  );

COMMIT;
