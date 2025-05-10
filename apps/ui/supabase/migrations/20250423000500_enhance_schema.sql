-- Migration: Enhance schema with FKs, defaults, indexes, and audit

-- custom_blocks enhancements
ALTER TABLE public.custom_blocks
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);
-- unique block name per user
ALTER TABLE public.custom_blocks
  ADD CONSTRAINT uc_custom_blocks_user_name UNIQUE (user_id, name);
CREATE INDEX IF NOT EXISTS idx_custom_blocks_user_public ON public.custom_blocks(user_id, is_public);

-- execution_logs defaults and index
ALTER TABLE public.execution_logs
  ALTER COLUMN timestamp SET DEFAULT now(),
  ALTER COLUMN timestamp SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_execution_logs_exec_ts ON public.execution_logs(execution_id, timestamp);

-- node_executions enhancements
ALTER TABLE public.node_executions
  ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now() NOT NULL,
  ADD COLUMN IF NOT EXISTS duration_ms integer GENERATED ALWAYS AS (
    CAST(extract(epoch from (completed_at - started_at)) * 1000 AS integer)
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_node_executions_exec_node ON public.node_executions(execution_id, node_id);

-- notifications enhancements
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ALTER COLUMN read SET DEFAULT false,
  ALTER COLUMN read SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications(user_id, read, created_at);

-- profiles enhancements
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();
-- id is primary key; add FK to auth.users
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_user FOREIGN KEY (id) REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_profiles_sub_status_expires ON public.profiles(subscription_status, subscription_expires_at);

-- workflows enhancements
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS ux_workflows_id_version ON public.workflows(id, version);
CREATE INDEX IF NOT EXISTS idx_workflows_created_by_updated_at ON public.workflows(created_by, updated_at);

-- audit_logs table for history/tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  row_id uuid,
  changed_data jsonb,
  timestamp timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_table ON public.audit_logs(user_id, table_name);
