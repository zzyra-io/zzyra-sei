-- Function to insert a job into the execution queue with proper permissions
CREATE OR REPLACE FUNCTION public.insert_execution_queue_job(
  p_execution_id UUID,
  p_workflow_id UUID,
  p_user_id UUID,
  p_status TEXT,
  p_priority INTEGER,
  p_payload JSONB,
  p_scheduled_for TIMESTAMPTZ
) RETURNS public.execution_queue AS $$
DECLARE
  inserted_job public.execution_queue;
BEGIN
  INSERT INTO public.execution_queue (
    execution_id,
    workflow_id,
    user_id,
    status,
    priority,
    payload,
    scheduled_for
  ) VALUES (
    p_execution_id,
    p_workflow_id,
    p_user_id,
    p_status,
    p_priority,
    p_payload,
    p_scheduled_for
  )
  RETURNING * INTO inserted_job;
  
  RETURN inserted_job;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute raw SQL for emergency cases
CREATE OR REPLACE FUNCTION public.execute_sql(sql TEXT) 
RETURNS VOID AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_execution_queue_job TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sql TO service_role;
