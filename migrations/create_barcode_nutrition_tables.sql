-- Barcode Nutrition System Tables
-- Complete migration for food cache, favorites, and scan history
-- Updated: 2025-01-07

-- 1. Food Cache Table
CREATE TABLE IF NOT EXISTS public.food_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode text UNIQUE NOT NULL,
  name text NOT NULL,
  brand text,
  per100g jsonb NOT NULL, -- {kcal, protein_g, carbs_g, fat_g, fiber_g?, sugar_g?, sodium_mg?}
  image_url text,
  source text NOT NULL DEFAULT 'off', -- 'off'=OpenFoodFacts, 'manual'
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes for food_cache
CREATE INDEX IF NOT EXISTS idx_food_cache_barcode ON public.food_cache(barcode);
CREATE INDEX IF NOT EXISTS idx_food_cache_updated ON public.food_cache(updated_at DESC);

-- 2. Favorite Foods Table
CREATE TABLE IF NOT EXISTS public.favorite_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barcode text NOT NULL,
  note text,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, barcode)
);

-- 3. Scan History Table
CREATE TABLE IF NOT EXISTS public.scan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barcode text NOT NULL,
  product_name text,
  brand text,
  scanned_at timestamptz DEFAULT NOW()
);

-- Index for scan_history
CREATE INDEX IF NOT EXISTS idx_scan_history_user_date ON public.scan_history(user_id, scanned_at DESC);

-- Enable Row Level Security
ALTER TABLE public.food_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for food_cache (read-only for authenticated users)
CREATE POLICY "food_cache_select_authenticated"
  ON public.food_cache FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for favorite_foods (users can manage their own)
CREATE POLICY "favorite_foods_select_own"
  ON public.favorite_foods FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "favorite_foods_insert_own"
  ON public.favorite_foods FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorite_foods_update_own"
  ON public.favorite_foods FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorite_foods_delete_own"
  ON public.favorite_foods FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for scan_history (users can read and insert their own)
CREATE POLICY "scan_history_select_own"
  ON public.scan_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "scan_history_insert_own"
  ON public.scan_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE public.food_cache IS 'Cached nutrition data from OpenFoodFacts API with 24h TTL';
COMMENT ON TABLE public.favorite_foods IS 'User favorite foods for quick access';
COMMENT ON TABLE public.scan_history IS 'History of barcode scans per user';