-- Create user_wallets table for @zyra/wallet library
-- This table stores wallet information for users across different blockchain networks

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Instead of creating the table, check if it exists and add missing columns as needed
DO $$
DECLARE
  column_exists boolean;
BEGIN
  -- Check if table exists before trying to create it
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_wallets'
  ) THEN
    -- Create the user_wallets table if it doesn't exist
    CREATE TABLE user_wallets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      wallet_type TEXT NOT NULL,
      chain_type TEXT NOT NULL,
      chain_id TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      -- Add a unique constraint to prevent duplicate wallets for the same user, chain type, and chain ID
      UNIQUE(user_id, wallet_address, chain_type, chain_id)
    );
  ELSE
    -- Table exists, check for missing columns and add them
    
    -- Check if wallet_address column exists
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_wallets' 
      AND column_name = 'wallet_address'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      -- Check if smart_wallet_address exists (we might need to rename it)
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_wallets' 
        AND column_name = 'smart_wallet_address'
      ) INTO column_exists;
      
      IF column_exists THEN
        -- Instead of adding a new column, rename existing smart_wallet_address to wallet_address
        ALTER TABLE user_wallets RENAME COLUMN smart_wallet_address TO wallet_address;
      ELSE
        -- Add wallet_address column if neither exists
        ALTER TABLE user_wallets ADD COLUMN wallet_address TEXT;
      END IF;
    END IF;
    
    -- Check and add wallet_type if missing
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_wallets' 
      AND column_name = 'wallet_type'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      ALTER TABLE user_wallets ADD COLUMN wallet_type TEXT;
    END IF;
    
    -- Check and add chain_type if missing
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_wallets' 
      AND column_name = 'chain_type'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      ALTER TABLE user_wallets ADD COLUMN chain_type TEXT;
    END IF;
    
    -- Check and add chain_id if missing
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_wallets' 
      AND column_name = 'chain_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      -- Check if network_id exists (we might need to rename it)
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_wallets' 
        AND column_name = 'network_id'
      ) INTO column_exists;
      
      IF column_exists THEN
        -- Instead of adding a new column, rename existing network_id to chain_id
        ALTER TABLE user_wallets RENAME COLUMN network_id TO chain_id;
      ELSE
        -- Add chain_id column if neither exists
        ALTER TABLE user_wallets ADD COLUMN chain_id TEXT;
      END IF;
    END IF;
    
    -- Check and add metadata if missing
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_wallets' 
      AND column_name = 'metadata'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      ALTER TABLE user_wallets ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
  END IF;
END
$$;

-- Add indexes and adjust column structure based on what exists
DO $$
DECLARE
  column_exists boolean;
BEGIN
  -- Create user_id index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_wallets_user_id'
  ) THEN
    CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);
  END IF;
  
  -- Check if smart_wallet_address column exists instead of wallet_address
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_wallets' 
    AND column_name = 'smart_wallet_address'
  ) INTO column_exists;
  
  IF column_exists THEN
    -- Create index on smart_wallet_address if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_wallets_smart_wallet_address'
    ) THEN
      CREATE INDEX idx_user_wallets_smart_wallet_address ON user_wallets(smart_wallet_address);
    END IF;
  ELSE
    -- Check if wallet_address column exists
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_wallets' 
      AND column_name = 'wallet_address'
    ) INTO column_exists;
    
    IF column_exists THEN
      -- Create index on wallet_address if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_wallets_wallet_address'
      ) THEN
        CREATE INDEX idx_user_wallets_wallet_address ON user_wallets(wallet_address);
      END IF;
    END IF;
  END IF;
  
  -- Check if chain_type and chain_id columns exist
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_wallets' 
    AND column_name = 'chain_type'
  ) INTO column_exists;
  
  IF column_exists THEN
    -- Check if chain_id column exists
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_wallets' 
      AND column_name = 'chain_id'
    ) INTO column_exists;
    
    IF column_exists THEN
      -- Create index on chain_type and chain_id if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_wallets_chain'
      ) THEN
        CREATE INDEX idx_user_wallets_chain ON user_wallets(chain_type, chain_id);
      END IF;
    END IF;
  END IF;
END
$$;

-- Add row level security policy for the user_wallets table with existence check
DO $$
DECLARE
  user_id_type text;
  policy_exists boolean;
BEGIN
  -- Enable RLS if not already enabled
  ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
  
  -- Get the data type of user_id column to handle it correctly in policies
  SELECT data_type INTO user_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'user_wallets' AND column_name = 'user_id';
  
  -- Check if the select policy already exists
  SELECT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'user_wallets' AND policyname = 'Users can view their own wallets'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    -- Create appropriate policy based on user_id data type
    IF user_id_type = 'uuid' THEN
      EXECUTE 'CREATE POLICY "Users can view their own wallets" ON user_wallets FOR SELECT USING (auth.uid() = user_id)';
    ELSE
      EXECUTE 'CREATE POLICY "Users can view their own wallets" ON user_wallets FOR SELECT USING (auth.uid()::text = user_id)';
    END IF;
  END IF;
  
  -- Check if the insert policy already exists
  SELECT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'user_wallets' AND policyname = 'Users can insert their own wallets'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    -- Create appropriate policy based on user_id data type
    IF user_id_type = 'uuid' THEN
      EXECUTE 'CREATE POLICY "Users can insert their own wallets" ON user_wallets FOR INSERT WITH CHECK (auth.uid() = user_id)';
    ELSE
      EXECUTE 'CREATE POLICY "Users can insert their own wallets" ON user_wallets FOR INSERT WITH CHECK (auth.uid()::text = user_id)';
    END IF;
  END IF;
  
  -- Check if the update policy already exists
  SELECT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'user_wallets' AND policyname = 'Users can update their own wallets'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    -- Create appropriate policy based on user_id data type
    IF user_id_type = 'uuid' THEN
      EXECUTE 'CREATE POLICY "Users can update their own wallets" ON user_wallets FOR UPDATE USING (auth.uid() = user_id)';
    ELSE
      EXECUTE 'CREATE POLICY "Users can update their own wallets" ON user_wallets FOR UPDATE USING (auth.uid()::text = user_id)';
    END IF;
  END IF;
END
$$;

-- Create the timestamp update function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_wallets_updated_at'
  ) THEN
    CREATE TRIGGER update_user_wallets_updated_at
    BEFORE UPDATE ON user_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
  END IF;
END
$$;

-- Grant permissions (these are idempotent operations)
GRANT SELECT, INSERT, UPDATE ON user_wallets TO authenticated;
GRANT ALL ON user_wallets TO service_role;