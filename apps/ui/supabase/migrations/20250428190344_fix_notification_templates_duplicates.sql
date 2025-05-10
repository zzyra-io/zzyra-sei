-- First, delete any existing notification templates to avoid conflicts
DELETE FROM notification_templates;

-- Add ON CONFLICT clause to handle duplicates gracefully in the future
ALTER TABLE notification_templates 
DROP CONSTRAINT IF EXISTS notification_templates_notification_type_channel_key;

-- Recreate the constraint with ON CONFLICT DO UPDATE behavior
ALTER TABLE notification_templates 
ADD CONSTRAINT notification_templates_notification_type_channel_key 
UNIQUE (notification_type, channel);

-- This will allow the main migration to proceed without duplicate key errors