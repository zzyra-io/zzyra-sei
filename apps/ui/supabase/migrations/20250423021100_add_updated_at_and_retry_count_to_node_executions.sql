-- Migration: Add updated_at and retry_count columns to node_executions
ALTER TABLE node_executions ADD COLUMN updated_at timestamp with time zone DEFAULT now();
ALTER TABLE node_executions ADD COLUMN retry_count integer DEFAULT 0;
