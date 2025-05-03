-- Create block status enum
DO $$ BEGIN
  CREATE TYPE block_status AS ENUM ('pending', 'running', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create log level enum
DO $$ BEGIN
  CREATE TYPE log_level AS ENUM ('info', 'error', 'warn');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create workflow status enum
DO $$ BEGIN
  CREATE TYPE workflow_status AS ENUM ('pending', 'running', 'completed', 'failed', 'paused');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update block_executions table to use enum
ALTER TABLE block_executions
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE block_status USING status::block_status,
  ALTER COLUMN status SET DEFAULT 'pending'::block_status;

-- Update block_execution_logs table to use enum
ALTER TABLE block_execution_logs
  DROP CONSTRAINT IF EXISTS block_execution_logs_level_check,
  ALTER COLUMN level TYPE log_level USING level::log_level;

-- Update workflow_executions table to use enum
ALTER TABLE workflow_executions
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE workflow_status USING status::workflow_status,
  ALTER COLUMN status SET DEFAULT 'pending'::workflow_status;
