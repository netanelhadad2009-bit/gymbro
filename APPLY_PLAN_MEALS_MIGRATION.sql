-- ==============================================================================
-- MIGRATION: Add 'plan' meal source type for nutrition plan meals
-- ==============================================================================
--
-- PURPOSE: Allow meals marked as eaten from the nutrition plan to be saved
--          to the database, so they appear in graphs/progress page calorie count
--
-- HOW TO APPLY:
-- 1. Go to: https://supabase.com/dashboard/project/ivzltlqsjrikffssyvbr/sql/new
-- 2. Copy and paste this entire file
-- 3. Click "Run"
-- 4. You should see: "Success. No rows returned" with a notice message
--
-- ==============================================================================

-- Update the source check constraint to include 'plan'
ALTER TABLE public.meals
DROP CONSTRAINT IF EXISTS meals_source_check;

ALTER TABLE public.meals
ADD CONSTRAINT meals_source_check
CHECK (source IN ('manual', 'ai_vision', 'plan'));

-- Add optional plan_meal_id to track which plan meal this refers to
-- Format: "dayIndex_mealIndex" (e.g., "0_1" for Sunday, second meal)
ALTER TABLE public.meals
ADD COLUMN IF NOT EXISTS plan_meal_id text;

-- Create index for plan meal lookups
CREATE INDEX IF NOT EXISTS idx_meals_plan_meal_id
ON public.meals (user_id, plan_meal_id, date)
WHERE plan_meal_id IS NOT NULL;

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE '✅ Migration applied successfully: plan meals can now be saved to database';
END $$;

-- ==============================================================================
-- VERIFICATION QUERIES (optional - run these after migration to verify)
-- ==============================================================================

-- Check that plan_meal_id column exists:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'meals'
--   AND column_name = 'plan_meal_id';

-- Check that 'plan' is now a valid source:
-- SELECT pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.meals'::regclass
--   AND conname = 'meals_source_check';
