-- Migration: create feedback table and policies
BEGIN;

-- Ensure uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create feedback table
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workflow_id uuid NULL REFERENCES public.workflows(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message text,
  submitted_at timestamptz NOT NULL DEFAULT NOW(),
  status text NOT NULL DEFAULT 'new'
);

-- Enable row-level security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Ensure idempotency for feedback RLS policies
DROP POLICY IF EXISTS "Users can insert feedback" ON public.feedback;
CREATE POLICY "Users can insert feedback" ON public.feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own feedback status" ON public.feedback;
CREATE POLICY "Users can update own feedback status" ON public.feedback
  FOR UPDATE USING (auth.uid() = user_id);

COMMIT;
