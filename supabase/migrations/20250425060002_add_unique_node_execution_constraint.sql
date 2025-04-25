-- Add unique constraint to ensure idempotent node executions
ALTER TABLE node_executions
ADD CONSTRAINT node_executions_execution_id_node_id_unique
UNIQUE (execution_id, node_id);
