-- =====================================================
-- GYMBRO NORMALIZED PROGRAM SCHEMA MIGRATION
-- =====================================================
-- This migration creates a normalized relational schema for workout programs
-- replacing the single-row "blob" (workout_plan_text) approach
--
-- Tables:
--   - programs: Base program info (1 per user program)
--   - workouts: Training days (many per program)
--   - workout_exercises: Exercises in a workout (many per workout)
--   - nutrition_plans: Nutrition metadata (1:1 with program)

-- =====================================================
-- 1. BASE PROGRAM TABLE
-- =====================================================
-- Note: We're altering the existing programs table to add new columns
-- and keeping the old workout_plan_text and nutrition_plan_json for backfill

ALTER TABLE IF EXISTS public.programs
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS goal text CHECK (goal IN ('gain', 'loss', 'recomp')),
  ADD COLUMN IF NOT EXISTS start_date date;

-- Add updated_at if it doesn't exist
ALTER TABLE IF EXISTS public.programs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS programs_updated_at ON public.programs;
CREATE TRIGGER programs_updated_at
  BEFORE UPDATE ON public.programs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- 2. WORKOUTS TABLE (training days)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id text NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  day_number int NOT NULL CHECK (day_number > 0),
  title text NOT NULL,
  notes text DEFAULT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Unique constraint: one workout per day per program
CREATE UNIQUE INDEX IF NOT EXISTS idx_workouts_program_day
  ON public.workouts(program_id, day_number);

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_workouts_program_id ON public.workouts(program_id);
CREATE INDEX IF NOT EXISTS idx_workouts_completed ON public.workouts(program_id, completed);

COMMENT ON TABLE public.workouts IS 'Individual training days/sessions within a program';
COMMENT ON COLUMN public.workouts.day_number IS 'Day number in the program sequence (1, 2, 3...)';
COMMENT ON COLUMN public.workouts.completed IS 'Whether user has completed this workout';

-- =====================================================
-- 3. WORKOUT EXERCISES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  order_index int NOT NULL CHECK (order_index > 0),
  name text NOT NULL,
  sets int DEFAULT NULL CHECK (sets > 0),
  reps text DEFAULT NULL,
  rest_seconds int DEFAULT NULL CHECK (rest_seconds >= 0),
  tempo text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Unique constraint: ordered exercises within a workout
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_workout_order
  ON public.workout_exercises(workout_id, order_index);

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_exercises_workout_id ON public.workout_exercises(workout_id);

COMMENT ON TABLE public.workout_exercises IS 'Ordered list of exercises within a workout';
COMMENT ON COLUMN public.workout_exercises.order_index IS 'Position of exercise in the workout (1, 2, 3...)';
COMMENT ON COLUMN public.workout_exercises.reps IS 'Rep range as string (e.g. "10-12", "8-10")';
COMMENT ON COLUMN public.workout_exercises.tempo IS 'Optional tempo notation (e.g. "3-0-1-0")';

-- =====================================================
-- 4. NUTRITION PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.nutrition_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id text NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- One nutrition plan per program
CREATE UNIQUE INDEX IF NOT EXISTS idx_nutrition_program_id
  ON public.nutrition_plans(program_id);

COMMENT ON TABLE public.nutrition_plans IS 'Nutrition plan metadata associated with a program';
COMMENT ON COLUMN public.nutrition_plans.meta IS 'JSON metadata: {goal, start_date, days, calories, macros, etc}';

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROGRAMS POLICIES (owner-only access)
-- =====================================================
DROP POLICY IF EXISTS "programs_read_write_own" ON public.programs;
CREATE POLICY "programs_read_write_own"
  ON public.programs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- WORKOUTS POLICIES (access via program ownership)
-- =====================================================
DROP POLICY IF EXISTS "workouts_read_write_via_program" ON public.workouts;
CREATE POLICY "workouts_read_write_via_program"
  ON public.workouts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = workouts.program_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = workouts.program_id
        AND p.user_id = auth.uid()
    )
  );

-- =====================================================
-- WORKOUT EXERCISES POLICIES (access via workout -> program)
-- =====================================================
DROP POLICY IF EXISTS "exercises_read_write_via_program" ON public.workout_exercises;
CREATE POLICY "exercises_read_write_via_program"
  ON public.workout_exercises
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      JOIN public.programs p ON p.id = w.program_id
      WHERE w.id = workout_exercises.workout_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workouts w
      JOIN public.programs p ON p.id = w.program_id
      WHERE w.id = workout_exercises.workout_id
        AND p.user_id = auth.uid()
    )
  );

-- =====================================================
-- NUTRITION PLANS POLICIES (access via program ownership)
-- =====================================================
DROP POLICY IF EXISTS "nutrition_read_write_via_program" ON public.nutrition_plans;
CREATE POLICY "nutrition_read_write_via_program"
  ON public.nutrition_plans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = nutrition_plans.program_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = nutrition_plans.program_id
        AND p.user_id = auth.uid()
    )
  );

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to check if a program has been normalized (has workouts)
CREATE OR REPLACE FUNCTION public.is_program_normalized(p_program_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workouts
    WHERE program_id = p_program_id
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.is_program_normalized IS 'Check if a program has been migrated to normalized schema';

-- Function to get program stats
CREATE OR REPLACE FUNCTION public.get_program_stats(p_program_id text)
RETURNS TABLE (
  total_workouts int,
  completed_workouts int,
  progress_percent numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::int as total_workouts,
    COUNT(*) FILTER (WHERE completed = true)::int as completed_workouts,
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE completed = true)::numeric / COUNT(*)::numeric) * 100, 2)
    END as progress_percent
  FROM public.workouts
  WHERE program_id = p_program_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_program_stats IS 'Get workout completion statistics for a program';
