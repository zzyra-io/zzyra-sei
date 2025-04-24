-- Add JSONB output column to node_executions for storing per-node outputs
ALTER TABLE node_executions
  ADD COLUMN output JSONB;

-- Optional: index on output if needed
-- CREATE INDEX idx_node_executions_output ON node_executions USING GIN (output);
