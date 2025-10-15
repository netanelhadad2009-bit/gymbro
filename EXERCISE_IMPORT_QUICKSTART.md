# Exercise Library Import - Quick Start Guide

Complete step-by-step guide to set up and run the exercise import for GymBro.

---

## 📋 Prerequisites

- Supabase project created
- Access to Supabase Dashboard
- Node.js and pnpm installed
- Service role key from Supabase

---

## 🚀 Step 1: Run Database Migrations

### 1.1 Open Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your GymBro project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### 1.2 Run Migration #1 - Exercise Library Tables

Copy the **entire content** of `apps/web/supabase/migrations/004_exercise_library.sql` and paste into the SQL Editor, then click **Run**.

This migration creates:
- `profiles` table (if missing) with `is_admin` column
- `exercise_library` table
- `exercise_tags` table
- `exercise_library_tags` junction table
- Indexes for performance
- Slug generation function (using `[:space:]` instead of `\s` to avoid regex errors)
- Timestamp update function
- RLS policies (read for authenticated, write for admin only)

**Expected result:** ✅ Success. No rows returned

### 1.3 Run Migration #2 - Storage Buckets

Click **New Query** again, copy the entire content of `apps/web/supabase/migrations/005_storage_exercise_assets.sql`, paste and click **Run**.

This migration creates:
- `exercise-thumbs` bucket (public read access)
- `exercise-videos` bucket (private, signed URL access)
- RLS policies on `storage.objects` (NOT `storage.policies` to avoid errors)

**Expected result:** ✅ Success. No rows returned

### 1.4 Verify Tables Created

Run this query to verify:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('exercise_library', 'exercise_tags', 'exercise_library_tags', 'profiles');
```

You should see all 4 tables.

---

## 🔧 Step 2: Configure Environment Variables

### 2.1 Get Your Supabase Credentials

1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **service_role** key (NOT the anon key!)

### 2.2 Update .env.local

Edit `apps/web/.env.local` and ensure these variables are set:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."
```

**Important:**
- Use the **service_role** key, not the anon key
- Keep this file secure and never commit it to Git

---

## 📦 Step 3: Install Dependencies

```bash
cd ~/Projects/gymbro/apps/web
pnpm install
```

This will install:
- `tsx` - TypeScript execution
- `chalk` - Colored console output
- `dotenv` - Environment variable loading
- `@supabase/supabase-js` - Supabase client

---

## 📝 Step 4: Prepare Exercise Data

The sample data file already exists at `apps/web/data/exercises_library.json` with 5 Hebrew exercises.

**To add your own exercises:**

1. Edit `apps/web/data/exercises_library.json`
2. Follow this structure:

```json
{
  "exercises": [
    {
      "name_he": "לחיצת חזה במוט שטוח",
      "description_he": "תיאור מפורט של התרגיל...",
      "primary_muscle": "חזה",
      "secondary_muscles": ["כתפיים", "יד אחורית"],
      "equipment": "מוט, ספסל שטוח",
      "difficulty": "intermediate",
      "sets_default": 4,
      "reps_default": "8-12",
      "tempo_default": "2-0-2",
      "rest_seconds_default": 120,
      "video_url": "",
      "thumb_url": "",
      "tags": ["חזה", "לחיצה", "קומפאונד", "מוט"]
    }
  ]
}
```

**Required fields:**
- `name_he` - Exercise name in Hebrew
- `description_he` - Description in Hebrew
- `primary_muscle` - Main muscle group
- `difficulty` - One of: `beginner`, `intermediate`, `advanced`
- `sets_default` - Number (e.g., 3, 4)
- `reps_default` - String (e.g., "8-12", "10-15")

---

## ▶️ Step 5: Run the Import

```bash
cd ~/Projects/gymbro/apps/web
pnpm import-exercises
```

**Expected output:**

```
🏋️‍♂️  GymBro Exercise Import Started

============================================================

📂 Loading exercises from: /Users/you/Projects/gymbro/apps/web/data/exercises_library.json
✅ Loaded 5 exercises from JSON

🔄 Processing exercises...

[1/5] לחיצת חזה במוט שטוח → ✅ Inserted
[2/5] סקוואט חזיתי → ✅ Inserted
[3/5] משיכות עליונות רחבות → ✅ Inserted
[4/5] פלאנק → ✅ Inserted
[5/5] כפיפות בר → ✅ Inserted

============================================================
📊 Summary
============================================================
✅ Imported: 5
⏭️  Skipped: 0
❌ Failed: 0
🏷️  New tags created: 15
============================================================

📝 Preview of Imported Exercises (first 3):
   - לחיצת חזה במוט שטוח
     שריר: חזה | קושי: intermediate
     ברירת מחדל: 4 × 8-12
     ID: 123e4567-e89b-12d3-a456-426614174000

✨ Import complete!
```

---

## 👤 Step 6: Make Yourself Admin

To access admin features, you need to set your user as admin.

### 6.1 Find Your User ID

In Supabase SQL Editor, run:

```sql
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

Copy your `id` (UUID).

### 6.2 Set Admin Flag

```sql
UPDATE public.profiles
SET is_admin = true
WHERE id = 'PASTE_YOUR_USER_ID_HERE';
```

**Verify:**

```sql
SELECT id, full_name, is_admin FROM public.profiles WHERE is_admin = true;
```

You should see your profile with `is_admin = true`.

---

## ✅ Step 7: Verify the Import

### Count Exercises

```sql
SELECT COUNT(*) AS total_exercises FROM exercise_library;
```

Expected: 5 (or however many you imported)

### Count Tags

```sql
SELECT COUNT(*) AS total_tags FROM exercise_tags;
```

### View Recent Exercises

```sql
SELECT
  id,
  name_he,
  primary_muscle,
  difficulty,
  sets_default,
  reps_default,
  created_at
FROM exercise_library
ORDER BY created_at DESC
LIMIT 5;
```

### Top Tags by Usage

```sql
SELECT
  et.name_he,
  COUNT(elt.exercise_id) AS usage_count
FROM exercise_tags et
LEFT JOIN exercise_library_tags elt ON et.id = elt.tag_id
GROUP BY et.id, et.name_he
ORDER BY usage_count DESC
LIMIT 10;
```

---

## 🐛 Troubleshooting

### Error: "Missing required environment variables"

**Solution:**
```bash
# Check file exists
ls -la apps/web/.env.local

# Make sure it contains:
# NEXT_PUBLIC_SUPABASE_URL="..."
# SUPABASE_SERVICE_ROLE_KEY="..."
```

### Error: "relation 'exercise_library' does not exist"

**Solution:** Run migrations 004 and 005 in Supabase SQL Editor

### Error: "invalid regular expression: invalid escape \ sequence"

**Solution:**
1. Drop the existing function:
   ```sql
   DROP FUNCTION IF EXISTS public.generate_exercise_slug() CASCADE;
   ```
2. Re-run migration 004

---

**✨ You're all set! Happy importing! 🏋️**
