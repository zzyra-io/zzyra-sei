-- Create functions for execution statistics (UI service)

-- Function to calculate execution duration statistics
CREATE OR REPLACE FUNCTION public.get_execution_duration_stats(
  workflow_id uuid,
  since_date timestamptz
) RETURNS TABLE(
  avg numeric,
  min numeric,
  max numeric
) LANGUAGE sql AS $$
  SELECT 
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))::numeric AS avg,
    MIN(EXTRACT(EPOCH FROM (completed_at - started_at)))::numeric AS min,
    MAX(EXTRACT(EPOCH FROM (completed_at - started_at)))::numeric AS max
  FROM workflow_executions
  WHERE 
    workflow_id = $1 
    AND started_at >= $2
    AND completed_at IS NOT NULL
    AND status = 'completed';
$$;

-- Function to get node execution statistics
CREATE OR REPLACE FUNCTION public.get_node_execution_stats(
  workflow_id uuid,
  since_date timestamptz
) RETURNS TABLE(
  node_id text,
  execution_count bigint,
  avg_duration numeric,
  failure_rate numeric
) LANGUAGE sql AS $$
  SELECT 
    ne.node_id,
    COUNT(*) AS execution_count,
    AVG(EXTRACT(EPOCH FROM (ne.completed_at - ne.started_at)))::numeric AS avg_duration,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (SUM(CASE WHEN ne.status = 'failed' THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100 
      ELSE 0 
    END AS failure_rate
  FROM node_executions ne
  JOIN workflow_executions we ON ne.execution_id = we.id
  WHERE 
    we.workflow_id = $1
    AND we.started_at >= $2
  GROUP BY ne.node_id;
$$;