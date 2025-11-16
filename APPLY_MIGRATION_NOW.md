# 🚨 APPLY THIS MIGRATION NOW

## Why You're Seeing 1050 Instead of More Calories

The meals you mark as eaten from your nutrition plan are currently **only saved to localStorage** (your browser), not to the database. The graphs page reads from the database, so it doesn't see them.

---

## 📋 Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor

Click this link (it will open in a new tab):

**👉 https://supabase.com/dashboard/project/ivzltlqsjrikffssyvbr/sql/new**

### Step 2: Copy This Exact SQL

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

### Step 3: Paste and Run

1. Paste the SQL into the editor
2. Click the **"Run"** button (or press Cmd+Enter)
3. Wait for "Success. No rows returned"

### Step 4: Test It

1. **Refresh your app** (Cmd+R or Ctrl+R)
2. Go to **Nutrition** page
3. **Uncheck all meals** (to clear the old localStorage-only data)
4. **Check them again** (this will now save to database)
5. Go to **Progress/Graphs** page
6. **The calorie count should now include all your meals!** 🎉

---

## 🔍 What This Migration Does

**Before Migration:**
```
User marks meal → localStorage only
                ↓
Graphs page queries database → No plan meals found → Shows only photo meals (1050) ❌
```

**After Migration:**
```
User marks meal → localStorage + DATABASE (source: 'plan')
                ↓
Graphs page queries database → Finds ALL meals → Shows correct total ✅
```

---

## ⚠️ Important: After Migration, Re-mark Your Meals

After you run the migration:
1. Any meals you marked **before** the migration are still only in localStorage
2. You need to **uncheck and re-check** them to save them to the database
3. Or just wait until tomorrow and mark new meals - they'll work automatically

---

## 🐛 Troubleshooting

### If you see "permission denied" or "relation does not exist"
- Make sure you're logged into the correct Supabase project
- The URL should be: `ivzltlqsjrikffssyvbr.supabase.co`

### If the calorie count still doesn't update
1. Open browser console (F12)
2. Run this to check if meals are being saved:
```javascript
const today = new Date().toISOString().split('T')[0];
fetch(`/api/meals?date=${today}`)
  .then(r => r.json())
  .then(data => {
    console.log('All meals:', data.meals);
    console.log('Plan meals:', data.meals.filter(m => m.source === 'plan'));
  });
```
3. You should see meals with `source: 'plan'`

### If you see an error about "constraint already exists"
- That's fine! It means part of the migration was already applied
- The migration is safe to run multiple times

---

## Need Help?

If you're stuck, let me know and I can help debug!
