-- Create user_wallets table for @zyra/wallet library
-- This table stores wallet information for users across different blockchain networks

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the user_wallets table
CREATE TABLE IF NOT EXISTS user_wallets (
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

-- Add indexes for faster lookups
CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX idx_user_wallets_wallet_address ON user_wallets(wallet_address);
CREATE INDEX idx_user_wallets_chain ON user_wallets(chain_type, chain_id);

-- Add row level security policy for the user_wallets table
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read only their own wallets
CREATE POLICY "Users can view their own wallets" 
  ON user_wallets
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Policy to allow users to insert their own wallets
CREATE POLICY "Users can insert their own wallets" 
  ON user_wallets
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Policy to allow users to update their own wallets
CREATE POLICY "Users can update their own wallets" 
  ON user_wallets
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at timestamp on update
CREATE TRIGGER update_user_wallets_updated_at
BEFORE UPDATE ON user_wallets
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON user_wallets TO authenticated;

-- Grant permissions to service_role (for worker access)
GRANT ALL ON user_wallets TO service_role;