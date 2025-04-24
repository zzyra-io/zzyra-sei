-- Ensure upserts on node_executions work by adding unique constraint on execution_id and node_id
ALTER TABLE node_executions
  ADD CONSTRAINT node_executions_execution_node_unique UNIQUE (execution_id, node_id);
