-- Create blockchain_transactions table for tracking blockchain transactions processed by the TransactionBlockHandler

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS public.blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id TEXT NOT NULL,
  execution_id UUID NOT NULL,
  to_address TEXT NOT NULL,
  value TEXT NOT NULL,
  data JSONB,
  chain_id INTEGER NOT NULL,
  gas_limit TEXT,
  gas_used TEXT,
  max_fee_per_gas TEXT,
  max_priority_fee_per_gas TEXT,
  nonce INTEGER,
  wallet_address TEXT NOT NULL,
  hash TEXT,
  block_number BIGINT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'submitted', 'confirmed', 'failed')),
  error TEXT,
  effective_gas_price TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_execution_id ON public.blockchain_transactions(execution_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_node_id ON public.blockchain_transactions(node_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_user_id ON public.blockchain_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_status ON public.blockchain_transactions(status);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_hash ON public.blockchain_transactions(hash) WHERE hash IS NOT NULL;

-- Step 3: Add comment to describe the table
COMMENT ON TABLE public.blockchain_transactions IS 'Records of blockchain transactions processed by the workflow engine';

-- Step 4: Enable Row Level Security (RLS)
ALTER TABLE public.blockchain_transactions ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- Users can only read their own transactions
CREATE POLICY "Users can view their own transactions" 
  ON public.blockchain_transactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Service role can perform all operations (internal system operations)
CREATE POLICY "Service role can do everything" 
  ON public.blockchain_transactions 
  FOR ALL 
  TO service_role 
  USING (true);

-- Step 6: Create a function to automatically set user_id from execution record if needed
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'blockchain_transaction_set_user_id') THEN
    EXECUTE $FUNC$
    CREATE FUNCTION public.blockchain_transaction_set_user_id()
    RETURNS TRIGGER AS $BODY$
    BEGIN
      -- Get user_id from workflow_executions table
      SELECT user_id INTO NEW.user_id 
      FROM public.workflow_executions 
      WHERE id = NEW.execution_id;
      
      RETURN NEW;
    END;
    $BODY$ LANGUAGE plpgsql SECURITY DEFINER;
    $FUNC$;
  END IF;
END
$$;

-- Step 7: Create trigger to automatically set user_id
DROP TRIGGER IF EXISTS set_blockchain_transaction_user_id ON public.blockchain_transactions;
CREATE TRIGGER set_blockchain_transaction_user_id
  BEFORE INSERT ON public.blockchain_transactions
  FOR EACH ROW
  WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION public.blockchain_transaction_set_user_id();

-- Step 8: Check if the timestamp function exists and create if it doesn't
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

-- Add a trigger for updating the updated_at timestamp
DROP TRIGGER IF EXISTS set_blockchain_transactions_updated_at ON public.blockchain_transactions;
CREATE TRIGGER set_blockchain_transactions_updated_at
  BEFORE UPDATE ON public.blockchain_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp_updated_at();
