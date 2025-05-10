-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  email_enabled BOOLEAN DEFAULT FALSE,
  telegram_enabled BOOLEAN DEFAULT FALSE,
  discord_enabled BOOLEAN DEFAULT FALSE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

-- Enable RLS on notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy for notification_preferences
CREATE POLICY "Users can only view their own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create notification logs table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  content JSONB NOT NULL,
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on notification_logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for notification_logs
CREATE POLICY "Users can only view their own notification logs"
  ON public.notification_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create notification templates table
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(notification_type, channel)
);

-- Insert default notification templates
INSERT INTO public.notification_templates (notification_type, channel, subject, body)
VALUES 
  ('workflow_started', 'email', 'Workflow Started: {{workflow_name}}', 'Your workflow "{{workflow_name}}" has started execution.'),
  ('workflow_completed', 'email', 'Workflow Completed: {{workflow_name}}', 'Your workflow "{{workflow_name}}" has completed successfully.'),
  ('workflow_failed', 'email', 'Workflow Failed: {{workflow_name}}', 'Your workflow "{{workflow_name}}" has failed. Error: {{error_message}}'),
  ('node_error', 'email', 'Node Error in Workflow: {{workflow_name}}', 'A node in your workflow "{{workflow_name}}" has encountered an error. Node: {{node_name}}. Error: {{error_message}}'),
  ('quota_alert', 'email', 'Monthly Execution Quota Alert', 'You have used {{used_executions}} out of your {{total_executions}} monthly workflow executions.'),
  ('workflow_started', 'telegram', '', 'Zyra Alert: Your workflow "{{workflow_name}}" has started execution.'),
  ('workflow_completed', 'telegram', '', 'Zyra Alert: Your workflow "{{workflow_name}}" has completed successfully.'),
  ('workflow_failed', 'telegram', '', 'Zyra Alert: Your workflow "{{workflow_name}}" has failed. Error: {{error_message}}'),
  ('node_error', 'telegram', '', 'Zyra Alert: A node in your workflow "{{workflow_name}}" has encountered an error. Node: {{node_name}}. Error: {{error_message}}'),
  ('quota_alert', 'telegram', '', 'Zyra Alert: You have used {{used_executions}} out of your {{total_executions}} monthly workflow executions.'),
  ('workflow_started', 'discord', '', '{"embeds": [{"title": "Workflow Started", "description": "Your workflow **{{workflow_name}}** has started execution.", "color": 3447003}]}'),
  ('workflow_completed', 'discord', '', '{"embeds": [{"title": "Workflow Completed", "description": "Your workflow **{{workflow_name}}** has completed successfully.", "color": 5763719}]}'),
  ('workflow_failed', 'discord', '', '{"embeds": [{"title": "Workflow Failed", "description": "Your workflow **{{workflow_name}}** has failed.\nError: {{error_message}}", "color": 15548997}]}'),
  ('node_error', 'discord', '', '{"embeds": [{"title": "Node Error", "description": "A node in your workflow **{{workflow_name}}** has encountered an error.\nNode: {{node_name}}\nError: {{error_message}}", "color": 15105570}]}'),
  ('quota_alert', 'discord', '', '{"embeds": [{"title": "Quota Alert", "description": "You have used **{{used_executions}}** out of your **{{total_executions}}** monthly workflow executions.", "color": 10181046}]}');

-- Create default notification preferences for all existing users
INSERT INTO public.notification_preferences (user_id, notification_type, email_enabled, in_app_enabled)
SELECT 
  id, 'workflow_started', FALSE, TRUE
FROM 
  auth.users
ON CONFLICT DO NOTHING;

INSERT INTO public.notification_preferences (user_id, notification_type, email_enabled, in_app_enabled)
SELECT 
  id, 'workflow_completed', FALSE, TRUE
FROM 
  auth.users
ON CONFLICT DO NOTHING;

INSERT INTO public.notification_preferences (user_id, notification_type, email_enabled, in_app_enabled)
SELECT 
  id, 'workflow_failed', TRUE, TRUE
FROM 
  auth.users
ON CONFLICT DO NOTHING;

INSERT INTO public.notification_preferences (user_id, notification_type, email_enabled, in_app_enabled)
SELECT 
  id, 'node_error', TRUE, TRUE
FROM 
  auth.users
ON CONFLICT DO NOTHING;

INSERT INTO public.notification_preferences (user_id, notification_type, email_enabled, in_app_enabled)
SELECT 
  id, 'quota_alert', TRUE, TRUE
FROM 
  auth.users
ON CONFLICT DO NOTHING;