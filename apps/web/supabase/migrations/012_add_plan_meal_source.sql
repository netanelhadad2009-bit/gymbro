-- Add 'plan' as a valid source type for meals
-- This allows tracking meals that were marked as eaten from the nutrition plan

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
CREATE INDEX IF NOT EXISTS idx_meals_plan_meal_id ON public.meals (user_id, plan_meal_id, date)
WHERE plan_meal_id IS NOT NULL;
