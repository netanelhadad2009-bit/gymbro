-- Diagnostic SQL for nutrition plan debugging
-- User ID from Xcode logs: 16e075a7-08aa-4d75-806c-8b5ac36b867b
-- Fingerprint: 00ff1bu6

-- 1. Check if user exists and their nutrition status
SELECT
  id,
  email,
  created_at,
  nutrition_status,
  nutrition_fingerprint,
  nutrition_calories,
  jsonb_typeof(nutrition_plan) AS plan_type,
  nutrition_updated_at,
  CASE
    WHEN nutrition_plan IS NULL THEN 'NULL'
    WHEN jsonb_typeof(nutrition_plan) = 'object' THEN 'HAS_PLAN'
    ELSE 'INVALID'
  END AS plan_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.id = '16e075a7-08aa-4d75-806c-8b5ac36b867b';

-- 2. Check if profile exists at all
SELECT
  id,
  nutrition_status,
  nutrition_fingerprint,
  nutrition_calories,
  jsonb_typeof(nutrition_plan) AS plan_type,
  nutrition_updated_at,
  created_at,
  updated_at
FROM public.profiles
WHERE id = '16e075a7-08aa-4d75-806c-8b5ac36b867b';

-- 3. If plan exists, check its structure
SELECT
  id,
  nutrition_plan -> 'days' AS days,
  nutrition_plan -> 'dailyTargets' AS daily_targets,
  jsonb_array_length(nutrition_plan -> 'days') AS num_days
FROM public.profiles
WHERE id = '16e075a7-08aa-4d75-806c-8b5ac36b867b'
  AND nutrition_plan IS NOT NULL;

-- 4. Check all profiles with pending status (context)
SELECT
  id,
  nutrition_status,
  nutrition_fingerprint,
  nutrition_updated_at,
  created_at
FROM public.profiles
WHERE nutrition_status = 'pending'
ORDER BY nutrition_updated_at DESC
LIMIT 10;
