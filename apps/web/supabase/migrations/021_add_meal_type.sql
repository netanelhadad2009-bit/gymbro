-- Add meal_type column to meals table
ALTER TABLE public.meals
ADD COLUMN meal_type text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')) DEFAULT 'snack';

-- Create index for meal_type for better query performance
CREATE INDEX IF NOT EXISTS idx_meals_meal_type ON public.meals (meal_type);

-- Update the source constraint to include new source types
ALTER TABLE public.meals
DROP CONSTRAINT IF EXISTS meals_source_check;

ALTER TABLE public.meals
ADD CONSTRAINT meals_source_check
CHECK (source IN ('manual', 'ai_vision', 'israel_moh', 'saved_meal'));
