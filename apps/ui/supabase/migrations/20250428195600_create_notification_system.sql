-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (notification_type, channel)
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  telegram_enabled BOOLEAN DEFAULT false,
  discord_enabled BOOLEAN DEFAULT false,
  in_app_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, notification_type)
);

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  content JSONB,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to see only their own notification preferences
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to update their own notification preferences
CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to see only their own notification logs
CREATE POLICY "Users can view their own notification logs"
  ON notification_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insert default notification templates for all channels and types
INSERT INTO notification_templates (notification_type, channel, subject, body)
VALUES
  -- Email templates
  ('workflow_started', 'email', 'Workflow Started: {{workflowName}}', 'Your workflow "{{workflowName}}" has started execution at {{timestamp}}.'),
  ('workflow_completed', 'email', 'Workflow Completed: {{workflowName}}', 'Your workflow "{{workflowName}}" has completed successfully at {{timestamp}}.'),
  ('workflow_failed', 'email', 'Workflow Failed: {{workflowName}}', 'Your workflow "{{workflowName}}" has failed at {{timestamp}}. Error: {{error}}'),
  ('node_error', 'email', 'Node Error in Workflow: {{workflowName}}', 'A node error occurred in your workflow "{{workflowName}}" at {{timestamp}}. Node: {{nodeName}}. Error: {{error}}'),
  ('quota_alert', 'email', 'Quota Alert', 'You have used {{usedPercentage}}% of your monthly execution quota. Your current usage: {{used}}/{{total}} executions.'),
  ('system_alert', 'email', 'System Alert: {{alertTitle}}', '{{alertMessage}}'),
  
  -- In-app templates
  ('workflow_started', 'in_app', 'Workflow Started', 'Your workflow "{{workflowName}}" has started execution.'),
  ('workflow_completed', 'in_app', 'Workflow Completed', 'Your workflow "{{workflowName}}" has completed successfully.'),
  ('workflow_failed', 'in_app', 'Workflow Failed', 'Your workflow "{{workflowName}}" has failed. Error: {{error}}'),
  ('node_error', 'in_app', 'Node Error', 'A node error occurred in your workflow "{{workflowName}}". Node: {{nodeName}}'),
  ('quota_alert', 'in_app', 'Quota Alert', 'You have used {{usedPercentage}}% of your monthly execution quota.'),
  ('system_alert', 'in_app', 'System Alert', '{{alertMessage}}'),
  
  -- Telegram templates
  ('workflow_started', 'telegram', NULL, '🚀 *Workflow Started*\nYour workflow "{{workflowName}}" has started execution.'),
  ('workflow_completed', 'telegram', NULL, '✅ *Workflow Completed*\nYour workflow "{{workflowName}}" has completed successfully.'),
  ('workflow_failed', 'telegram', NULL, '❌ *Workflow Failed*\nYour workflow "{{workflowName}}" has failed.\nError: {{error}}'),
  ('node_error', 'telegram', NULL, '⚠️ *Node Error*\nA node error occurred in your workflow "{{workflowName}}".\nNode: {{nodeName}}\nError: {{error}}'),
  ('quota_alert', 'telegram', NULL, '📊 *Quota Alert*\nYou have used {{usedPercentage}}% of your monthly execution quota.'),
  ('system_alert', 'telegram', NULL, '📢 *System Alert*\n{{alertMessage}}'),
  
  -- Discord templates
  ('workflow_started', 'discord', NULL, '{"embeds":[{"title":"Workflow Started","description":"Your workflow \"{{workflowName}}\" has started execution.","color":3447003}]}'),
  ('workflow_completed', 'discord', NULL, '{"embeds":[{"title":"Workflow Completed","description":"Your workflow \"{{workflowName}}\" has completed successfully.","color":5763719}]}'),
  ('workflow_failed', 'discord', NULL, '{"embeds":[{"title":"Workflow Failed","description":"Your workflow \"{{workflowName}}\" has failed.\nError: {{error}}","color":15548997}]}'),
  ('node_error', 'discord', NULL, '{"embeds":[{"title":"Node Error","description":"A node error occurred in your workflow \"{{workflowName}}\".\nNode: {{nodeName}}\nError: {{error}}","color":16776960}]}'),
  ('quota_alert', 'discord', NULL, '{"embeds":[{"title":"Quota Alert","description":"You have used {{usedPercentage}}% of your monthly execution quota.","color":16776960}]}'),
  ('system_alert', 'discord', NULL, '{"embeds":[{"title":"System Alert","description":"{{alertMessage}}","color":3447003}]}');
