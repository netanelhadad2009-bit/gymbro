# Why Nutrition Plans Aren't Being Created - Flow Trace

Let me trace the **exact flow** step by step to show you where it's breaking:

## The Expected Flow

```
1. User → Onboarding Pages
   ↓
2. User → Generating Page (POST /api/ai/nutrition)
   ↓
3. API → Returns nutrition plan JSON
   ↓
4. Generating Page → Saves draft to localStorage
   ↓
5. User → Signup Page
   ↓
6. Signup Page → Calls POST /api/nutrition/attach
   ↓
7. Attach Route → Saves plan to database (nutrition_plan column)
   ↓
8. User → Nutrition Tab
   ↓
9. Nutrition Tab → Calls GET /api/nutrition/plan
   ↓
10. API → Returns plan from database
```

## Where It's Breaking (Most Likely)

**Step 7 is FAILING** because the `nutrition_calories` column doesn't exist yet.

### Here's Why:

The attach route tries to save the plan with this SQL:

```typescript
await supabase
  .from("profiles")
  .update({
    nutrition_plan: finalizeResult.plan,
    nutrition_fingerprint: finalizeResult.fingerprint,
    nutrition_calories: finalizeResult.calories,  // ← THIS COLUMN DOESN'T EXIST!
    nutrition_status: 'ready',
    nutrition_updated_at: new Date().toISOString(),
  })
  .eq("id", userId);
```

If `nutrition_calories` column doesn't exist, **this UPDATE will fail** with:

```
column "nutrition_calories" of relation "profiles" does not exist
```

The attach route has error handling, so it probably:
1. Catches the error
2. Returns `{ ok: false, error: "database_error" }`
3. BUT doesn't throw an error to the user (silent failure)

So the signup completes successfully, but **no plan is saved to the database**.

---

## Proof: Check Your Server Logs

Let's check if this is what's happening.

**Look at your terminal where `pnpm dev` is running.**

Search for recent logs. Do you see:

```
[Attach] Failed to save plan: { code: '42703', message: 'column "nutrition_calories" does not exist' }
```

or

```
[Attach] Failed to save pending status: { code: '42703', message: 'column "nutrition_calories" does not exist' }
```

**If YES** → This confirms the issue. The migration hasn't been applied.

**If NO** → The attach route might not even be getting called. Let me check that next.

---

## Quick Test: Is Attach Route Being Called?

Let's verify if the attach route is even being called during signup.

**During your next test signup, watch for these console logs:**

### In Browser Console:
```
[Signup] Draft found: YES  ← Should see this
[Signup] Draft migrated    ← Should see this after attach call
```

### In Server Terminal:
```
[Attach] POST user=xxxxxxxx fp=xxxxxxxxxxxx  ← Should see this
[Attach] Plan saved (fingerprint: xxx)       ← Should see this if successful
```

**If you DON'T see the [Attach] logs** → The attach route isn't being called at all.

**If you see [Attach] logs but then see an error** → That error tells us exactly what's wrong.

---

## The Fix (Almost Certain)

Based on the error message in your screenshot and the 404 response, I'm **99% confident** the issue is:

### The `nutrition_calories` column doesn't exist in your database.

**This is why:**

1. ✅ You ran the SQL migration in Supabase Studio
2. ❓ But did you check if it actually worked?
3. ❓ Did you see "Success. No rows returned"?
4. ❓ Or did you see an error?

Sometimes migrations fail silently, or run on the wrong project, or get copy-pasted incorrectly.

---

## Definitive Test

