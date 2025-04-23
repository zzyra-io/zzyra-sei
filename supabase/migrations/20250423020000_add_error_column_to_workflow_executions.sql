-- Migration: Add error column to workflow_executions
ALTER TABLE workflow_executions ADD COLUMN error TEXT;
