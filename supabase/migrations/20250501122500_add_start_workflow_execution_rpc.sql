-- Function to atomically enforce monthly quota and start execution
CREATE OR REPLACE FUNCTION public.start_workflow_execution(
  wf_id UUID
) RETURNS UUID AS $$
DECLARE
  exec_id UUID := gen_random_uuid();
  usr_id UUID := auth.uid();
BEGIN
  -- Increment usage if under quota
  UPDATE public.profiles
    SET monthly_executions_used = monthly_executions_used + 1
    WHERE id = usr_id
      AND monthly_executions_used < monthly_execution_quota;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Monthly execution quota exceeded';
  END IF;

  -- Insert execution
  INSERT INTO public.workflow_executions(
    id, workflow_id, user_id, status, started_at, created_at
  ) VALUES (
    exec_id, wf_id, usr_id, 'pending', now(), now()
  );

  RETURN exec_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
