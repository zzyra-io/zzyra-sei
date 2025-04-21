-- Migration: create notifications and notification_settings tables
BEGIN;

-- Create notification_settings table
CREATE TABLE public.notification_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL,     -- e.g. 'email', 'slack', 'sms', 'in_app'
  event_type text NOT NULL,  -- e.g. 'workflow_failed', 'payment_success'
  config jsonb DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their notification settings" ON public.notification_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMIT;
