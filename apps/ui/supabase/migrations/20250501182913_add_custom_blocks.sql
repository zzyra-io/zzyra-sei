-- Add custom blocks table
CREATE TABLE IF NOT EXISTS custom_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  inputs JSONB NOT NULL DEFAULT '[]'::JSONB,
  outputs JSONB NOT NULL DEFAULT '[]'::JSONB,
  logic_type VARCHAR(50) NOT NULL,
  logic TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS custom_blocks_user_id_idx ON custom_blocks(user_id);

-- Add RLS policies
ALTER TABLE custom_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own custom blocks"
  ON custom_blocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom blocks"
  ON custom_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom blocks"
  ON custom_blocks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom blocks"
  ON custom_blocks FOR DELETE
  USING (auth.uid() = user_id);

-- Public blocks can be viewed by anyone
CREATE POLICY "Public blocks can be viewed by anyone"
  ON custom_blocks FOR SELECT
  USING (is_public = TRUE);
