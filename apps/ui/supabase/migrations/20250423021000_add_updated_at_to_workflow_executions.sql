-- Migration: Add updated_at column to workflow_executions
ALTER TABLE workflow_executions ADD COLUMN updated_at timestamp with time zone DEFAULT now();
