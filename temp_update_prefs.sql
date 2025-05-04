-- Enable in-app for existing workflow_completed preference
UPDATE notification_preferences
SET in_app_enabled = true
WHERE user_id = '4c5c6ae8-cc07-4a4a-8d93-1eb7ab73556e' AND notification_type = 'workflow_completed';

-- Insert or update preference for workflow_started
INSERT INTO notification_preferences (user_id, notification_type, email_enabled, telegram_enabled, discord_enabled, in_app_enabled)
VALUES ('4c5c6ae8-cc07-4a4a-8d93-1eb7ab73556e', 'workflow_started', false, false, false, true)
ON CONFLICT (user_id, notification_type)
DO UPDATE SET in_app_enabled = EXCLUDED.in_app_enabled;

-- Insert or update preference for workflow_failed
INSERT INTO notification_preferences (user_id, notification_type, email_enabled, telegram_enabled, discord_enabled, in_app_enabled)
VALUES ('4c5c6ae8-cc07-4a4a-8d93-1eb7ab73556e', 'workflow_failed', false, false, false, true)
ON CONFLICT (user_id, notification_type)
DO UPDATE SET in_app_enabled = EXCLUDED.in_app_enabled;
