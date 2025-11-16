# Why Isn't a Nutrition Plan Being Created?

## The Simple Answer

The nutrition plan creation process has **7 steps**. If ANY step fails, you get no plan.

Here's what happens:

```
Step 1: Fill onboarding forms → ✓ (You did this)
Step 2: Generating page creates plan → ❓ (Need to verify)
Step 3: Plan saved to localStorage → ❓ (Need to verify)
Step 4: Signup with email/password → ✓ (You did this)
Step 5: Attach route called → ❓ (Need to verify)
Step 6: Plan saved to database → ❌ (This is failing!)
Step 7: Nutrition page loads plan → ❌ (Can't load - nothing to load!)
```

**Step 6 is failing.** The plan can't be saved to the database.

## Why Step 6 Fails

The attach route tries to save the plan with this code:

```typescript
await supabase.from("profiles").update({
  nutrition_plan: plan,
  nutrition_calories: calories,  // ← This column might not exist!
  nutrition_status: 'ready',
  // ... more fields
})
```

**If the `nutrition_calories` column doesn't exist**, this UPDATE fails.

The error gets logged to the server, but the user never sees it.

---

## The Root Cause

You haven't applied the database migration yet, OR it failed silently.

The migration adds the `nutrition_calories` column. Without it, plans can't be saved.

---

## The Absolute Simplest Test

Run this SQL in Supabase Studio **right now**:

```sql
-- Test 1: Does the column exist?
SELECT 1 FROM information_schema.columns
WHERE table_name='profiles' AND column_name='nutrition_calories';
```

**Result:**
- **0 rows** = Column doesn't exist → Migration not applied → **This is your problem**
- **1 row** = Column exists → Migration applied → Problem is something else

---

## The Fix (If Column Doesn't Exist)

Run this SQL in Supabase Studio:

```sql
ALTER TABLE public.profiles ADD COLUMN nutrition_calories INTEGER;
```

**Expected result:** `Success. No rows returned` or `SUCCESS`

---

## The Fix (If Column Already Exists)

Then the problem is different. Check these:

### A. Is the attach route being called?

**During signup, check browser console:**

```
[Signup] Draft found: YES       ← Should see this
[Signup] Draft migrated         ← Should see this
```

**If you DON'T see these logs:**
- The draft wasn't created during onboarding
- localStorage is empty
- The generating page didn't save a plan

**Fix:** Go through onboarding again with DevTools console open

### B. Is the attach route succeeding?

**Check server terminal (where pnpm dev runs):**

```
[Attach] POST user=xxx fp=xxx           ← Attach was called
[Attach] Plan saved (fingerprint: xxx)  ← Success!
```

**If you see an error instead:**
- Copy the full error message
- Send it to me
- That's the exact problem

### C. Is there a plan in the database?

**Run this SQL:**

```sql
SELECT id, nutrition_status,
       CASE WHEN nutrition_plan IS NOT NULL THEN 'YES' ELSE 'NO' END as has_plan
FROM profiles
ORDER BY created_at DESC LIMIT 1;
```

**If has_plan = 'NO':**
- The attach route failed to save the plan
- Check server logs for the error
- Most likely: column doesn't exist

**If has_plan = 'YES':**
- The plan exists!
- The problem is in the GET /api/nutrition/plan route
- Check browser Network tab for the API response

---

## Test Right Now (Takes 2 Minutes)

### Step 1 (30 seconds): Check if column exists

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='profiles' AND column_name='nutrition_calories';
```

**Returns 0 rows?** → Run this:

```sql
ALTER TABLE public.profiles ADD COLUMN nutrition_calories INTEGER;
```

**Returns 1 row?** → Column exists, continue to Step 2

### Step 2 (30 seconds): Manually insert a test plan

Get your user ID:

```sql
SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1;
```

Insert test plan (replace `YOUR_USER_ID` with your actual ID):

```sql
UPDATE profiles
SET
  nutrition_plan = '{"days":[{"name":"יום בדיקה","meals":[{"name":"ארוחת בוקר","description":"בדיקה","macros":{"calories":500,"protein_g":30,"carbs_g":50,"fat_g":20}}]}],"dailyTargets":{"calories":2000,"protein_g":150,"carbs_g":200,"fat_g":70},"summary":"תוכנית בדיקה"}'::jsonb,
  nutrition_calories = 2000,
  nutrition_status = 'ready',
  nutrition_updated_at = NOW()
WHERE id = 'YOUR_USER_ID';
```

### Step 3 (30 seconds): Check if it worked

Refresh your `/nutrition` page.

**See a plan?** → ✅ Database works! Problem is in onboarding/attach flow

**Still see error?** → ❌ Something else is wrong. Check:
- Are you logged in with the same user?
- Did the UPDATE affect 1 row? (Check query result)
- Check browser console for errors

### Step 4 (30 seconds): Test the full flow

1. Clear localStorage: DevTools → Application → Local Storage → Clear All
2. Log out and log back in
3. Go to `/nutrition`
4. **Should see the test plan you inserted**

If yes → The GET API works! Now we need to fix the creation flow.

---

## What to Tell Me

Run the tests above and tell me:

1. **Column exists?** (0 rows or 1 row from Step 1)
2. **Manual insert worked?** (Success or error from Step 2)
3. **Can you see the test plan?** (Yes or no from Step 3)

With these 3 answers, I can tell you **exactly** what's wrong and how to fix it.

---

## The TL;DR

**Most likely issue:** The `nutrition_calories` column doesn't exist in your database.

**Quick fix:**
```sql
ALTER TABLE public.profiles ADD COLUMN nutrition_calories INTEGER;
```

**Then test:** Go through onboarding again and it should work.

**If it still doesn't work after adding the column**, there's a different issue and I need the test results above.
