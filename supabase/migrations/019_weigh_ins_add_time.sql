-- Migration: Change weigh_ins date column to timestamptz to include time
-- This allows users to track multiple weigh-ins per day with different times

-- Drop the existing unique constraint
DROP INDEX IF EXISTS idx_weigh_ins_user_date_unique;

-- Change the column type from date to timestamptz
ALTER TABLE public.weigh_ins
  ALTER COLUMN date TYPE timestamptz USING date::timestamptz;

-- Update the default value to include time
ALTER TABLE public.weigh_ins
  ALTER COLUMN date SET DEFAULT NOW();

-- Recreate the unique index (now includes time, so multiple entries per day are allowed)
-- Note: We keep the index for performance, but it's no longer UNIQUE
CREATE INDEX IF NOT EXISTS idx_weigh_ins_user_date ON public.weigh_ins (user_id, date DESC);
