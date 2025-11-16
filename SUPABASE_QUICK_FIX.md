# 🚀 Quick Fix: Enable Meal Scanning in 2 Minutes

## The Problem
Your meal scanning is working but getting "DB insert failed" because the database table doesn't exist yet.

## The Solution - Just 3 Steps:

### Step 1: Open Supabase SQL Editor
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your **gymbro** project
3. Click **SQL Editor** (left sidebar, database icon)

### Step 2: Run the Setup Script
1. Click **New Query** (green button, top right)
2. Copy ALL the text from `CREATE_MEALS_TABLE.sql`
3. Paste it in the editor
4. Click **RUN** (or press Cmd+Enter)

You'll see green checkmarks:
```
✅ meals table created
✅ RLS policies added
✅ Storage bucket created
```

### Step 3: Test It!
1. Open GymBro on your iPhone
2. Go to **תזונה** (Nutrition) tab
3. Tap the yellow **+** button
4. Choose **📸 סרוק ארוחה**
5. Take a photo of any food
6. Watch it analyze and save! 🎉

## Success Indicators
- ✅ No more "DB insert failed" error
- ✅ Meal appears in your daily list
- ✅ Calories update in your daily total
- ✅ Manual entry also works

## If Something Goes Wrong

### "Permission denied" error?
Make sure you're logged into the app first.

### Still getting "DB insert failed"?
Check the table was created:
1. Go to **Table Editor** in Supabase
2. Look for `meals` table in the list
3. If it's not there, run the SQL script again

### Need to see what's in the database?
```sql
-- In SQL Editor, run:
SELECT * FROM meals ORDER BY created_at DESC LIMIT 10;
```

---

## 🎊 That's It!
Your meal tracking is now fully functional. The AI will analyze your food photos and automatically save them with nutritional information.

Test it out with your next meal!