# 📋 Quick Setup Guide: Supabase Meals Table

## Step 1: Open Supabase Dashboard

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar (it has a database icon)

## Step 2: Run the SQL Script

1. Click **New Query** button (top right)
2. Copy the entire contents of `CREATE_MEALS_TABLE.sql`
3. Paste it into the SQL editor
4. Click **Run** (or press Cmd+Enter)

## Step 3: Verify Setup

After running the script, you should see success messages at the bottom. The script includes verification queries that will show:

- ✅ `meals_table_exists: true`
- ✅ `relrowsecurity: true`
- ✅ 4 RLS policies created
- ✅ `meal-images` storage bucket exists

## Step 4: Test the App

1. Open the app on your iPhone
2. Go to the Nutrition screen
3. Tap the floating "+" button
4. Choose "📸 סרוק ארוחה" (Scan Meal)
5. Take a photo of food
6. Wait for AI analysis
7. The meal should now save successfully!

## Troubleshooting

### If you get permission errors:
- Make sure you're logged into the app (the user needs to be authenticated)
- Check that RLS policies were created correctly

### If the storage bucket isn't created:
1. Go to **Storage** in Supabase dashboard
2. Click **Create a new bucket**
3. Name: `meal-images`
4. Public bucket: ✅ Yes
5. Click **Create**

### To check if meals are being saved:
1. Go to **Table Editor** in Supabase
2. Select the `meals` table
3. You should see your scanned meals appearing here

## What's Next?

Once the database is set up:
- ✅ Manual meal entry will work
- ✅ AI food scanning will save results
- ✅ Meal history will be displayed
- ✅ Daily nutrition totals will update

The app is now fully functional for meal tracking!

---

## Quick Commands

If you need to reset or debug:

```sql
-- Check if table exists
SELECT * FROM public.meals LIMIT 5;

-- Check your user ID
SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- View recent meals
SELECT * FROM public.meals
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 10;

-- Delete a test meal
DELETE FROM public.meals WHERE id = 'meal-id-here';
```