-- Add is_favorite column to workflows table
ALTER TABLE public.workflows
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;
