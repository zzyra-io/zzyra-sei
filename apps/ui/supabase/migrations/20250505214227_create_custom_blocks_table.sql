-- Add missing columns to custom_blocks table
ALTER TABLE custom_blocks
ADD COLUMN IF NOT EXISTS block_type VARCHAR DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS category VARCHAR,
ADD COLUMN IF NOT EXISTS block_data JSONB,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tags VARCHAR[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS version VARCHAR DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Add row-level security policies
ALTER TABLE custom_blocks ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own blocks or public blocks
CREATE POLICY "Users can view own blocks or public blocks"
  ON custom_blocks
  FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

-- Create policy for users to insert their own blocks
CREATE POLICY "Users can insert own blocks"
  ON custom_blocks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own blocks
CREATE POLICY "Users can update own blocks"
  ON custom_blocks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own blocks
CREATE POLICY "Users can delete own blocks"
  ON custom_blocks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update the 'updated_at' timestamp on row update
CREATE TRIGGER update_custom_blocks_updated_at
  BEFORE UPDATE ON custom_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indices for improved query performance after columns are added
DO $$
BEGIN
  -- Create index for user_id if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'custom_blocks' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_custom_blocks_user_id ON custom_blocks(user_id);
  END IF;
  
  -- Create index for is_public if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'custom_blocks' AND column_name = 'is_public') THEN
    CREATE INDEX IF NOT EXISTS idx_custom_blocks_is_public ON custom_blocks(is_public);
  END IF;
  
  -- Create index for block_type if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'custom_blocks' AND column_name = 'block_type') THEN
    CREATE INDEX IF NOT EXISTS idx_custom_blocks_block_type ON custom_blocks(block_type);
  END IF;
  
  -- Create index for category if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'custom_blocks' AND column_name = 'category') THEN
    CREATE INDEX IF NOT EXISTS idx_custom_blocks_category ON custom_blocks(category);
  END IF;
  
  -- Create GIN index for block_data if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'custom_blocks' AND column_name = 'block_data') THEN
    CREATE INDEX IF NOT EXISTS idx_custom_blocks_block_data ON custom_blocks USING GIN (block_data);
  END IF;
  
  -- Create GIN index for tags if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'custom_blocks' AND column_name = 'tags') THEN
    CREATE INDEX IF NOT EXISTS idx_custom_blocks_tags ON custom_blocks USING GIN (tags);
  END IF;
END $$;
