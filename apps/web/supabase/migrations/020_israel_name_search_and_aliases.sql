-- Israeli MoH Name Search and Community Barcode Aliasing
-- Migration: 020
-- Creates israel_moh_foods table and barcode_aliases for community mapping

-- Israel MoH foods table (enhanced with search capabilities)
CREATE TABLE IF NOT EXISTS public.israel_moh_foods (
  id bigserial PRIMARY KEY,
  name_he text NOT NULL,
  name_en text,
  brand text,
  category text,
  calories_per_100g numeric,
  protein_g_per_100g numeric,
  carbs_g_per_100g numeric,
  fat_g_per_100g numeric,
  sugars_g_per_100g numeric,
  sodium_mg_per_100g numeric,
  fiber_g_per_100g numeric,
  is_partial boolean NOT NULL DEFAULT false,
  dataset_version text,
  src_row jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Full-text search index on Hebrew name (simple config handles Hebrew well)
CREATE INDEX IF NOT EXISTS idx_israel_moh_foods_name_he_fts
  ON public.israel_moh_foods
  USING gin (to_tsvector('simple', coalesce(name_he,'')));

-- Index on brand for filtering
CREATE INDEX IF NOT EXISTS idx_israel_moh_foods_brand
  ON public.israel_moh_foods(brand);

-- Index on name_he for LIKE queries (fallback)
CREATE INDEX IF NOT EXISTS idx_israel_moh_foods_name_he_trgm
  ON public.israel_moh_foods
  USING gin (name_he gin_trgm_ops);

-- Enable RLS
ALTER TABLE public.israel_moh_foods ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if present
DROP POLICY IF EXISTS p_israel_moh_foods_read ON public.israel_moh_foods;

-- Allow all authenticated users to read
CREATE POLICY p_israel_moh_foods_read ON public.israel_moh_foods
  FOR SELECT TO authenticated USING (true);

-- Community barcode aliases table
-- Links user-contributed barcodes to MoH food items
CREATE TABLE IF NOT EXISTS public.barcode_aliases (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barcode text NOT NULL CHECK (barcode ~ '^[0-9]{8,14}$'),
  moh_food_id bigint NOT NULL REFERENCES public.israel_moh_foods(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (barcode)  -- One canonical mapping per barcode (first mapper wins)
);

-- Index for fast barcode lookups
CREATE INDEX IF NOT EXISTS idx_barcode_aliases_barcode
  ON public.barcode_aliases (barcode);

-- Index for user's contributions
CREATE INDEX IF NOT EXISTS idx_barcode_aliases_user
  ON public.barcode_aliases (user_id);

-- Index on moh_food_id for joins
CREATE INDEX IF NOT EXISTS idx_barcode_aliases_moh_food
  ON public.barcode_aliases (moh_food_id);

-- Enable RLS
ALTER TABLE public.barcode_aliases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if present
DROP POLICY IF EXISTS p_barcode_aliases_select ON public.barcode_aliases;
DROP POLICY IF EXISTS p_barcode_aliases_insert ON public.barcode_aliases;

-- Allow all authenticated users to read aliases (public good)
CREATE POLICY p_barcode_aliases_select ON public.barcode_aliases
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to create aliases (verified as their own user_id in API)
CREATE POLICY p_barcode_aliases_insert ON public.barcode_aliases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Comment documentation
COMMENT ON TABLE public.israel_moh_foods IS 'Israeli Ministry of Health nutrition database - manually imported from data.gov.il CSV';
COMMENT ON TABLE public.barcode_aliases IS 'Community-contributed barcode mappings to Israeli MoH foods';
COMMENT ON COLUMN public.barcode_aliases.barcode IS 'EAN-8/13 or UPC barcode (8-14 digits)';
COMMENT ON COLUMN public.barcode_aliases.moh_food_id IS 'Foreign key to israel_moh_foods.id';
