-- Create node_logs table for detailed per-node logs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS node_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  msg TEXT NOT NULL,
  attempt INTEGER,
  data JSONB
);
