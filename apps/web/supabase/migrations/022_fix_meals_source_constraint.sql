-- Fix meals source constraint to include all valid sources
-- Migration 021 accidentally removed 'plan' which was added in 012

ALTER TABLE public.meals
DROP CONSTRAINT IF EXISTS meals_source_check;

ALTER TABLE public.meals
ADD CONSTRAINT meals_source_check
CHECK (source IN ('manual', 'ai_vision', 'israel_moh', 'saved_meal', 'plan'));
