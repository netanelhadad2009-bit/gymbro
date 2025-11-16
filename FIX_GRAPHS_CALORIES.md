# 🔥 Quick Fix: Plan Meals Not Showing in Graphs

## The Problem
When you mark meals as eaten from your nutrition plan, they show on the nutrition page but **NOT on the graphs page**.

## The Solution (2 minutes)

### Step 1: Apply Database Migration

1. **Open Supabase SQL Editor:**
   https://supabase.com/dashboard/project/ivzltlqsjrikffssyvbr/sql/new

2. **Copy the SQL below and paste it:**

```sql
-- Add 'plan' meal source type
ALTER TABLE public.meals
DROP CONSTRAINT IF EXISTS meals_source_check;

ALTER TABLE public.meals
ADD CONSTRAINT meals_source_check
CHECK (source IN ('manual', 'ai_vision', 'plan'));

-- Add plan_meal_id column
ALTER TABLE public.meals
ADD COLUMN IF NOT EXISTS plan_meal_id text;

-- Create index
CREATE INDEX IF NOT EXISTS idx_meals_plan_meal_id
ON public.meals (user_id, plan_meal_id, date)
WHERE plan_meal_id IS NOT NULL;
```

3. **Click "Run"**

4. **Expected result:** ✅ "Success. No rows returned"

---

### Step 2: That's It! Test It

1. Go to **Nutrition** page (`/nutrition`)
2. Mark a meal as eaten (click checkbox)
3. Go to **Progress** page (`/progress`)
4. **The calorie count should now include the plan meal!** 🎉

---

## 🧪 Verify It Worked

Open browser console (F12) and run:

```javascript
const today = new Date().toISOString().split('T')[0];
fetch(`/api/meals?date=${today}`)
  .then(r => r.json())
  .then(data => {
    const planMeals = data.meals.filter(m => m.source === 'plan');
    console.log('Plan meals saved to database:', planMeals);
  });
```

You should see plan meals with `source: 'plan'` ✅

---

## What This Does

**Before:**
- Mark meal → localStorage only → Graphs don't see it ❌

**After:**
- Mark meal → localStorage + **database** → Graphs include it ✅

The migration adds:
1. A new meal source type: `'plan'` (alongside 'manual' and 'ai_vision')
2. A `plan_meal_id` column to track which plan meal it is
3. An index for fast lookups

---

## Need the Full Documentation?

See [PLAN_MEALS_FIX.md](PLAN_MEALS_FIX.md) for complete details, troubleshooting, and technical explanation.
