# 🔧 Fix: Plan Meals Not Counted in Graphs

## Problem
When you mark meals as eaten from your nutrition plan, they only show on the nutrition page but **not on the graphs/progress page**. This is because plan meals were only stored in localStorage and never saved to the database.

---

## ✅ Solution Summary

**What Changed:**
1. Database now supports a new meal source type: `'plan'`
2. Added `plan_meal_id` column to track which plan meal was marked
3. New API endpoint `/api/meals/plan` for saving/deleting plan meals
4. Updated `handleToggleMeal` to persist plan meals to database

**Result:** When you mark a meal as eaten from your nutrition plan, it will now:
- ✅ Save to the database
- ✅ Show up in the graphs page calorie count
- ✅ Still show in the nutrition page (backward compatible)

---

## 📋 Step-by-Step Installation

### Step 1: Run Database Migration

Go to Supabase SQL Editor:
https://supabase.com/dashboard/project/ivzltlqsjrikffssyvbr/sql/new

Copy and paste this SQL:

```sql
-- Migration 012: Add 'plan' as a valid source type for meals
-- This allows tracking meals that were marked as eaten from the nutrition plan

-- Update the source check constraint to include 'plan'
ALTER TABLE public.meals
DROP CONSTRAINT IF EXISTS meals_source_check;

ALTER TABLE public.meals
ADD CONSTRAINT meals_source_check
CHECK (source IN ('manual', 'ai_vision', 'plan'));

-- Add optional plan_meal_id to track which plan meal this refers to
-- Format: "dayIndex_mealIndex" (e.g., "0_1" for Sunday, second meal)
ALTER TABLE public.meals
ADD COLUMN IF NOT EXISTS plan_meal_id text;

-- Create index for plan meal lookups
CREATE INDEX IF NOT EXISTS idx_meals_plan_meal_id ON public.meals (user_id, plan_meal_id, date)
WHERE plan_meal_id IS NOT NULL;
```

**Expected result:** ✅ "Success. No rows returned"

---

### Step 2: Verify Migration

Run this query to confirm the changes:

```sql
-- Check the meals table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'meals'
ORDER BY ordinal_position;
```

**Expected columns to include:**
- `plan_meal_id` (text) ← **NEW COLUMN**

Check the constraint:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.meals'::regclass
  AND conname = 'meals_source_check';
```

**Expected result:** Constraint should include `'plan'` in the list

---

### Step 3: Restart Dev Server

```bash
cd /Users/netanelhadad/Projects/gymbro
pnpm -C apps/web dev
```

---

### Step 4: Test the Fix

#### 4A. Test Marking a Meal as Eaten

1. Navigate to the **Nutrition** page (`/nutrition`)
2. Make sure you have a nutrition plan loaded
3. Mark a meal as eaten by clicking its checkbox
4. **Expected behavior:**
   - Checkbox is checked
   - Calorie count updates on nutrition page
   - No errors in console

#### 4B. Verify Database Insert

Open browser console and run:

```javascript
// Check if the plan meal was saved
const today = new Date().toISOString().split('T')[0];
fetch(`/api/meals?date=${today}`)
  .then(r => r.json())
  .then(data => {
    console.log('All meals for today:', data.meals);
    console.log('Plan meals:', data.meals.filter(m => m.source === 'plan'));
  });
```

**Expected result:**
- Should show meals with `source: 'plan'`
- Should have `plan_meal_id` field (e.g., `"0_2"`)

#### 4C. Test Graphs Page Calorie Count

1. Navigate to the **Progress** page (`/progress`)
2. Look at the "Today's Calories" KPI box
3. **Expected behavior:**
   - Should show total calories including:
     - Meals from photos (ai_vision)
     - Manually added meals (manual)
     - **Plan meals you marked as eaten (plan)** ← NEW!

#### 4D. Test Unmarking a Meal

1. Go back to **Nutrition** page
2. Uncheck a meal you previously marked
3. Check the database again (repeat step 4B)
4. **Expected behavior:**
   - Meal should be deleted from database
   - Calorie count should update immediately

---

## 🔍 How It Works

### Before (Old Behavior)
```
User marks meal → Saved to localStorage only
                ↓
Graphs page queries database → Doesn't find plan meals → Shows wrong count ❌
```

### After (New Behavior)
```
User marks meal → Saved to localStorage AND database (source: 'plan')
                ↓
