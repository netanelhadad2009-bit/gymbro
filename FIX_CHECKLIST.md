# Nutrition Plan Fix - Action Checklist

Based on your screenshot showing "לא נמצאה תוכנית תזונה" (No nutrition plan found), here's exactly what you need to do:

## 🚨 Critical Issue Identified

The `/api/nutrition/plan` endpoint is returning **404 Not Found**, which means:
- Either the migration hasn't been applied (nutrition_calories column missing)
- OR no nutrition plan exists in your database for this user

## ✅ Step-by-Step Fix

### Step 1: Apply the Database Migration

**⚠️ THIS IS REQUIRED - The app won't work without this!**

You showed me the error, which means the migration hasn't been applied yet.

#### Option A: Via Supabase Studio (Recommended)

1. Open [Supabase Studio](https://app.supabase.com)
2. Go to **SQL Editor**
3. Click "New query"
4. **Copy this SQL** (I already sent it, but here it is again):

```sql
-- Migration: Add nutrition_calories + safety checks (idempotent)

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

-- 2) Ensure other nutrition columns exist
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

-- 3) Check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='profiles_nutrition_status_check' AND conrelid='public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_nutrition_status_check
    CHECK (nutrition_status IN ('pending','ready'));
  END IF;
END $$;

-- 4) Index for fingerprint
CREATE INDEX IF NOT EXISTS idx_profiles_nutrition_fingerprint
  ON public.profiles(nutrition_fingerprint);

-- 5) Backfill
UPDATE public.profiles
SET nutrition_status = CASE WHEN nutrition_plan IS NOT NULL THEN 'ready' ELSE 'pending' END
WHERE nutrition_status IS NULL;

UPDATE public.profiles
SET nutrition_updated_at = now()
WHERE nutrition_updated_at IS NULL;

UPDATE public.profiles
SET nutrition_calories = COALESCE(
  (nutrition_plan #>> '{dailyTargets,calories}')::INT,
  (nutrition_plan ->> 'calories')::INT,
  (nutrition_plan #>> '{meta,calories}')::INT
)
WHERE nutrition_plan IS NOT NULL AND nutrition_calories IS NULL;

-- 6) RLS Policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_self_nutrition'
  ) THEN
    CREATE POLICY profiles_update_self_nutrition
    ON public.profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
```

5. Click **"Run"** or press `Cmd+Enter`
6. Should see **"Success. No rows returned"**

#### Option B: Via Supabase CLI (If you have Docker)

```bash
cd /Users/netanelhadad/Projects/gymbro

# Start local Supabase (requires Docker Desktop running)
supabase start

# Apply migration
supabase db push

# Verify
supabase db reset --debug
```

### Step 2: Verify Migration Applied

**Run this query in Supabase Studio SQL Editor:**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name LIKE 'nutrition%'
ORDER BY column_name;
```

**Expected Result** (should show 5 rows):
```
column_name           | data_type
----------------------|---------------------------
nutrition_calories    | integer       ← THIS IS THE NEW ONE
nutrition_fingerprint | text
nutrition_plan        | jsonb
nutrition_status      | text
nutrition_updated_at  | timestamp with time zone
```

If you see all 5 columns, ✅ **migration successful!**

If you DON'T see `nutrition_calories`, ❌ **migration failed** - try again or check for errors.

---

### Step 3: Clear Browser Data (CRITICAL!)

The app caches data in localStorage. You need to clear it:

1. Open your app in the browser
2. Press **F12** (or `Cmd+Option+I` on Mac)
3. Go to **Application** tab
4. Click **Local Storage** → your domain
5. Click **"Clear All"** or delete individual keys
6. Click **Session Storage** → your domain
7. Click **"Clear All"**
8. Close DevTools

---

### Step 4: Test with Fresh User Signup

Now test the complete flow:

#### A. Go Through Onboarding

1. Navigate to `/onboarding/gender` (or start from beginning)
2. Fill out ALL fields:
   - Gender
   - Age
   - Height
   - Weight
   - Target weight
   - Activity level
   - Goal
   - Diet type
3. Click "Generate Plan" (or whatever the button says)

#### B. Watch the Generating Page

**Open DevTools Console first** (F12 → Console tab)

Expected logs:
```
[Generating] Start: 10%
[Generating] POST /api/ai/nutrition (days=1): 40%
[Generating] Draft saved (full) → navigate now
```

**SHOULD NOT see** (if you do, the fix didn't work):
```
[Generating] Watchdog fired → forcing finish  ← Should NOT appear before 15 seconds!
```

#### C. Complete Signup

1. Enter email and password
2. Click signup button
3. **Watch console logs** for:
   ```
   [Signup] Draft found: YES
   [Attach] POST user=...
   [Attach] Plan saved (fingerprint: ...)
   [Signup] Draft migrated
   ```

#### D. Check Nutrition Tab

1. Navigate to `/nutrition` page
2. **Should see** your nutrition plan with meals
3. **Should NOT see** "לא נמצאה תוכנית תזונה" error

---

### Step 5: If Still Not Working - Diagnose

#### Check Server Logs

Look at the terminal where `pnpm dev` is running. Search for:

- `[Attach]` logs - shows if attach route was called
- `[Nutrition Plan]` logs - shows if plan retrieval was attempted
- Any errors or stack traces

#### Check Database Directly

Run this query in Supabase Studio:

```sql
SELECT
  id,
  nutrition_status,
  nutrition_calories,
  CASE WHEN nutrition_plan IS NOT NULL THEN 'HAS PLAN' ELSE 'NO PLAN' END as plan_status,
  nutrition_updated_at,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;
```

**Look for:**
- Your user's row
- What's the `nutrition_status`? (should be 'ready', not 'pending')
- What's the `plan_status`? (should be 'HAS PLAN', not 'NO PLAN')
- Is `nutrition_calories` a number or NULL?

#### Check for Specific Errors

**If you see status='pending' and plan_status='NO PLAN':**
- The attach route was called but failed to generate a plan
- Check server logs for: `[Attach] Server-side generate response status=timeout`
- Possible causes: OpenAI API key issue, network timeout, generation failure

**If you see status='ready' but plan_status='NO PLAN':**
- Data integrity bug - should never happen
- Fix with: `UPDATE profiles SET nutrition_status='pending' WHERE nutrition_status='ready' AND nutrition_plan IS NULL;`

**If you don't see your user in the table:**
- Signup didn't create a profile row
- Check Supabase Auth → Users to see if user was created
- Check RLS policies on profiles table

---

## 🐛 Known Issues & Workarounds

### Issue: "Watchdog still firing after 5 seconds"

**Fix:** Make sure you saved the file and restarted the dev server.

```bash
# Kill the dev server
pkill -f next-server

# Restart
cd /Users/netanelhadad/Projects/gymbro/apps/web
pnpm dev
```

**Verify the fix:**
```bash
grep -A 2 "watchdogId = setTimeout" /Users/netanelhadad/Projects/gymbro/apps/web/app/onboarding/generating/page.tsx | grep "15000"
```

Should output: `}, 15000);`

If it says `}, 5000);` the file wasn't saved properly.

### Issue: "Migration fails with 'column already exists'"

**This is OK!** The migration is idempotent (safe to run multiple times). It will skip already-created columns.

### Issue: "No plan created even after 15 seconds"

Check if the API call is actually being made:

1. Open DevTools → Network tab
2. Filter by "nutrition"
3. Go through onboarding
4. Look for `POST /api/ai/nutrition` request
5. Check response:
   - Status 200 = success
   - Status 500 = server error (check console for details)
   - Status 401 = auth error
   - Request took > 12s = timeout (normal, attach route will retry)

---

## 📋 Quick Checklist

Before reporting "still not working", verify:

- [ ] Migration applied (ran SQL in Supabase Studio)
- [ ] Verified migration (SELECT query shows nutrition_calories column)
- [ ] Cleared browser localStorage and sessionStorage
- [ ] Restarted Next.js dev server (pkill + pnpm dev)
- [ ] Tested with completely fresh user account
- [ ] Checked server logs for [Attach] and [Nutrition Plan] messages
- [ ] Checked database for user's profile row
- [ ] Verified generating page doesn't show "Watchdog fired" before 15s

---

## 🆘 Still Not Working?

If you've done all the above and it's still not working, I need:

1. **Console logs** from browser during signup (copy/paste from DevTools Console)
2. **Server logs** from terminal where pnpm dev is running (search for [Attach] and [Nutrition Plan])
3. **Database query result** showing your user's profile row
4. **Network tab** screenshot showing the /api/ai/nutrition request status

This will help me identify the exact point of failure.

---

## Summary of Changes Made

| File | Change | Status |
|------|--------|--------|
| `apps/web/app/onboarding/generating/page.tsx` | Watchdog timeout: 5s → 15s | ✅ Fixed |
| `supabase/migrations/026_nutrition_calories.sql` | Migration file created | ✅ Ready to apply |
| `apps/web/app/api/nutrition/attach/route.ts` | Server-side generation + fingerprint check | ✅ Already updated |
| Database `profiles` table | Add nutrition_calories column | ⏳ **You need to apply** |

The code fix is done. **You need to apply the migration** for it to work.
