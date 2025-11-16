-- COMPLETE SUPABASE SETUP SQL
-- Copy and paste this entire file into your Supabase SQL Editor
-- Dashboard -> SQL Editor -> New Query

-- 1. ALTER PROGRAMS TABLE (add new columns)
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

-- 2. CREATE WORKOUTS TABLE
CREATE TABLE IF NOT EXISTS public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id text NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  day_number int NOT NULL CHECK (day_number > 0),
  title text NOT NULL,
  notes text DEFAULT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workouts_program_day
  ON public.workouts(program_id, day_number);

CREATE INDEX IF NOT EXISTS idx_workouts_program_id ON public.workouts(program_id);
CREATE INDEX IF NOT EXISTS idx_workouts_completed ON public.workouts(program_id, completed);

-- 3. CREATE WORKOUT EXERCISES TABLE
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_workout_order
  ON public.workout_exercises(workout_id, order_index);

CREATE INDEX IF NOT EXISTS idx_exercises_workout_id ON public.workout_exercises(workout_id);

-- 4. CREATE NUTRITION PLANS TABLE
CREATE TABLE IF NOT EXISTS public.nutrition_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id text NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nutrition_program_id
  ON public.nutrition_plans(program_id);

-- 5. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;

-- 6. CREATE RLS POLICIES (WITH TEXT CASTING FIX)

-- PROGRAMS POLICIES
DROP POLICY IF EXISTS "programs_read_write_own" ON public.programs;
CREATE POLICY "programs_read_write_own"
  ON public.programs
  FOR ALL
  TO authenticated
  USING (auth.uid()::TEXT = user_id)
  WITH CHECK (auth.uid()::TEXT = user_id);

-- WORKOUTS POLICIES
DROP POLICY IF EXISTS "workouts_read_write_via_program" ON public.workouts;
CREATE POLICY "workouts_read_write_via_program"
  ON public.workouts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = workouts.program_id
        AND p.user_id = auth.uid()::TEXT
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = workouts.program_id
        AND p.user_id = auth.uid()::TEXT
    )
  );

-- WORKOUT EXERCISES POLICIES
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
        AND p.user_id = auth.uid()::TEXT
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workouts w
      JOIN public.programs p ON p.id = w.program_id
      WHERE w.id = workout_exercises.workout_id
        AND p.user_id = auth.uid()::TEXT
    )
  );

-- NUTRITION PLANS POLICIES
DROP POLICY IF EXISTS "nutrition_read_write_via_program" ON public.nutrition_plans;
CREATE POLICY "nutrition_read_write_via_program"
  ON public.nutrition_plans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = nutrition_plans.program_id
        AND p.user_id = auth.uid()::TEXT
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.programs p
      WHERE p.id = nutrition_plans.program_id
        AND p.user_id = auth.uid()::TEXT
    )
  );

-- 7. HELPER FUNCTIONS

-- Check if a program has been normalized (has workouts)
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

-- Get program statistics
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

-- DONE! You can now use the normalized program schema with proper RLS policies

-- ==============================================================================
-- MIGRATION 012: Add 'plan' meal source type for nutrition plan meals
-- ==============================================================================
-- This migration allows meals marked as eaten from the nutrition plan to be
-- saved to the database, so they appear in the graphs/progress page calorie count

-- Update the source check constraint to include 'plan'
ALTER TABLE IF EXISTS public.meals
DROP CONSTRAINT IF EXISTS meals_source_check;

ALTER TABLE IF EXISTS public.meals
ADD CONSTRAINT meals_source_check
CHECK (source IN ('manual', 'ai_vision', 'plan'));

-- Add optional plan_meal_id to track which plan meal this refers to
-- Format: "dayIndex_mealIndex" (e.g., "0_1" for Sunday, second meal)
ALTER TABLE IF EXISTS public.meals
ADD COLUMN IF NOT EXISTS plan_meal_id text;

-- Create index for plan meal lookups
CREATE INDEX IF NOT EXISTS idx_meals_plan_meal_id ON public.meals (user_id, plan_meal_id, date)
WHERE plan_meal_id IS NOT NULL;

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Migration 012 applied: plan meals can now be saved to database';
END $$;

-- ==============================================================================
-- MIGRATION 021: Add meal_type column for categorizing meals
-- ==============================================================================
-- This migration adds a meal_type column to categorize meals by time of day
-- (breakfast, lunch, dinner, snack) for better organization and tracking

-- Add meal_type column to meals table
ALTER TABLE public.meals
ADD COLUMN IF NOT EXISTS meal_type text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')) DEFAULT 'snack';

-- Create index for meal_type for better query performance
CREATE INDEX IF NOT EXISTS idx_meals_meal_type ON public.meals (meal_type);

-- Update the source constraint to include new source types
ALTER TABLE public.meals
DROP CONSTRAINT IF EXISTS meals_source_check;

ALTER TABLE public.meals
ADD CONSTRAINT meals_source_check
CHECK (source IN ('manual', 'ai_vision', 'plan', 'israel_moh', 'saved_meal'));

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Migration 021 applied: meal_type column added and source constraint updated';
END $$;
