-- Add Telegram and Discord preference fields to notification_preferences
do $$ begin
  alter table notification_preferences
    add column if not exists telegram_enabled boolean default false,
    add column if not exists telegram_chat_id text,
    add column if not exists discord_enabled boolean default false,
    add column if not exists discord_webhook_url text;
exception when duplicate_column then null; end $$;
