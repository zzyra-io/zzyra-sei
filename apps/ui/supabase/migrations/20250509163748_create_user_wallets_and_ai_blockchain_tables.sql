-- Migration to create user_wallets and ai_blockchain_operations tables with proper security

-- Step 1: Create the user_wallets table for secure wallet storage
-- This replaces the insecure file-based storage previously used
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network_id TEXT NOT NULL,
  smart_wallet_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Add a unique constraint to ensure one wallet per user per network
  CONSTRAINT user_wallets_user_network_unique UNIQUE (user_id, network_id)
);

-- Step 2: Create indexes for common query patterns on user_wallets
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON public.user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_network_id ON public.user_wallets(network_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_smart_wallet_address ON public.user_wallets(smart_wallet_address);

-- Step 3: Add comment to describe the table
COMMENT ON TABLE public.user_wallets IS 'Secure storage for user blockchain wallet addresses, replacing file-based storage';

-- Step 4: Enable Row Level Security (RLS) for user_wallets
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for user_wallets
-- Users can only view their own wallets
CREATE POLICY "Users can view their own wallets" 
  ON public.user_wallets 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Service role can perform all operations (for internal system operations)
CREATE POLICY "Service role can do everything with wallets" 
  ON public.user_wallets 
  FOR ALL 
  TO service_role 
  USING (true);

-- Step 6: Create the ai_blockchain_operations table for auditing and monitoring
CREATE TABLE IF NOT EXISTS public.ai_blockchain_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  execution_id UUID NOT NULL,
  operation_type TEXT NOT NULL,
  prompt TEXT,
  blockchain TEXT,
  result JSONB,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 7: Create indexes for common query patterns on ai_blockchain_operations
CREATE INDEX IF NOT EXISTS idx_ai_blockchain_operations_user_id ON public.ai_blockchain_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_blockchain_operations_execution_id ON public.ai_blockchain_operations(execution_id);
CREATE INDEX IF NOT EXISTS idx_ai_blockchain_operations_node_id ON public.ai_blockchain_operations(node_id);
CREATE INDEX IF NOT EXISTS idx_ai_blockchain_operations_status ON public.ai_blockchain_operations(status);

-- Step 8: Add comment to describe the table
COMMENT ON TABLE public.ai_blockchain_operations IS 'Audit trail of AI blockchain operations for monitoring and compliance';

-- Step 9: Enable Row Level Security (RLS) for ai_blockchain_operations
ALTER TABLE public.ai_blockchain_operations ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS policies for ai_blockchain_operations
-- Users can only view their own operations
CREATE POLICY "Users can view their own AI blockchain operations" 
  ON public.ai_blockchain_operations 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Service role can perform all operations (for internal system operations)
CREATE POLICY "Service role can do everything with AI blockchain operations" 
  ON public.ai_blockchain_operations 
  FOR ALL 
  TO service_role 
  USING (true);

-- Step 11: Add trigger for updating the updated_at timestamp on user_wallets
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_timestamp_updated_at') THEN
    EXECUTE $FUNC$
    CREATE OR REPLACE FUNCTION public.update_timestamp_updated_at()
    RETURNS TRIGGER AS $BODY$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $BODY$ LANGUAGE plpgsql;
    $FUNC$;
  END IF;
END
$$;

-- Add trigger to user_wallets
DROP TRIGGER IF EXISTS set_user_wallets_updated_at ON public.user_wallets;
CREATE TRIGGER set_user_wallets_updated_at
  BEFORE UPDATE ON public.user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp_updated_at();
