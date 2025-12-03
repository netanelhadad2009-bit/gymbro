-- Add portion_grams column to meals table for portion-based tracking
ALTER TABLE public.meals
ADD COLUMN IF NOT EXISTS portion_grams integer CHECK (portion_grams > 0);

-- Add brand column if not exists (for display purposes)
ALTER TABLE public.meals
ADD COLUMN IF NOT EXISTS brand text;
