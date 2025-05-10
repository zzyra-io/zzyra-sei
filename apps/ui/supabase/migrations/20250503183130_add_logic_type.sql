-- Add logic_type column
ALTER TABLE custom_blocks
  ADD COLUMN IF NOT EXISTS logic_type VARCHAR(50) DEFAULT 'javascript';

-- Update existing rows
UPDATE custom_blocks SET logic_type = 'javascript' WHERE logic_type IS NULL;
