-- Disable email confirmation requirement for Magic integrations
-- This allows users to authenticate with Magic and maintain a seamless experience

-- Note: We can't directly update auth settings via migrations in some Supabase versions
-- Instead, we'll focus on auto-confirming emails for Magic-authenticated users

-- Create a trigger that will auto-confirm new users created via Magic
CREATE OR REPLACE FUNCTION public.auto_confirm_magic_users()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user has magic_authenticated = true in their metadata
  -- automatically confirm their email without requiring verification
  IF NEW.raw_app_meta_data->>'magic_authenticated' = 'true' THEN
    -- Set email_confirmed_at to current timestamp
    NEW.email_confirmed_at = NOW();
    -- Also set last_sign_in_at to current timestamp
    NEW.last_sign_in_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the auth.users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_auto_confirm_magic_users'
  ) THEN
    CREATE TRIGGER trg_auto_confirm_magic_users
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_confirm_magic_users();
  END IF;
END
$$;

-- Also update existing users who may have magic_authenticated = true
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL 
AND raw_app_meta_data->>'magic_authenticated' = 'true';
