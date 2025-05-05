-- Create a function to count workflows with executions in the past N days
CREATE OR REPLACE FUNCTION get_active_workflows_count(time_period INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
    active_count INTEGER;
BEGIN
    -- Count distinct workflows with executions in the past N days
    SELECT COUNT(DISTINCT workflow_id)
    INTO active_count
    FROM workflow_executions
    WHERE started_at >= (NOW() - (time_period || ' day')::INTERVAL);
    
    RETURN COALESCE(active_count, 0);
END;
$$ LANGUAGE plpgsql;