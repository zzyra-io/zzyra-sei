-- Create custom blocks table
CREATE TABLE IF NOT EXISTS custom_blocks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '[]',
  outputs JSONB NOT NULL DEFAULT '[]',
  logic_type TEXT NOT NULL,
  logic TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  version TEXT,
  tags TEXT[] DEFAULT '{}'
);

-- Add index for faster searches
CREATE INDEX IF NOT EXISTS idx_custom_blocks_category ON custom_blocks(category);
CREATE INDEX IF NOT EXISTS idx_custom_blocks_created_by ON custom_blocks(created_by);
-- Removed index on is_public to prevent errors during migration

-- Add RLS policies
ALTER TABLE custom_blocks ENABLE ROW LEVEL SECURITY;

-- Policy for selecting blocks (users can see their own blocks)
CREATE POLICY select_custom_blocks ON custom_blocks
  FOR SELECT USING (
    created_by = auth.uid()
  );

-- Policy for inserting blocks (users can only insert their own blocks)
CREATE POLICY insert_custom_blocks ON custom_blocks
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

-- Policy for updating blocks (users can only update their own blocks)
CREATE POLICY update_custom_blocks ON custom_blocks
  FOR UPDATE USING (
    created_by = auth.uid()
  );

-- Policy for deleting blocks (users can only delete their own blocks)
CREATE POLICY delete_custom_blocks ON custom_blocks
  FOR DELETE USING (
    created_by = auth.uid()
  );