Graphs page queries database → Finds all meals including plan → Shows correct count ✅
```

### Data Flow

**When marking a meal:**
1. User clicks checkbox on nutrition page
2. `handleToggleMeal()` is called
3. POST to `/api/meals/plan` with meal data
4. Database inserts with:
   - `source: 'plan'`
   - `plan_meal_id: "dayIndex_mealIndex"`
   - All macro data (calories, protein, carbs, fat)
5. Updates localStorage for fast UI
6. Updates React state

**When unmarking:**
1. DELETE to `/api/meals/plan` with `plan_meal_id` and `date`
2. Database deletes matching record
3. Updates localStorage
4. Updates React state

**When loading graphs:**
1. Progress page queries `/api/progress/[range]`
2. Queries `meals` table for date range
3. Sums calories from ALL sources (manual, ai_vision, **plan**)
4. Displays total

---

## 🧪 Testing Checklist

- [ ] Migration applied successfully
- [ ] Can mark a meal as eaten (no errors)
- [ ] Plan meal appears in database with `source: 'plan'`
- [ ] Graphs page shows updated calorie count
- [ ] Can unmark a meal (removes from database)
- [ ] Graphs page reflects the change
- [ ] Photo-scanned meals still work
- [ ] Manually added meals still work
- [ ] Multiple plan meals can be marked
- [ ] Works across different days of the week

---

## 🐛 Troubleshooting

### Plan meal not showing in database

**Check:**
1. Open browser console - any errors?
2. Check network tab for failed API calls
3. Verify you're logged in

**Fix:**
```javascript
// Check auth status
fetch('/api/auth/session').then(r => r.json()).then(console.log)
```

### Graphs still show wrong count

**Causes:**
1. Migration not applied
2. Cache issue

**Fix:**
```bash
# Hard refresh browser
Cmd + Shift + R (Mac)
Ctrl + Shift + R (Windows)

# Clear localStorage (in console)
localStorage.clear()
```

### API returns 500 error

**Check migration:**
```sql
-- Verify meals table has plan_meal_id column
\d public.meals
```

**Check constraint:**
```sql
-- Should allow 'plan' as source
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.meals'::regclass
  AND conname = 'meals_source_check';
```

### Meals duplicate when marking/unmarking

**This is prevented by:**
- Checking if `plan_meal_id` + `date` already exists before inserting
- Using exact match on `plan_meal_id` + `date` + `user_id` for deletes

**Verify:**
```sql
-- Check for duplicates
SELECT plan_meal_id, date, COUNT(*)
FROM public.meals
WHERE source = 'plan'
  AND user_id = 'YOUR_USER_ID'
GROUP BY plan_meal_id, date
HAVING COUNT(*) > 1;
```

---

## 📁 Files Modified

### Database
- `apps/web/supabase/migrations/012_add_plan_meal_source.sql` - **NEW**
  - Adds 'plan' to source constraint
  - Adds plan_meal_id column
  - Adds index

### API
- `apps/web/app/api/meals/plan/route.ts` - **NEW**
  - POST: Insert plan meal
  - DELETE: Remove plan meal
  - Validates input with Zod
  - Prevents duplicates

### Frontend
- `apps/web/app/(app)/nutrition/page.tsx` - **MODIFIED**
  - `handleToggleMeal()` now async
  - Calls `/api/meals/plan` to persist
  - Still updates localStorage for fast UI
  - Shows error if save fails

### Unchanged (works automatically)
- `apps/web/app/api/progress/[range]/route.ts` - Already queries all meals
- `apps/web/lib/progress/queries.ts` - Already sums all calories by source
- All graph components - No changes needed

---

## 🎯 Quick Checklist

```bash
# 1. Open Supabase SQL Editor
# https://supabase.com/dashboard/project/ivzltlqsjrikffssyvbr/sql/new

# 2. Run migration 012 (copy SQL from Step 1 above)

# 3. Restart dev server
cd /Users/netanelhadad/Projects/gymbro
pnpm -C apps/web dev

# 4. Test in browser
# - Go to /nutrition
# - Mark a meal as eaten
# - Go to /progress
# - Check calorie count includes the plan meal
```

Expected final result: ✅ Graphs show correct calories including plan meals!
