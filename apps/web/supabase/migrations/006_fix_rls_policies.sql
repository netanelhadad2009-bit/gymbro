-- =====================================================
-- FIX RLS POLICIES FOR TEXT user_id
-- =====================================================
-- The programs table uses TEXT for user_id, but auth.uid() returns UUID
-- We need to cast auth.uid() to TEXT for comparison

-- =====================================================
-- PROGRAMS POLICIES (owner-only access) - FIXED
-- =====================================================
DROP POLICY IF EXISTS "programs_read_write_own" ON public.programs;
CREATE POLICY "programs_read_write_own"
  ON public.programs
  FOR ALL
  TO authenticated
  USING (auth.uid()::TEXT = user_id)
  WITH CHECK (auth.uid()::TEXT = user_id);

-- =====================================================
-- WORKOUTS POLICIES (access via program ownership) - FIXED
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

-- =====================================================
-- WORKOUT EXERCISES POLICIES (access via workout -> program) - FIXED
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

-- =====================================================
-- NUTRITION PLANS POLICIES (access via program ownership) - FIXED
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
