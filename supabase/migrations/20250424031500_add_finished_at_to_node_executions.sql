-- Add finished_at column to node_executions
alter table public.node_executions add column if not exists finished_at timestamptz;
