-- ============================================================================
-- User Context for AI Coach
-- ============================================================================
-- Creates weigh_ins table and fn_user_context function for AI coach data
-- Idempotent migration for production safety

-- ----------------------------------------------------------------------------
-- 1. Create weigh_ins table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.weigh_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_weigh_ins_user_id ON public.weigh_ins (user_id);
CREATE INDEX IF NOT EXISTS idx_weigh_ins_date ON public.weigh_ins (date);
CREATE INDEX IF NOT EXISTS idx_weigh_ins_user_date ON public.weigh_ins (user_id, date DESC);

-- Create unique constraint (one weigh-in per user per day)
CREATE UNIQUE INDEX IF NOT EXISTS idx_weigh_ins_user_date_unique ON public.weigh_ins (user_id, date);

-- Enable Row Level Security
ALTER TABLE public.weigh_ins ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own weigh-ins" ON public.weigh_ins;
CREATE POLICY "Users can view own weigh-ins"
  ON public.weigh_ins
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own weigh-ins" ON public.weigh_ins;
CREATE POLICY "Users can insert own weigh-ins"
  ON public.weigh_ins
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own weigh-ins" ON public.weigh_ins;
CREATE POLICY "Users can update own weigh-ins"
  ON public.weigh_ins
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own weigh-ins" ON public.weigh_ins;
CREATE POLICY "Users can delete own weigh-ins"
  ON public.weigh_ins
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_weigh_ins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update the updated_at column
DROP TRIGGER IF EXISTS update_weigh_ins_updated_at_trigger ON public.weigh_ins;
CREATE TRIGGER update_weigh_ins_updated_at_trigger
  BEFORE UPDATE ON public.weigh_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_weigh_ins_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weigh_ins TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. Enhance profiles table with nutrition/fitness fields
-- ----------------------------------------------------------------------------

-- Add columns if they don't exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age integer CHECK (age >= 13 AND age <= 120),
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female')),
  ADD COLUMN IF NOT EXISTS height_cm numeric(5,2) CHECK (height_cm >= 100 AND height_cm <= 250),
  ADD COLUMN IF NOT EXISTS weight_kg numeric(5,2) CHECK (weight_kg >= 30 AND weight_kg <= 300),
  ADD COLUMN IF NOT EXISTS target_weight_kg numeric(5,2) CHECK (target_weight_kg >= 30 AND target_weight_kg <= 300),
  ADD COLUMN IF NOT EXISTS goal text CHECK (goal IN ('gain', 'loss', 'maintain')),
  ADD COLUMN IF NOT EXISTS diet text CHECK (diet IN ('regular', 'vegan', 'vegetarian', 'keto', 'paleo')),
  ADD COLUMN IF NOT EXISTS activity_level text CHECK (activity_level IN ('low', 'moderate', 'high')),
  ADD COLUMN IF NOT EXISTS workout_days_per_week integer CHECK (workout_days_per_week >= 0 AND workout_days_per_week <= 7),
  ADD COLUMN IF NOT EXISTS injuries text;

