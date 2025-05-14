-- Create user_wallets table to store wallet information
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  chain_type TEXT NOT NULL,
  chain_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, chain_type, chain_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict access to own records
CREATE POLICY "Users can only access their own wallets"
  ON public.user_wallets
  FOR ALL
  USING (auth.uid() = user_id);

-- Create wallet_transactions table to track blockchain transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  tx_hash TEXT NOT NULL,
  tx_type TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict access to own transactions
CREATE POLICY "Users can only access their own transactions"
  ON public.wallet_transactions
  FOR ALL
  USING (auth.uid() = user_id);

-- Create indexes for faster queries only if they don't exist
DO $$
BEGIN
  -- Check if idx_user_wallets_user_id index exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_user_wallets_user_id'
  ) THEN
    CREATE INDEX idx_user_wallets_user_id ON public.user_wallets(user_id);
  END IF;
  
  -- Check if idx_wallet_transactions_user_id index exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_wallet_transactions_user_id'
  ) THEN
    CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
  END IF;
  
  -- Check if idx_wallet_transactions_wallet_id index exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_wallet_transactions_wallet_id'
  ) THEN
    CREATE INDEX idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
  END IF;
END
$$;
