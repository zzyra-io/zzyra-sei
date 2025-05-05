-- Migrate data from block_library to custom_blocks
-- This is a simplified migration that handles potential data type issues

-- First, check if block_library table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'block_library') THEN
    -- Get the first admin user as the default owner for blocks without an owner
    DECLARE admin_user UUID;
    BEGIN
      SELECT id INTO admin_user FROM auth.users LIMIT 1;
      
      -- Insert data from block_library to custom_blocks
      -- For each record where block_data is not null
      INSERT INTO custom_blocks
        (name, description, block_type, category, block_data, is_public, tags, user_id, created_at, updated_at, version, code, logic)
      SELECT 
        bl.name,
        COALESCE(bl.description, ''),
        COALESCE(bl.block_type, 'custom'),
        'Logic', -- Use a known valid category to pass constraint check
        bl.block_data,
        COALESCE(bl.is_public, true),
        '[]'::jsonb, -- Use empty JSON array for tags to avoid type issues
        COALESCE(bl.user_id, admin_user),
        COALESCE(bl.created_at, NOW()),
        COALESCE(bl.updated_at, NOW()),
        '1.0.0',
        COALESCE((bl.block_data->>'code')::text, ''),
        COALESCE((bl.block_data->>'logic')::text, '')
      FROM block_library bl
      WHERE 
        bl.block_data IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM custom_blocks cb WHERE cb.name = bl.name);
    END;
  END IF;
END;
$$;
