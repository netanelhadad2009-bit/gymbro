-- ============================================================================
-- Exercise Library Tables, Functions, and RLS Policies
-- ============================================================================
-- This migration creates all tables needed for the exercise library feature
-- including profiles table (if missing), exercise catalog, tags, and RLS

-- ----------------------------------------------------------------------------
-- 1. Ensure profiles table exists
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add is_admin column if profiles already exists but column is missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- ----------------------------------------------------------------------------
-- 2. Create exercise library tables
-- ----------------------------------------------------------------------------

-- Master exercise catalog
CREATE TABLE IF NOT EXISTS public.exercise_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  name_he text NOT NULL,
  description_he text,
  primary_muscle text,
  secondary_muscles text[] DEFAULT '{}',
  equipment text,
  difficulty text CHECK (difficulty IN ('beginner','intermediate','advanced')) DEFAULT 'beginner',
  sets_default int,
  reps_default text,
  tempo_default text,
  rest_seconds_default int,
  video_url text,
  thumb_url text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Exercise tags
CREATE TABLE IF NOT EXISTS public.exercise_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_he text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Many-to-many exercise <-> tags
CREATE TABLE IF NOT EXISTS public.exercise_library_tags (
  exercise_id uuid REFERENCES public.exercise_library(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES public.exercise_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (exercise_id, tag_id)
);

-- Add exercise_id reference to workout_exercises if that table exists
-- (This allows linking workout exercises to the catalog)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_exercises') THEN
    ALTER TABLE public.workout_exercises
      ADD COLUMN IF NOT EXISTS exercise_id uuid REFERENCES public.exercise_library(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Create indexes for performance
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_exercise_library_slug
  ON public.exercise_library(slug);

CREATE INDEX IF NOT EXISTS idx_exercise_library_primary_muscle
  ON public.exercise_library(primary_muscle);

CREATE INDEX IF NOT EXISTS idx_exercise_library_difficulty
  ON public.exercise_library(difficulty);

CREATE INDEX IF NOT EXISTS idx_exercise_library_is_active
  ON public.exercise_library(is_active);

CREATE INDEX IF NOT EXISTS idx_exercise_library_created_at
  ON public.exercise_library(created_at DESC);

-- Index on workout_exercises if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_exercises') THEN
    CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id
      ON public.workout_exercises(exercise_id);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Function to auto-generate slug from Hebrew name
-- ----------------------------------------------------------------------------
-- Note: Using [:space:] instead of \s to avoid regex escape errors

CREATE OR REPLACE FUNCTION public.generate_exercise_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(
      REPLACE(
        REGEXP_REPLACE(
          COALESCE(NEW.name_he, ''),
          '[^א-ת0-9a-zA-Z[:space:]]',
          '',
          'g'
        ),
        ' ',
        '-'
      )
    ) || '-' || LEFT(gen_random_uuid()::text, 8);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate slug on insert
DROP TRIGGER IF EXISTS exercise_library_generate_slug ON public.exercise_library;
CREATE TRIGGER exercise_library_generate_slug
  BEFORE INSERT ON public.exercise_library
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_exercise_slug();

-- ----------------------------------------------------------------------------
-- 5. Function to update updated_at timestamp
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_exercise_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update timestamp on update
DROP TRIGGER IF EXISTS exercise_library_update_timestamp ON public.exercise_library;
CREATE TRIGGER exercise_library_update_timestamp
  BEFORE UPDATE ON public.exercise_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_exercise_updated_at();

-- ----------------------------------------------------------------------------
-- 6. Enable Row Level Security
-- ----------------------------------------------------------------------------

ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_library_tags ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 7. RLS Policies
-- ----------------------------------------------------------------------------

-- Exercise Library: Read for all authenticated users
DROP POLICY IF EXISTS "exercise_library_read" ON public.exercise_library;
CREATE POLICY "exercise_library_read"
  ON public.exercise_library
  FOR SELECT
  TO authenticated
  USING (true);

-- Exercise Library: Write only for admins
DROP POLICY IF EXISTS "exercise_library_write_admin" ON public.exercise_library;
CREATE POLICY "exercise_library_write_admin"
  ON public.exercise_library
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Exercise Tags: Read for all authenticated users
DROP POLICY IF EXISTS "exercise_tags_read" ON public.exercise_tags;
CREATE POLICY "exercise_tags_read"
  ON public.exercise_tags
  FOR SELECT
  TO authenticated
  USING (true);

-- Exercise Tags: Write only for admins
DROP POLICY IF EXISTS "exercise_tags_write_admin" ON public.exercise_tags;
CREATE POLICY "exercise_tags_write_admin"
  ON public.exercise_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Exercise Library Tags: Read for all authenticated users
DROP POLICY IF EXISTS "exercise_library_tags_read" ON public.exercise_library_tags;
CREATE POLICY "exercise_library_tags_read"
  ON public.exercise_library_tags
  FOR SELECT
  TO authenticated
  USING (true);

-- Exercise Library Tags: Write only for admins
DROP POLICY IF EXISTS "exercise_library_tags_write_admin" ON public.exercise_library_tags;
CREATE POLICY "exercise_library_tags_write_admin"
  ON public.exercise_library_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- ----------------------------------------------------------------------------
-- 8. Grant permissions
-- ----------------------------------------------------------------------------

GRANT SELECT ON public.exercise_library TO authenticated;
GRANT SELECT ON public.exercise_tags TO authenticated;
GRANT SELECT ON public.exercise_library_tags TO authenticated;

-- ============================================================================
-- End of migration
-- ============================================================================
