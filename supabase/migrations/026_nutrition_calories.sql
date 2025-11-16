-- Migration: Add nutrition_calories + safety checks (idempotent)
-- This migration ensures all nutrition-related columns exist and are properly configured

-- 1) Add nutrition_calories column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='nutrition_calories'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN nutrition_calories INTEGER;
  END IF;
END $$;

-- 2) Ensure other nutrition columns exist (no-op if already added)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='nutrition_plan') THEN
    ALTER TABLE public.profiles ADD COLUMN nutrition_plan JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='nutrition_fingerprint') THEN
    ALTER TABLE public.profiles ADD COLUMN nutrition_fingerprint TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='nutrition_status') THEN
    ALTER TABLE public.profiles ADD COLUMN nutrition_status TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='nutrition_updated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN nutrition_updated_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3) Check constraint (pending|ready)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='profiles_nutrition_status_check'
      AND conrelid='public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_nutrition_status_check
    CHECK (nutrition_status IN ('pending','ready'));
  END IF;
END $$;

-- 4) Helpful index for fingerprint
CREATE INDEX IF NOT EXISTS idx_profiles_nutrition_fingerprint
  ON public.profiles(nutrition_fingerprint);

-- 5) Light backfill:
-- status defaults: 'ready' if plan exists else 'pending'
UPDATE public.profiles
SET nutrition_status = CASE WHEN nutrition_plan IS NOT NULL THEN 'ready' ELSE 'pending' END
WHERE nutrition_status IS NULL;

-- updated_at defaults
UPDATE public.profiles
SET nutrition_updated_at = now()
WHERE nutrition_updated_at IS NULL;

-- calories backfill (best-effort) from JSON if key exists at root: plan.calories or plan.dailyTargets.calories
UPDATE public.profiles
SET nutrition_calories = COALESCE(
  (nutrition_plan #>> '{dailyTargets,calories}')::INT,
  (nutrition_plan ->> 'calories')::INT,
  (nutrition_plan #>> '{meta,calories}')::INT
)
WHERE nutrition_plan IS NOT NULL
  AND nutrition_calories IS NULL;

-- 6) RLS Policy for self-update (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_self_nutrition'
  ) THEN
    CREATE POLICY profiles_update_self_nutrition
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Notify cache reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
