-- Migration: Create avatars table for persona-driven journey system
-- Date: 2025-11-03
-- Description: Stores user persona (gender, goal, diet, frequency, experience) for personalized journey generation

-- Create avatars table
CREATE TABLE IF NOT EXISTS public.avatars (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  goal text NOT NULL CHECK (goal IN ('loss', 'bulk', 'recomp', 'cut')),
  diet text NOT NULL CHECK (diet IN ('vegan', 'keto', 'balanced', 'vegetarian', 'paleo')),
  frequency text NOT NULL CHECK (frequency IN ('low', 'medium', 'high')),
  experience text NOT NULL CHECK (experience IN ('beginner', 'intermediate', 'advanced', 'knowledge')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index on user_id (already covered by PRIMARY KEY, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_avatars_user_id ON public.avatars(user_id);

-- Create trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_avatars_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_avatars_updated_at ON public.avatars;
CREATE TRIGGER trigger_update_avatars_updated_at
  BEFORE UPDATE ON public.avatars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_avatars_updated_at();

-- Enable Row Level Security
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own avatar
DROP POLICY IF EXISTS "Users can read own avatar" ON public.avatars;
CREATE POLICY "Users can read own avatar"
  ON public.avatars
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own avatar
DROP POLICY IF EXISTS "Users can insert own avatar" ON public.avatars;
CREATE POLICY "Users can insert own avatar"
  ON public.avatars
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own avatar
DROP POLICY IF EXISTS "Users can update own avatar" ON public.avatars;
CREATE POLICY "Users can update own avatar"
  ON public.avatars
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.avatars TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add comment to table
COMMENT ON TABLE public.avatars IS 'User persona data for personalized journey generation. Falls back to profile metadata if row missing.';

-- Reload schema cache (for PostgREST)
-- Note: In Supabase cloud, this happens automatically
-- For local dev, you may need to restart PostgREST or use:
-- NOTIFY pgrst, 'reload schema';
