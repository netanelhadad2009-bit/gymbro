-- ============================================================================
-- Fix fn_user_context GROUP BY error
-- ============================================================================
-- Fixes the SQL error where period_averages columns weren't properly aggregated
-- when used with jsonb_agg on daily_totals

-- Drop and recreate the function with the fix
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

  -- 2) Get nutrition aggregates (FIXED: split into two separate queries)
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
  ),
  daily_array AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'date', dt.date,
        'calories', dt.total_calories,
        'protein', dt.total_protein,
        'carbs', dt.total_carbs,
        'fat', dt.total_fat,
        'meal_count', dt.meal_count
      )
    ), '[]'::jsonb) as daily_json
    FROM daily_totals dt
  ),
  averages_obj AS (
    SELECT jsonb_build_object(
      '7d', jsonb_build_object(
        'calories', COALESCE(ROUND(pa.avg_7d_calories::numeric, 0), 0),
        'protein', COALESCE(ROUND(pa.avg_7d_protein::numeric, 0), 0)
      ),
      '14d', jsonb_build_object(
        'calories', COALESCE(ROUND(pa.avg_14d_calories::numeric, 0), 0),
        'protein', COALESCE(ROUND(pa.avg_14d_protein::numeric, 0), 0)
      ),
      '30d', jsonb_build_object(
        'calories', COALESCE(ROUND(pa.avg_30d_calories::numeric, 0), 0),
        'protein', COALESCE(ROUND(pa.avg_30d_protein::numeric, 0), 0)
      )
    ) as averages_json
    FROM period_averages pa
  )
  SELECT jsonb_build_object(
    'daily_totals', da.daily_json,
    'averages', ao.averages_json
  )
  INTO v_nutrition
  FROM daily_array da, averages_obj ao;

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

-- Update comment
COMMENT ON FUNCTION public.fn_user_context IS
  'Returns user context for AI coach: profile, nutrition aggregates, recent meals, and weigh-ins. Uses RLS for security. (Fixed GROUP BY error)';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