-- ----------------------------------------------------------------------------
-- 3. Create fn_user_context function for data rollups
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_user_context(
  p_user_id uuid,
  p_since date DEFAULT NULL,
  p_until date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER -- Uses RLS, no privilege escalation
AS $$
DECLARE
  v_context jsonb;
  v_profile jsonb;
  v_nutrition jsonb;
  v_recent_meals jsonb;
  v_weigh_ins jsonb;
  v_since date;
  v_until date;
BEGIN
  -- Enforce RLS: only allow querying own data
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot query other users data';
  END IF;

  -- Set date range defaults
  v_since := COALESCE(p_since, CURRENT_DATE - INTERVAL '30 days');
  v_until := COALESCE(p_until, CURRENT_DATE);

  -- 1) Get profile data
  SELECT jsonb_build_object(
    'age', p.age,
    'gender', p.gender,
    'height_cm', p.height_cm,
    'weight_kg', p.weight_kg,
    'target_weight_kg', p.target_weight_kg,
    'goal', p.goal,
    'diet', p.diet,
    'activity_level', p.activity_level,
    'workout_days_per_week', p.workout_days_per_week,
    'injuries', p.injuries
  )
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = p_user_id;

  -- 2) Get nutrition aggregates
  WITH daily_totals AS (
    SELECT
      date,
      SUM(calories) as total_calories,
      SUM(protein) as total_protein,
      SUM(carbs) as total_carbs,
      SUM(fat) as total_fat,
      COUNT(*) as meal_count
    FROM public.meals
    WHERE user_id = p_user_id
      AND date >= v_since
      AND date <= v_until
    GROUP BY date
    ORDER BY date DESC
  ),
  period_averages AS (
    SELECT
      AVG(CASE WHEN date >= CURRENT_DATE - 6 THEN total_calories END) as avg_7d_calories,
      AVG(CASE WHEN date >= CURRENT_DATE - 6 THEN total_protein END) as avg_7d_protein,
      AVG(CASE WHEN date >= CURRENT_DATE - 13 THEN total_calories END) as avg_14d_calories,
      AVG(CASE WHEN date >= CURRENT_DATE - 13 THEN total_protein END) as avg_14d_protein,
      AVG(total_calories) as avg_30d_calories,
      AVG(total_protein) as avg_30d_protein
    FROM daily_totals
  )
  SELECT jsonb_build_object(
    'daily_totals', COALESCE(jsonb_agg(
      jsonb_build_object(
        'date', dt.date,
        'calories', dt.total_calories,
        'protein', dt.total_protein,
        'carbs', dt.total_carbs,
        'fat', dt.total_fat,
        'meal_count', dt.meal_count
      )
    ), '[]'::jsonb),
    'averages', jsonb_build_object(
      '7d', jsonb_build_object(
        'calories', ROUND(pa.avg_7d_calories::numeric, 0),
        'protein', ROUND(pa.avg_7d_protein::numeric, 0)
      ),
      '14d', jsonb_build_object(
        'calories', ROUND(pa.avg_14d_calories::numeric, 0),
        'protein', ROUND(pa.avg_14d_protein::numeric, 0)
      ),
      '30d', jsonb_build_object(
        'calories', ROUND(pa.avg_30d_calories::numeric, 0),
        'protein', ROUND(pa.avg_30d_protein::numeric, 0)
      )
    )
  )
  INTO v_nutrition
  FROM daily_totals dt
  CROSS JOIN period_averages pa;

  -- 3) Get recent meals (last 5)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', m.name,
      'date', m.date,
      'calories', m.calories,
      'protein', m.protein,
      'carbs', m.carbs,
      'fat', m.fat,
      'created_at', m.created_at
    )
  ), '[]'::jsonb)
  INTO v_recent_meals
  FROM (
    SELECT name, date, calories, protein, carbs, fat, created_at
    FROM public.meals
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 5
  ) m;

  -- 4) Get weigh-ins (last 12 entries)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'date', w.date,
      'weight_kg', w.weight_kg,
      'notes', w.notes
    )
  ), '[]'::jsonb)
  INTO v_weigh_ins
  FROM (
    SELECT date, weight_kg, notes
    FROM public.weigh_ins
    WHERE user_id = p_user_id
    ORDER BY date DESC
    LIMIT 12
  ) w;

  -- 5) Build final context JSON
  v_context := jsonb_build_object(
    'user_id', p_user_id,
    'date_range', jsonb_build_object(
      'since', v_since,
      'until', v_until
    ),
    'profile', COALESCE(v_profile, '{}'::jsonb),
    'nutrition', COALESCE(v_nutrition, '{}'::jsonb),
    'recent_meals', v_recent_meals,
    'weigh_ins', v_weigh_ins
  );

  RETURN v_context;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.fn_user_context(uuid, date, date) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.fn_user_context IS
  'Returns user context for AI coach: profile, nutrition aggregates, recent meals, and weigh-ins. Uses RLS for security.';
