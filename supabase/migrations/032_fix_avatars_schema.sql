-- Fix avatars table schema
-- This script drops the old avatars table (if it has wrong schema) and recreates it with individual columns
-- Date: 2025-11-03
-- Issue: PGRST204 - table has 'persona' JSONB column instead of individual columns

-- Drop existing avatars table if it exists (preserves data by backing up first)
-- WARNING: This will delete existing avatar data. Backup first if needed.
DO $$
BEGIN
  -- Drop the table if it exists
  DROP TABLE IF EXISTS public.avatars CASCADE;
  RAISE NOTICE 'Dropped existing avatars table';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'No existing avatars table to drop';
END $$;

-- Create avatars table with individual columns (NOT JSONB persona)
CREATE TABLE public.avatars (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  goal text NOT NULL CHECK (goal IN ('loss', 'bulk', 'recomp', 'cut')),
  diet text NOT NULL CHECK (diet IN ('vegan', 'keto', 'balanced', 'vegetarian', 'paleo', 'none')),
  frequency text NOT NULL CHECK (frequency IN ('low', 'medium', 'high')),
  experience text NOT NULL CHECK (experience IN ('beginner', 'intermediate', 'advanced', 'knowledge', 'time')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index on user_id (covered by PRIMARY KEY but explicit for clarity)
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
COMMENT ON TABLE public.avatars IS 'User persona data for personalized journey generation. Uses individual columns (not JSONB).';

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Verify table was created
DO $$
DECLARE
  column_count integer;
BEGIN
  SELECT COUNT(*)
  INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'avatars'
    AND column_name IN ('user_id', 'gender', 'goal', 'diet', 'frequency', 'experience');

  IF column_count = 6 THEN
    RAISE NOTICE 'SUCCESS: avatars table created with 6 required columns';
  ELSE
    RAISE WARNING 'ISSUE: avatars table has % columns (expected 6)', column_count;
  END IF;
END $$;
