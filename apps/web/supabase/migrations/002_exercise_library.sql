-- Exercise Library Tables and RLS Policies
-- No seed data - admin will add exercises via UI

-- Add admin flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Master exercise catalog
CREATE TABLE IF NOT EXISTS public.exercise_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  name_he text NOT NULL,
  description_he text,
  primary_muscle text,                 -- 'חזה','גב','רגליים','כתפיים','יד קדמית','יד אחורית','בטן','כללי'
  secondary_muscles text[] DEFAULT '{}',
  equipment text,                      -- 'משקולות','מוט','מכונה','משקל גוף'...
  difficulty text CHECK (difficulty IN ('beginner','intermediate','advanced')) DEFAULT 'beginner',
  sets_default int,
  reps_default text,                   -- "8-12"
  tempo_default text,
  rest_seconds_default int,
  video_url text,                      -- public URL (Supabase Storage or external)
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

-- Add exercise_id reference to workout_exercises (optional link to catalog)
ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS exercise_id uuid REFERENCES public.exercise_library(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercise_library_slug ON public.exercise_library(slug);
CREATE INDEX IF NOT EXISTS idx_exercise_library_primary_muscle ON public.exercise_library(primary_muscle);
CREATE INDEX IF NOT EXISTS idx_exercise_library_difficulty ON public.exercise_library(difficulty);
CREATE INDEX IF NOT EXISTS idx_exercise_library_is_active ON public.exercise_library(is_active);
CREATE INDEX IF NOT EXISTS idx_exercise_library_created_at ON public.exercise_library(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON public.workout_exercises(exercise_id);

-- Enable RLS
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_library_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Read for all authenticated, write only for admin

-- exercise_library policies
CREATE POLICY "exercise_library_read"
  ON public.exercise_library
  FOR SELECT
  TO authenticated
  USING (true);

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

-- exercise_tags policies
CREATE POLICY "exercise_tags_read"
  ON public.exercise_tags
  FOR SELECT
  TO authenticated
  USING (true);

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

-- exercise_library_tags policies
CREATE POLICY "exercise_library_tags_read"
  ON public.exercise_library_tags
  FOR SELECT
  TO authenticated
  USING (true);

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

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = user_id),
    false
  );
$$;

-- Function to auto-generate slug from Hebrew name
CREATE OR REPLACE FUNCTION public.generate_exercise_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(
      REPLACE(
        REGEXP_REPLACE(NEW.name_he, '[^א-ת0-9a-zA-Z\s]', '', 'g'),
        ' ',
        '-'
      )
    ) || '-' || LEFT(gen_random_uuid()::text, 8);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate slug
DROP TRIGGER IF EXISTS exercise_library_generate_slug ON public.exercise_library;
CREATE TRIGGER exercise_library_generate_slug
  BEFORE INSERT ON public.exercise_library
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_exercise_slug();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_exercise_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS exercise_library_update_timestamp ON public.exercise_library;
CREATE TRIGGER exercise_library_update_timestamp
  BEFORE UPDATE ON public.exercise_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_exercise_updated_at();

-- Grant permissions
GRANT SELECT ON public.exercise_library TO authenticated;
GRANT SELECT ON public.exercise_tags TO authenticated;
GRANT SELECT ON public.exercise_library_tags TO authenticated;
