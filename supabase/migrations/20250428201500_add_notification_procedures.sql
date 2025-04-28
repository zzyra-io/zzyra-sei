-- Create stored procedures for notification system

-- Function to get user notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_preferences(user_id_param UUID)
RETURNS SETOF notification_preferences AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM notification_preferences
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to upsert notification preference
CREATE OR REPLACE FUNCTION upsert_notification_preference(
  user_id_param UUID,
  notification_type_param TEXT,
  email_enabled_param BOOLEAN,
  in_app_enabled_param BOOLEAN,
  telegram_enabled_param BOOLEAN,
  discord_enabled_param BOOLEAN
) RETURNS VOID AS $$
BEGIN
  INSERT INTO notification_preferences (
    user_id, 
    notification_type, 
    email_enabled, 
    in_app_enabled, 
    telegram_enabled, 
    discord_enabled
  )
  VALUES (
    user_id_param,
    notification_type_param,
    email_enabled_param,
    in_app_enabled_param,
    telegram_enabled_param,
    discord_enabled_param
  )
  ON CONFLICT (user_id, notification_type)
  DO UPDATE SET
    email_enabled = email_enabled_param,
    in_app_enabled = in_app_enabled_param,
    telegram_enabled = telegram_enabled_param,
    discord_enabled = discord_enabled_param,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user notification channels
CREATE OR REPLACE FUNCTION update_user_notification_channels(
  user_id_param UUID,
  telegram_chat_id_param TEXT,
  discord_webhook_url_param TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET 
    telegram_chat_id = telegram_chat_id_param,
    discord_webhook_url = discord_webhook_url_param,
    updated_at = NOW()
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for the functions
ALTER FUNCTION get_user_notification_preferences(UUID) SET SCHEMA 'public';
ALTER FUNCTION upsert_notification_preference(UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) SET SCHEMA 'public';
ALTER FUNCTION update_user_notification_channels(UUID, TEXT, TEXT) SET SCHEMA 'public';

GRANT EXECUTE ON FUNCTION get_user_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_notification_preference(UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_notification_channels(UUID, TEXT, TEXT) TO authenticated;
