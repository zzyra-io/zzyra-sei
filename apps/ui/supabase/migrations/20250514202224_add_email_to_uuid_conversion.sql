-- Add function to handle email-to-UUID conversion for the Magic Link integration
-- This addresses the type mismatch between Magic (which uses email) and Supabase (which uses UUID)

-- Create function to convert email to UUID
CREATE OR REPLACE FUNCTION get_user_id_from_email(email_address text)
RETURNS uuid AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Try to get the user_id from the auth.users table based on email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = email_address;
  
  -- Return the found user_id or NULL if not found
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to safely insert wallet data that can work with email or UUID
CREATE OR REPLACE FUNCTION safe_insert_wallet(
  user_identifier text,
  wallet_addr text,
  wallet_type_val text,
  chain_type_val text,
  chain_id_val text,
  metadata_val jsonb DEFAULT '{}'::jsonb
) RETURNS json AS $$
DECLARE
  user_uuid uuid;
  result_record record;
BEGIN
  -- Try to parse user_identifier as UUID first
  BEGIN
    user_uuid := user_identifier::uuid;
  EXCEPTION WHEN others THEN
    -- If conversion fails, try to get UUID by email
    user_uuid := get_user_id_from_email(user_identifier);
  END;
  
  -- If we couldn't get a UUID, raise an exception
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Could not find user with identifier %', user_identifier;
  END IF;
  
  -- Insert or update the wallet
  INSERT INTO user_wallets (
    user_id,
    wallet_address,
    wallet_type,
    chain_type,
    chain_id,
    metadata
  ) VALUES (
    user_uuid,
    wallet_addr,
    wallet_type_val,
    chain_type_val,
    chain_id_val,
    metadata_val
  )
  ON CONFLICT (user_id, wallet_address, chain_type, chain_id) 
  DO UPDATE SET
    wallet_type = wallet_type_val,
    metadata = metadata_val,
    updated_at = NOW()
  RETURNING * INTO result_record;
  
  -- Return the result as JSON
  RETURN row_to_json(result_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get wallets by email or UUID
CREATE OR REPLACE FUNCTION get_wallets_by_identifier(user_identifier text)
RETURNS SETOF user_wallets AS $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Try to parse user_identifier as UUID first
  BEGIN
    user_uuid := user_identifier::uuid;
  EXCEPTION WHEN others THEN
    -- If conversion fails, try to get UUID by email
    user_uuid := get_user_id_from_email(user_identifier);
  END;
  
  -- If we couldn't get a UUID, return empty set
  IF user_uuid IS NULL THEN
    RETURN;
  END IF;
  
  -- Return wallets for the user
  RETURN QUERY SELECT * FROM user_wallets WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check user_id column type and add conversion if needed
DO $$
DECLARE
  column_type text;
BEGIN
  -- Get the data type of user_id column
  SELECT data_type INTO column_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'user_wallets' AND column_name = 'user_id';
  
  -- If user_id is currently TEXT but we actually need UUID, add a migration
  IF column_type = 'text' OR column_type = 'character varying' THEN
    -- Create temporary column and index to track original values
    ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS original_user_id text;
    
    -- Copy existing values
    UPDATE user_wallets SET original_user_id = user_id WHERE original_user_id IS NULL;
    
    -- Try to convert existing text values to UUIDs if possible
    DECLARE
      wallet record;
      user_uuid uuid;
    BEGIN
      FOR wallet IN SELECT * FROM user_wallets LOOP
        -- Try to parse as UUID directly
        BEGIN
          user_uuid := wallet.user_id::uuid;
          -- If successful, leave as is
        EXCEPTION WHEN others THEN
          -- Try to look up by email
          SELECT id INTO user_uuid
          FROM auth.users
          WHERE email = wallet.user_id;
          
          -- If found, update
          IF user_uuid IS NOT NULL THEN
            UPDATE user_wallets SET user_id = user_uuid::text WHERE id = wallet.id;
          END IF;
        END;
      END LOOP;
    END;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to use the functions
GRANT EXECUTE ON FUNCTION get_user_id_from_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_insert_wallet(text, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION get_wallets_by_identifier(text) TO authenticated;
