-- Disable custom user profile trigger to prevent signup failures

-- Drop the trigger and function that auto-insert into public.profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
