-- Migration: Add israel_moh_foods table for Israeli nutrition data
-- Created: 2025-11-09
-- Purpose: Mirror Israeli Ministry of Health nutrition dataset for fast barcode lookups

-- Create Israel MoH mirror table for fast lookups
CREATE TABLE IF NOT EXISTS public.israel_moh_foods (
  barcode text PRIMARY KEY,
  name_he text,
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
  src_row jsonb,  -- Original row for debugging
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_israel_moh_foods_brand ON public.israel_moh_foods(brand);
CREATE INDEX IF NOT EXISTS idx_israel_moh_foods_name_he ON public.israel_moh_foods(name_he);
CREATE INDEX IF NOT EXISTS idx_israel_moh_foods_category ON public.israel_moh_foods(category);
CREATE INDEX IF NOT EXISTS idx_israel_moh_foods_updated ON public.israel_moh_foods(updated_at DESC);

-- Enable RLS (read-only for authenticated users)
ALTER TABLE public.israel_moh_foods ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS p_israel_moh_foods_read ON public.israel_moh_foods;

-- RLS Policy: authenticated users can read
CREATE POLICY p_israel_moh_foods_read
  ON public.israel_moh_foods FOR SELECT
  TO authenticated
  USING (true);

-- Comments on table and columns
COMMENT ON TABLE public.israel_moh_foods IS 'Israeli Ministry of Health nutrition data mirror for fast barcode lookups (729 prefix)';
COMMENT ON COLUMN public.israel_moh_foods.barcode IS 'Product barcode (EAN-13, typically 729 prefix for Israeli products)';
COMMENT ON COLUMN public.israel_moh_foods.is_partial IS 'True if some nutrition fields are missing';
COMMENT ON COLUMN public.israel_moh_foods.src_row IS 'Original raw data row from data.gov.il for debugging';
COMMENT ON COLUMN public.israel_moh_foods.dataset_version IS 'Version or timestamp of dataset refresh';
