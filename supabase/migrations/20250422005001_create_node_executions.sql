-- Migration: create node_executions table

create table if not exists node_executions (
  id            uuid        primary key default uuid_generate_v4(),
  execution_id  uuid        not null references workflow_executions(id) on delete cascade,
  node_id       text        not null,
  status        text        not null,
  output_data   jsonb,
  error         text,
  completed_at  timestamptz not null default now()
);
