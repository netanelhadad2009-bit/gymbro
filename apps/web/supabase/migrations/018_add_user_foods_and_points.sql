-- Migration: Add user_foods table and points_events table
-- Created: 2025-01-09
-- Purpose: Allow users to manually add food products and track points/gamification

-- Create user_foods table for manually added products
CREATE TABLE IF NOT EXISTS public.user_foods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    barcode text,  -- nullable; manual items can lack barcode
    name_he text NOT NULL,
    brand text,
    serving_grams integer NOT NULL CHECK (serving_grams > 0),
    per_100g jsonb NOT NULL,  -- { kcal, protein_g, carbs_g, fat_g } as integers
    is_verified boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Create points_events table if not exists
CREATE TABLE IF NOT EXISTS public.points_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    points integer NOT NULL,
    reason text NOT NULL,
    meta_json jsonb,  -- optional metadata about the event
    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS on user_foods
ALTER TABLE public.user_foods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_foods
CREATE POLICY "Users can manage own foods" ON public.user_foods
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Enable RLS on points_events
ALTER TABLE public.points_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for points_events
CREATE POLICY "Users can view own points" ON public.points_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points" ON public.points_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_foods_user_barcode ON public.user_foods(user_id, barcode);
CREATE INDEX IF NOT EXISTS idx_user_foods_user_created ON public.user_foods(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_events_user_created ON public.points_events(user_id, created_at DESC);

-- Add source and is_partial columns to food_cache if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'food_cache' AND column_name = 'source') THEN
        ALTER TABLE public.food_cache ADD COLUMN source text DEFAULT 'openfoodfacts';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'food_cache' AND column_name = 'is_partial') THEN
        ALTER TABLE public.food_cache ADD COLUMN is_partial boolean DEFAULT false;
    END IF;
END $$;

-- Comment on tables
COMMENT ON TABLE public.user_foods IS 'User-created food products with nutrition data';
COMMENT ON TABLE public.points_events IS 'Gamification points awarded to users for various actions';
COMMENT ON COLUMN public.user_foods.per_100g IS 'Nutrition data per 100g: { kcal, protein_g, carbs_g, fat_g }';
COMMENT ON COLUMN public.user_foods.is_verified IS 'Whether this food has been verified by admin/community';
