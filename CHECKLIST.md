# ✅ Checklist: Fix Plan Meals Not Showing in Graphs

## Current Status
- ✅ Dev server restarted
- ✅ API endpoint `/api/meals/plan` created
- ✅ Frontend code updated to save to database
- ⏳ **DATABASE MIGRATION NOT APPLIED YET** ← YOU ARE HERE

---

## What You Need to Do NOW:

### ☐ Step 1: Apply Database Migration (5 minutes)

**This is the ONLY step that's missing!**

1. Open this URL:
   **https://supabase.com/dashboard/project/ivzltlqsjrikffssyvbr/sql/new**

2. Copy this SQL:
   ```sql
   ALTER TABLE public.meals
   DROP CONSTRAINT IF EXISTS meals_source_check;

   ALTER TABLE public.meals
   ADD CONSTRAINT meals_source_check
   CHECK (source IN ('manual', 'ai_vision', 'plan'));

   ALTER TABLE public.meals
   ADD COLUMN IF NOT EXISTS plan_meal_id text;

   CREATE INDEX IF NOT EXISTS idx_meals_plan_meal_id
   ON public.meals (user_id, plan_meal_id, date)
   WHERE plan_meal_id IS NOT NULL;
   ```

3. Paste it and click **"Run"**

4. Expected: ✅ "Success. No rows returned"

---

### ☐ Step 2: Test It (2 minutes)

1. **Refresh your app** (Cmd+R)
2. Go to **Nutrition** page (`/nutrition`)
3. **Uncheck all plan meals** you previously marked
4. **Check them again** (this will save to database)
5. Go to **Progress/Graphs** page (`/progress`)
6. **Check the calorie count** - should now include plan meals!

---

### ☐ Step 3: Verify (Optional)

Open browser console (F12) and run:
```javascript
const today = new Date().toISOString().split('T')[0];
fetch(`/api/meals?date=${today}`)
  .then(r => r.json())
  .then(data => {
    const planMeals = data.meals.filter(m => m.source === 'plan');
    console.log('Plan meals in database:', planMeals);
    console.log('Total calories:', data.meals.reduce((sum, m) => sum + m.calories, 0));
  });
```

---

## Why This Is Needed

**Right now:**
```
You mark meal → App tries to save to database → Database rejects it (no 'plan' source type) → Only saved to localStorage → Graphs don't see it ❌
```

**After migration:**
```
You mark meal → App saves to database (source: 'plan') → Graphs query database → Sees all meals ✅
```

---

## Summary

- **What's working:** Nutrition page, meal toggling, localStorage
- **What's NOT working:** Graphs page calorie count (missing plan meals)
- **What's missing:** Database migration (1 SQL query in Supabase)
- **Time needed:** 5 minutes total

---

## Need Help?

If you get stuck on any step, let me know!
