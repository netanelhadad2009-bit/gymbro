-- Verify nutrition plan for user from latest signup
-- User ID: 80e4de32-aa9a-4a3d-aaab-acd3b72f6380

SELECT
  id,
  nutrition_status,
  nutrition_fingerprint,
  nutrition_calories,
  jsonb_typeof(nutrition_plan) AS plan_type,
  jsonb_array_length(nutrition_plan -> 'days') AS num_days,
  (nutrition_plan -> 'dailyTargets' ->> 'calories')::int AS target_calories,
  (nutrition_plan -> 'dailyTargets' ->> 'protein')::int AS target_protein,
  nutrition_updated_at,
  created_at
FROM public.profiles
WHERE id = '80e4de32-aa9a-4a3d-aaab-acd3b72f6380';

-- Expected Result:
-- nutrition_status: ready
-- plan_type: object
-- nutrition_calories: 2500 (or similar)
-- num_days: 1
-- target_calories: ~2500
-- target_protein: ~150-200g

-- If this returns a row with nutrition_status='ready', the plan was created successfully!
-- User should be able to see it on the Nutrition tab.

-- To verify the plan structure:
SELECT
  jsonb_pretty(nutrition_plan)
FROM public.profiles
WHERE id = '80e4de32-aa9a-4a3d-aaab-acd3b72f6380';
