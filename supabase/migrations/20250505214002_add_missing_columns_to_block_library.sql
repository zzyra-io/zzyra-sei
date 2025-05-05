-- Add all potentially missing columns to block_library table based on the JSON structure

-- Add category column if not exists
ALTER TABLE block_library
ADD COLUMN IF NOT EXISTS category VARCHAR;

-- Add block_type column if not exists
ALTER TABLE block_library
ADD COLUMN IF NOT EXISTS block_type VARCHAR;

-- Add version column if not exists
ALTER TABLE block_library
ADD COLUMN IF NOT EXISTS version VARCHAR;

-- Add is_verified column if not exists
ALTER TABLE block_library
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Add rating column if not exists
ALTER TABLE block_library
ADD COLUMN IF NOT EXISTS rating INT DEFAULT 0;

-- Add usage_count column if not exists
ALTER TABLE block_library
ADD COLUMN IF NOT EXISTS usage_count INT DEFAULT 0;

-- Add comments for all columns
COMMENT ON COLUMN block_library.category IS 'Category of the block (e.g., action, trigger, condition, transformer, finance, AI)';
COMMENT ON COLUMN block_library.block_type IS 'Type of block (e.g., custom, standard)';
COMMENT ON COLUMN block_library.version IS 'Version number of the block';
COMMENT ON COLUMN block_library.is_verified IS 'Whether the block has been verified by administrators';
COMMENT ON COLUMN block_library.rating IS 'User rating of the block';
COMMENT ON COLUMN block_library.usage_count IS 'Number of times the block has been used';
