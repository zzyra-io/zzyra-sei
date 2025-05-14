-- Migration to fix table structure for @zyra/wallet
-- We need to add the columns that the Magic wallet adapter requires

-- For existing user_wallets table, ensure it has the columns needed by the wallet adapter
DO $$
DECLARE
  schema_name TEXT;
BEGIN
  -- Determine which schema has the user_wallets table
  SELECT table_schema INTO schema_name 
  FROM information_schema.tables 
  WHERE table_name = 'user_wallets' 
  LIMIT 1;
  
  IF schema_name IS NOT NULL THEN
    -- Add chain_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = schema_name AND table_name = 'user_wallets' 
                  AND column_name = 'chain_id') THEN
      EXECUTE format('ALTER TABLE %I.user_wallets ADD COLUMN chain_id TEXT', schema_name);
    END IF;

    -- Add chain_type column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = schema_name AND table_name = 'user_wallets' 
                  AND column_name = 'chain_type') THEN
      EXECUTE format('ALTER TABLE %I.user_wallets ADD COLUMN chain_type TEXT', schema_name);
    END IF;

    -- Add wallet_type column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = schema_name AND table_name = 'user_wallets' 
                  AND column_name = 'wallet_type') THEN
      EXECUTE format('ALTER TABLE %I.user_wallets ADD COLUMN wallet_type TEXT', schema_name);
    END IF;

    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = schema_name AND table_name = 'user_wallets' 
                  AND column_name = 'metadata') THEN
      EXECUTE format('ALTER TABLE %I.user_wallets ADD COLUMN metadata JSONB DEFAULT ''{}''::jsonb', schema_name);
    END IF;
    
    -- Make sure we have an index on user_id but handle if it already exists
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                  WHERE tablename = 'user_wallets' 
                  AND indexname = 'idx_user_wallets_user_id') THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON %I.user_wallets(user_id)', schema_name);
    END IF;
  END IF;
END$$;