Run this SQL query in Supabase Studio **RIGHT NOW**:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'nutrition_calories';
```

### Case A: Query returns 0 rows

**This means:** The column doesn't exist. The migration didn't apply.

**Why:**
- You might have pasted the SQL into the wrong project
- There was an error you didn't notice
- The SQL didn't run completely

**Fix:** Re-run the migration SQL (I'll send it again below)

### Case B: Query returns 1 row

**This means:** The column exists! The migration worked!

**Then the issue is something else:**
- Attach route isn't being called
- Attach route is being called but failing for a different reason
- No draft exists in localStorage when you sign up

---

## Re-Run Migration (Just to Be Sure)

Copy this SQL and run it in Supabase Studio → SQL Editor:

```sql
-- Add nutrition_calories column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='nutrition_calories'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN nutrition_calories INTEGER;
    RAISE NOTICE 'Added nutrition_calories column';
  ELSE
    RAISE NOTICE 'nutrition_calories column already exists';
  END IF;
END $$;
```

**Expected output:**
- If column didn't exist: `NOTICE: Added nutrition_calories column`
- If column exists: `NOTICE: nutrition_calories column already exists`

---

## Test Flow: Let's Create a Plan Right Now

Instead of waiting for onboarding, let's **manually test** if the system can create plans.

### Step 1: Get Your User ID

Run this in Supabase Studio:

```sql
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;
```

Copy your user ID (should look like: `123e4567-e89b-12d3-a456-426614174000`)

### Step 2: Manually Insert a Test Plan

Run this in Supabase Studio (replace `YOUR_USER_ID` with your actual ID):

```sql
UPDATE profiles
SET
  nutrition_plan = '{"days":[{"name":"יום 1","meals":[{"name":"ארוחת בוקר טסט","description":"טסט","macros":{"calories":500,"protein_g":30,"carbs_g":50,"fat_g":20}}]}],"dailyTargets":{"calories":2000,"protein_g":150,"carbs_g":200,"fat_g":70},"summary":"תוכנית טסט"}'::jsonb,
  nutrition_fingerprint = 'test-fingerprint-12345',
  nutrition_calories = 2000,
  nutrition_status = 'ready',
  nutrition_updated_at = NOW()
WHERE id = 'YOUR_USER_ID';
```

**If this UPDATE succeeds:**
- Refresh your `/nutrition` page
- You should now see a nutrition plan!
- This proves the column exists and the GET API works

**If this UPDATE fails:**
- You'll see an error like: `column "nutrition_calories" does not exist`
- This proves the migration didn't apply
- Re-run the migration SQL above

---

## Most Likely Scenario

Based on everything I see:

1. **Migration not applied** → nutrition_calories column missing
2. **User completes onboarding** → Generating page creates draft in localStorage
3. **User signs up** → Signup calls attach route
4. **Attach route tries to save plan** → UPDATE fails because column doesn't exist
5. **Error is caught silently** → No plan saved, but signup continues
6. **User goes to nutrition tab** → API returns 404 because no plan exists
7. **User sees error message** → "לא נמצאה תוכנית תזונה"

The fix is simple: **Apply the migration.**

But you already tried to apply it, so either:
- It ran on the wrong project/database
- There was an error you didn't see
- You need to re-run it

---

## Action Items (In Order)

Do these steps **RIGHT NOW** and report back the results:

### 1. Check if column exists:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='profiles' AND column_name='nutrition_calories';
```

**Tell me:** How many rows returned? (0 or 1?)

### 2. If 0 rows, run this:
```sql
ALTER TABLE public.profiles ADD COLUMN nutrition_calories INTEGER;
```

**Tell me:** Success or error?

### 3. Manually insert test plan:
```sql
-- First get your user ID
SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1;

-- Then insert (replace YOUR_USER_ID)
UPDATE profiles
SET
  nutrition_plan = '{"days":[{"name":"Test Day","meals":[{"name":"Test Meal","macros":{"calories":500,"protein_g":30,"carbs_g":50,"fat_g":20}}]}],"dailyTargets":{"calories":2000,"protein_g":150,"carbs_g":200,"fat_g":70}}'::jsonb,
  nutrition_calories = 2000,
  nutrition_status = 'ready',
  nutrition_updated_at = NOW()
WHERE id = 'YOUR_USER_ID';
```

**Tell me:** Success or error?

### 4. Refresh /nutrition page

**Tell me:** Do you see a plan now?

---

This will tell us **exactly** what's wrong.
