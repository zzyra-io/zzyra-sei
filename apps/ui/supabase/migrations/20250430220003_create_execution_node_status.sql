-- Migration: create execution_node_status table
create table if not exists execution_node_status (
  id serial primary key,
  execution_id uuid not null references workflow_executions(id) on delete cascade,
  node_id text not null,
  status text not null check (status in ('started','success','error')),
  updated_at timestamptz not null default now()
);
create index if not exists idx_execution_node_status_execution_id on execution_node_status(execution_id);

-- RLS: allow owner to insert/select
alter table execution_node_status enable row level security;
create policy "execution_node_status_owner" on execution_node_status
  for all using (
    execution_id in (
      select id from workflow_executions where triggered_by = auth.uid()
    )
  ) with check (
    execution_id in (
      select id from workflow_executions where triggered_by = auth.uid()
    )
  );
