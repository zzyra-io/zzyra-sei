-- Supabase DB setup: indexes and RLS policies

-- 1. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id_started_at
  ON workflow_executions (workflow_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_node_executions_execution_id_started_at
  ON node_executions (execution_id, started_at DESC);

-- 2. Row-Level Security
-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_executions ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own workflows and executions
CREATE POLICY "select own workflows"
  ON workflows
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "select own executions"
  ON workflow_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workflows WHERE id = workflow_executions.workflow_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "select own node executions"
  ON node_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workflow_executions
      WHERE id = node_executions.execution_id
        AND EXISTS (
          SELECT 1 FROM workflows WHERE id = workflow_executions.workflow_id AND user_id = auth.uid()
        )
    )
  );
