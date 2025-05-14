-- Migration to add missing columns required for Magic integration
-- This fixes the schema mismatches between the database and the @zyra/wallet library

-- Add missing columns if they don't exist in public.user_wallets
DO $$
BEGIN
  -- Add chain_id column (required by Magic wallet adapter)
  IF EXISTS (SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_wallets') 
     AND NOT EXISTS (SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_wallets' 
                    AND column_name = 'chain_id') THEN
    ALTER TABLE public.user_wallets ADD COLUMN chain_id TEXT;
  END IF;

  -- Add chain_type column (required by Magic wallet adapter)
  IF EXISTS (SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_wallets') 
     AND NOT EXISTS (SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_wallets' 
                    AND column_name = 'chain_type') THEN
    ALTER TABLE public.user_wallets ADD COLUMN chain_type TEXT;
  END IF;

  -- Add wallet_type column (required by Magic wallet adapter)
  IF EXISTS (SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_wallets') 
     AND NOT EXISTS (SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_wallets' 
                    AND column_name = 'wallet_type') THEN
    ALTER TABLE public.user_wallets ADD COLUMN wallet_type TEXT;
  END IF;

  -- Add wallet_address column if needed
  IF EXISTS (SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_wallets') 
     AND NOT EXISTS (SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_wallets' 
                    AND column_name = 'wallet_address') 
     AND EXISTS (SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'user_wallets' 
                AND column_name = 'smart_wallet_address') THEN
    -- Rename the existing column to match what the wallet adapter expects
    ALTER TABLE public.user_wallets RENAME COLUMN smart_wallet_address TO wallet_address;
  END IF;

  -- Add wallet_address column if it doesn't exist and smart_wallet_address doesn't exist either
  IF EXISTS (SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_wallets') 
     AND NOT EXISTS (SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_wallets' 
                    AND column_name = 'wallet_address') 
     AND NOT EXISTS (SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_wallets' 
                    AND column_name = 'smart_wallet_address') THEN
    ALTER TABLE public.user_wallets ADD COLUMN wallet_address TEXT;
  END IF;

  -- Add metadata column (required by Magic wallet adapter)
  IF EXISTS (SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_wallets') 
     AND NOT EXISTS (SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_wallets' 
                    AND column_name = 'metadata') THEN
    ALTER TABLE public.user_wallets ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;