-- Add required columns first
ALTER TABLE custom_blocks
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS logic text,
  ADD COLUMN IF NOT EXISTS logic_type text DEFAULT 'javascript',
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'ACTION',
  ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;

-- Add validation constraints
ALTER TABLE custom_blocks
  DROP CONSTRAINT IF EXISTS custom_blocks_name_length,
  DROP CONSTRAINT IF EXISTS custom_blocks_logic_not_empty,
  DROP CONSTRAINT IF EXISTS custom_blocks_category_valid,
  ADD CONSTRAINT custom_blocks_name_length CHECK (char_length(name) BETWEEN 1 AND 255),
  ADD CONSTRAINT custom_blocks_logic_not_empty CHECK (char_length(logic) > 0),
  ADD CONSTRAINT custom_blocks_category_valid CHECK (category IN ('ACTION', 'TRIGGER', 'CONDITION', 'LOGIC', 'FINANCE', 'NOTIFICATION', 'INTEGRATION'));

-- Set NOT NULL constraints
ALTER TABLE custom_blocks
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN logic SET NOT NULL,
  ALTER COLUMN logic_type SET NOT NULL,
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN tags SET NOT NULL;

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_custom_blocks_public_created;
DROP INDEX IF EXISTS idx_custom_blocks_tags;

-- Add composite index for faster public block queries
CREATE INDEX idx_custom_blocks_public_created 
  ON custom_blocks(is_public, created_at DESC) 
  WHERE is_public = true;

-- Add index for tag search
CREATE INDEX idx_custom_blocks_tags
  ON custom_blocks USING gin(tags);

-- Add execution tracking
CREATE TABLE IF NOT EXISTS custom_block_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_id UUID NOT NULL REFERENCES custom_blocks(id) ON DELETE CASCADE,
  workflow_execution_id UUID NOT NULL,
  node_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  inputs JSONB,
  outputs JSONB,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for execution queries
CREATE INDEX IF NOT EXISTS idx_custom_block_executions_block 
  ON custom_block_executions(block_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_custom_block_executions_workflow 
  ON custom_block_executions(workflow_execution_id);

-- Add RLS policies for executions
ALTER TABLE custom_block_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own block executions"
  ON custom_block_executions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM custom_blocks cb
    WHERE cb.id = custom_block_executions.block_id
    AND cb.user_id = auth.uid()
  ));

-- Add function to update execution metrics
CREATE OR REPLACE FUNCTION update_block_execution_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    NEW.execution_time_ms := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_block_execution_metrics_trigger
  BEFORE UPDATE ON custom_block_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_block_execution_metrics();
