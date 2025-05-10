-- Create blockchain transactions table for tracking all transaction executions
CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id UUID NOT NULL,
  execution_id UUID NOT NULL,
  chain_id INTEGER NOT NULL,
  transaction_hash TEXT,
  destination_address TEXT NOT NULL,
  value NUMERIC(78, 0) DEFAULT 0, -- Large numeric to handle wei amounts
  data TEXT,
  gas_limit NUMERIC(78, 0),
  gas_used NUMERIC(78, 0),
  gas_price NUMERIC(78, 0),
  nonce INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, failed
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

-- Create circuit breaker state table for tracking circuit breaker status
CREATE TABLE IF NOT EXISTS circuit_breaker_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id TEXT NOT NULL UNIQUE, -- Composite key: chainId-userId-operationType
  state TEXT NOT NULL DEFAULT 'CLOSED', -- CLOSED, OPEN, HALF_OPEN
  failure_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  last_failure_time TIMESTAMPTZ,
  last_success_time TIMESTAMPTZ,
  last_half_open_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on blockchain_transactions for faster lookups
CREATE INDEX IF NOT EXISTS blockchain_transactions_user_id_idx ON blockchain_transactions(user_id);
CREATE INDEX IF NOT EXISTS blockchain_transactions_execution_id_idx ON blockchain_transactions(execution_id);
CREATE INDEX IF NOT EXISTS blockchain_transactions_status_idx ON blockchain_transactions(status);
CREATE INDEX IF NOT EXISTS blockchain_transactions_chain_id_idx ON blockchain_transactions(chain_id);
CREATE INDEX IF NOT EXISTS blockchain_transactions_created_at_idx ON blockchain_transactions(created_at);

-- Create index on circuit_breaker_state for faster lookups
CREATE INDEX IF NOT EXISTS circuit_breaker_state_circuit_id_idx ON circuit_breaker_state(circuit_id);
CREATE INDEX IF NOT EXISTS circuit_breaker_state_state_idx ON circuit_breaker_state(state);

-- Enable Row Level Security (RLS)
ALTER TABLE blockchain_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_breaker_state ENABLE ROW LEVEL SECURITY;

-- Create policy for blockchain_transactions
CREATE POLICY "Users can view their own blockchain transactions"
  ON blockchain_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own blockchain transactions"
  ON blockchain_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blockchain transactions"
  ON blockchain_transactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy for circuit_breaker_state (allow service access only)
-- For the circuit_breaker_state table, we only want the backend service to access it,
-- so we'll use a check against the service role
CREATE POLICY "Service role can manage circuit breaker state"
  ON circuit_breaker_state FOR ALL
  USING (auth.jwt() ? 'service_role');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blockchain_transactions_updated_at
  BEFORE UPDATE ON blockchain_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_circuit_breaker_state_updated_at
  BEFORE UPDATE ON circuit_breaker_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE blockchain_transactions IS 'Tracks all blockchain transactions executed by the system';
COMMENT ON TABLE circuit_breaker_state IS 'Stores the state of circuit breakers for blockchain operations';
