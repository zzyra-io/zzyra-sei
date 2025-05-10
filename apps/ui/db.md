-- SQL schema generated from TypeScript definitions

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: audit_logs
CREATE TABLE public.audit_logs (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
action text NOT NULL,
changed_data jsonb,
row_id uuid,
table_name text NOT NULL,
timestamp timestamptz NOT NULL,
user_id uuid
);

-- Table: custom_blocks
CREATE TABLE public.custom_blocks (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
user_id uuid NOT NULL,
name text NOT NULL,
code text NOT NULL,
description text,
icon text,
category text,
is_public boolean,
created_by uuid,
created_at timestamptz,
updated_by uuid,
updated_at timestamptz
);

-- Table: execution_logs
CREATE TABLE public.execution_logs (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
execution_id uuid NOT NULL,
level text NOT NULL,
message text NOT NULL,
node_id text NOT NULL,
data jsonb,
timestamp timestamptz NOT NULL,
FOREIGN KEY (execution_id) REFERENCES public.workflow_executions(id)
);

-- Table: node_executions
CREATE TABLE public.node_executions (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
execution_id uuid NOT NULL,
node_id text NOT NULL,
status text NOT NULL,
started_at timestamptz NOT NULL,
completed_at timestamptz,
duration_ms integer,
retry_count integer,
error text,
output_data jsonb,
updated_at timestamptz,
FOREIGN KEY (execution_id) REFERENCES public.workflow_executions(id)
);

-- Table: node_inputs
CREATE TABLE public.node_inputs (
execution_id uuid NOT NULL,
node_id text NOT NULL,
data jsonb NOT NULL,
PRIMARY KEY (execution_id, node_id),
FOREIGN KEY (execution_id) REFERENCES public.workflow_executions(id)
);

-- Table: node_logs
CREATE TABLE public.node_logs (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
execution_id uuid,
node_id text NOT NULL,
message text NOT NULL,
level text,
data jsonb,
timestamp timestamptz NOT NULL,
FOREIGN KEY (execution_id) REFERENCES public.workflow_executions(id)
);

-- Table: node_outputs
CREATE TABLE public.node_outputs (
execution_id uuid NOT NULL,
node_id text NOT NULL,
data jsonb NOT NULL,
PRIMARY KEY (execution_id, node_id),
FOREIGN KEY (execution_id) REFERENCES public.workflow_executions(id)
);

-- Table: notifications
CREATE TABLE public.notifications (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
message text NOT NULL,
user_id uuid NOT NULL,
title text NOT NULL,
type text NOT NULL,
data jsonb,
read boolean NOT NULL,
created_at timestamptz
);

-- Table: profiles
CREATE TABLE public.profiles (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
full_name text,
avatar_url text,
email text,
last_seen_at timestamptz,
monthly_execution_count integer,
monthly_execution_quota integer,
stripe_customer_id text,
stripe_subscription_id text,
subscription_tier text,
subscription_status text,
subscription_expires_at timestamptz,
created_at timestamptz,
updated_at timestamptz
);

-- Table: team_members
CREATE TABLE public.team_members (
team_id uuid NOT NULL,
user_id uuid NOT NULL,
role text NOT NULL,
joined_at timestamptz,
PRIMARY KEY (team_id, user_id),
FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

-- Table: teams
CREATE TABLE public.teams (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
created_by uuid NOT NULL,
name text NOT NULL,
description text,
created_at timestamptz,
updated_at timestamptz
);

-- Table: transaction_attempts
CREATE TABLE public.transaction_attempts (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
execution_id uuid NOT NULL,
node_id text NOT NULL,
attempt_no integer NOT NULL,
status text NOT NULL,
tried_at timestamptz,
gas_used integer,
tx_hash text,
error text,
FOREIGN KEY (execution_id) REFERENCES public.workflow_executions(id)
);

-- Table: workflow_executions
CREATE TABLE public.workflow_executions (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
workflow_id uuid NOT NULL,
status text NOT NULL,
triggered_by text,
logs jsonb,
result jsonb,
error text,
created_at timestamptz,
started_at timestamptz,
completed_at timestamptz,
duration_ms integer,
updated_at timestamptz,
FOREIGN KEY (workflow_id) REFERENCES public.workflows(id)
);

-- Table: workflow_pauses
CREATE TABLE public.workflow_pauses (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
execution_id uuid NOT NULL,
node_id text NOT NULL,
context jsonb NOT NULL,
created_by uuid NOT NULL,
paused_at timestamptz NOT NULL,
resume_data jsonb,
resumed_at timestamptz,
FOREIGN KEY (execution_id) REFERENCES public.workflow_executions(id)
);

-- Table: workflow_templates
CREATE TABLE public.workflow_templates (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
name text NOT NULL,
description text,
category text,
nodes jsonb,
edges jsonb,
created_at timestamptz,
updated_at timestamptz
);

-- Table: workflows
CREATE TABLE public.workflows (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
user_id uuid NOT NULL,
name text NOT NULL,
description text,
version integer NOT NULL,
is_public boolean,
tags text[],
created_by uuid,
created_at timestamptz,
updated_at timestamptz,
edges jsonb,
nodes jsonb,
definition jsonb NOT NULL
);
