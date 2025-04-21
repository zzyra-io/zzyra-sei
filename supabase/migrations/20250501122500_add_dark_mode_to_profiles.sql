-- Migration: add dark_mode column to profiles

-- Add a boolean column to store user theme preference (dark mode)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS dark_mode boolean NOT NULL DEFAULT false;
