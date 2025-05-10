-- Add block_data column to block_library table
ALTER TABLE block_library
ADD COLUMN IF NOT EXISTS block_data JSONB;

-- Add comment explaining the purpose of the column
COMMENT ON COLUMN block_library.block_data IS 'Stores structured data for custom blocks including inputs, outputs, and implementation code';

-- Create index for improved query performance on the JSONB column
CREATE INDEX IF NOT EXISTS idx_block_library_block_data ON block_library USING GIN (block_data);
