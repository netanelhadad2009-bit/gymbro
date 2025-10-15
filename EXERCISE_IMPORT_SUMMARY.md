# Exercise Import Script - Complete Summary 🎯

## 📁 Files Created

### Import Infrastructure
1. **`apps/web/scripts/import_exercises.ts`** - Main import script
   - Validates exercise data
   - Checks for duplicates
   - Creates exercises and tags
   - Links exercises to tags
   - Provides detailed progress reporting

2. **`apps/web/scripts/README.md`** - Script documentation
   - Detailed usage instructions
   - Error handling guide
   - Troubleshooting tips

3. **`apps/web/data/exercises_library.example.json`** - Example data format
   - 3 sample exercises
   - Shows proper JSON structure
   - Hebrew text examples

### Documentation
4. **`EXERCISE_IMPORT_QUICKSTART.md`** - Quick start guide
   - Step-by-step instructions
   - Environment setup
   - Database verification
   - Troubleshooting checklist

5. **`EXERCISE_IMPORT_SUMMARY.md`** - This file
   - Overview of all deliverables
   - Usage examples
   - Command reference

### Configuration
6. **`apps/web/package.json`** - Updated with script
   - Added `import-exercises` command
   - Makes running import easier

---

## 🚀 Quick Usage

### One-Time Setup
```bash
# 1. Install tsx
cd gymbro/apps/web
pnpm add -D tsx

# 2. Set environment variables in .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 3. Run migrations in Supabase SQL Editor
# - 002_exercise_library.sql
# - 003_exercise_storage_buckets.sql

# 4. Place your JSON at apps/web/data/exercises_library.json
```

### Run Import
```bash
# Option 1: Using npm script
pnpm import-exercises

# Option 2: Direct tsx execution
pnpm tsx scripts/import_exercises.ts

# Option 3: Custom file path
pnpm tsx scripts/import_exercises.ts path/to/your/exercises.json
```

---

## 📊 What Gets Imported

From your `exercises_library.json`:

### Exercise Data
Each exercise creates one row in `exercise_library`:
```typescript
{
  id: uuid,                    // Auto-generated
  slug: string,                // Auto-generated from name_he
  name_he: string,             // From JSON
  description_he: string,      // From JSON
  primary_muscle: string,      // From JSON
  secondary_muscles: string[], // From JSON
  equipment: string,           // From JSON
  difficulty: enum,            // From JSON (beginner/intermediate/advanced)
  sets_default: number,        // From JSON
  reps_default: string,        // From JSON
  tempo_default: string,       // From JSON
  rest_seconds_default: number,// From JSON
  video_url: string,           // From JSON (can be empty)
  thumb_url: string,           // From JSON (can be empty)
  is_active: boolean,          // Default: true
  created_by: uuid,            // null (system import)
  created_at: timestamp,       // Auto-generated
  updated_at: timestamp        // Auto-generated
}
```

### Tags
For each unique tag in the `tags` array:
1. Creates row in `exercise_tags` (if doesn't exist)
2. Creates link in `exercise_library_tags` junction table

Example:
```json
{
  "tags": ["חזה", "לחיצה", "קומפאונד"]
}
```
Creates 3 tags (if new) and 3 junction table entries.

---

## ✅ Import Process Flow

```
1. Load JSON file
   ↓
2. Parse exercises array
   ↓
3. For each exercise:
   ├─ Validate required fields
   ├─ Check if already exists (by name_he)
   ├─ If duplicate → Skip
   ├─ If invalid → Skip + log error
   └─ If valid:
      ├─ Insert into exercise_library
      ├─ For each tag:
      │  ├─ Check if tag exists
      │  ├─ If not → Create tag
      │  └─ Create exercise_library_tags link
      └─ Log success
   ↓
4. Print summary report
```

---

## 📋 Expected Output

### Successful Import
```
🏋️  GymBro Exercise Library Import

============================================================

📂 Loading exercises from: /Users/you/Projects/gymbro/apps/web/data/exercises_library.json
✅ Loaded 47 exercises from file

🔄 Starting import...

[1/47] Processing: "לחיצת חזה במוט שטוח"
   ✅ Imported: "לחיצת חזה במוט שטוח"
[2/47] Processing: "סקוואט חזיתי"
   ✅ Imported: "סקוואט חזיתי"
[3/47] Processing: "משיכות עליונות רחבות"
   ✅ Imported: "משיכות עליונות רחבות"
...
[47/47] Processing: "פלאנק"
   ✅ Imported: "פלאנק"

============================================================
📊 Import Summary
============================================================
Total exercises in file: 47
✅ Successfully imported: 47
⏭️  Skipped (duplicates/invalid): 0
❌ Failed: 0
🏷️  New tags created: 23
============================================================

📝 Preview of Imported Exercises (first 3):
   - לחיצת חזה במוט שטוח
     שריר: חזה | קושי: intermediate
     ברירת מחדל: 4 × 8-12
     ID: 123e4567-e89b-12d3-a456-426614174000

   - סקוואט חזיתי
     שריר: רגליים | קושי: advanced
     ברירת מחדל: 4 × 6-10
     ID: 223e4567-e89b-12d3-a456-426614174001

   - משיכות עליונות רחבות
     שריר: גב | קושי: beginner
     ברירת מחדל: 3 × 10-12
     ID: 323e4567-e89b-12d3-a456-426614174002

✨ Import complete!
```

### Re-running (All Skipped)
```
🏋️  GymBro Exercise Library Import

============================================================

📂 Loading exercises from: /path/to/exercises_library.json
✅ Loaded 47 exercises from file

🔄 Starting import...

[1/47] Processing: "לחיצת חזה במוט שטוח"
   ⏭️  Skipping "לחיצת חזה במוט שטוח": Already exists
[2/47] Processing: "סקוואט חזיתי"
   ⏭️  Skipping "סקוואט חזיתי": Already exists
...

============================================================
📊 Import Summary
============================================================
Total exercises in file: 47
✅ Successfully imported: 0
⏭️  Skipped (duplicates/invalid): 47
❌ Failed: 0
🏷️  New tags created: 0
============================================================

⏭️  Skipped Exercises:
   - לחיצת חזה במוט שטוח (Already exists)
   - סקוואט חזיתי (Already exists)
   ...

✨ Import complete!
```

---

## 🔍 Verification Queries

After import, verify with these SQL queries:

### Count Exercises
```sql
SELECT COUNT(*) as total_exercises FROM exercise_library;
-- Expected: 47
```

### Count Tags
```sql
SELECT COUNT(*) as total_tags FROM exercise_tags;
-- Expected: ~20-30 (depends on your data)
```

### Count Exercise-Tag Links
```sql
SELECT COUNT(*) as total_links FROM exercise_library_tags;
-- Expected: ~200-250 (depends on tags per exercise)
```

### Preview Exercises
```sql
SELECT
  id,
  name_he,
  primary_muscle,
  difficulty,
  sets_default,
  reps_default
FROM exercise_library
ORDER BY created_at DESC
LIMIT 5;
```

### Top Tags
```sql
SELECT
  et.name_he,
  COUNT(elt.exercise_id) as usage_count
FROM exercise_tags et
LEFT JOIN exercise_library_tags elt ON et.id = elt.tag_id
GROUP BY et.id, et.name_he
ORDER BY usage_count DESC
LIMIT 10;
```

### Exercises by Muscle Group
```sql
SELECT
  primary_muscle,
  COUNT(*) as count
FROM exercise_library
GROUP BY primary_muscle
ORDER BY count DESC;
```

---

## 🎯 Key Features

### ✅ Idempotent
- Safe to run multiple times
- Automatically skips duplicates
- Won't create duplicate tags

### ✅ Validated
- Checks required fields (name_he, primary_muscle)
- Validates difficulty enum
- Logs validation errors

### ✅ Atomic per Exercise
- Each exercise import is independent
- One failure doesn't stop the whole import
- Failed exercises are logged separately

### ✅ Detailed Reporting
- Real-time progress display
- Summary statistics
- Preview of imported data
- Lists of skipped/failed exercises

### ✅ Tag Management
- Auto-creates tags from array
- Reuses existing tags
- Creates junction table entries
- Counts new tags created

---

## 🚨 Error Handling

The script handles these scenarios gracefully:

### Missing File
```
❌ Error loading file: File not found: ./data/exercises_library.json
```
**Action:** Exits immediately

### Missing Environment Variables
```
❌ Missing environment variables:
   NEXT_PUBLIC_SUPABASE_URL: false
   SUPABASE_SERVICE_ROLE_KEY: false
```
**Action:** Exits immediately

### Invalid JSON
```
❌ Error loading file: Unexpected token in JSON
```
**Action:** Exits immediately

### Missing Required Fields
```
⚠️  Skipping "תרגיל": Missing name_he
```
**Action:** Skips exercise, continues with next

### Duplicate Exercise
```
⏭️  Skipping "תרגיל": Already exists
```
**Action:** Skips exercise, continues with next

### Database Error
```
❌ Failed to import "תרגיל": Connection timeout
```
**Action:** Logs error, continues with next exercise

### Tag Creation Error
```
⚠️  Error creating tag "תג": Permission denied
```
**Action:** Logs warning, continues (exercise still imports)

---

## 📚 Related Documentation

- **Main Implementation Guide**: `EXERCISE_LIBRARY_IMPLEMENTATION.md`
- **Quick Start**: `EXERCISE_IMPORT_QUICKSTART.md`
- **Script README**: `apps/web/scripts/README.md`
- **Example Data**: `apps/web/data/exercises_library.example.json`
- **Database Migrations**: `apps/web/supabase/migrations/`

---

## 🎓 Usage Patterns

### First-Time Import
```bash
# 1. Prepare environment
cd gymbro/apps/web
pnpm add -D tsx

# 2. Set up database
# (run migrations in Supabase)

# 3. Add your data
# Place exercises_library.json in data/

# 4. Run import
pnpm import-exercises

# 5. Verify
# Check /exercises page in app
```

### Incremental Updates
```bash
# Add new exercises to JSON
# (existing ones will be skipped)

pnpm import-exercises
# Only new exercises are imported
```

### Bulk Update (Replace All)
```bash
# 1. Delete existing exercises
# SQL: DELETE FROM exercise_library;

# 2. Re-run import with updated JSON
pnpm import-exercises
```

### Import from Multiple Sources
```bash
# Import base exercises
pnpm tsx scripts/import_exercises.ts data/base_exercises.json

# Import specialized exercises
pnpm tsx scripts/import_exercises.ts data/advanced_exercises.json

# Import equipment-specific exercises
pnpm tsx scripts/import_exercises.ts data/dumbbell_exercises.json
```

---

## 🎁 Bonus: Post-Import Enhancements

### Add Videos & Thumbnails
After importing, enhance exercises:

1. **Via Admin UI**: `/exercises/admin` → Edit → Upload files
2. **Via SQL**: Bulk update URLs
   ```sql
   UPDATE exercise_library
   SET video_url = 'https://...',
       thumb_url = 'https://...'
   WHERE name_he = 'לחיצת חזה במוט שטוח';
   ```

### Mark Exercises as Featured
```sql
-- Add featured flag if you want
ALTER TABLE exercise_library ADD COLUMN featured boolean DEFAULT false;

UPDATE exercise_library
SET featured = true
WHERE name_he IN ('לחיצת חזה במוט שטוח', 'סקוואט חזיתי', 'משיכות');
```

### Export for Backup
```sql
-- Export exercises to JSON
COPY (
  SELECT json_agg(row_to_json(t))
  FROM (
    SELECT name_he, description_he, primary_muscle, secondary_muscles,
           equipment, difficulty, sets_default, reps_default,
           tempo_default, rest_seconds_default, video_url, thumb_url
    FROM exercise_library
    ORDER BY name_he
  ) t
) TO '/tmp/exercises_backup.json';
```

---

## ✨ Summary

You now have:
- ✅ Complete import script with error handling
- ✅ Comprehensive documentation
- ✅ Example data format
- ✅ Quick start guide
- ✅ Verification queries
- ✅ npm script integration

**Ready to import your 47 exercises!** 🏋️💪

---

## 🙋 FAQ

**Q: Can I run this script multiple times?**
A: Yes! It's idempotent. Duplicate exercises are automatically skipped.

**Q: What if some exercises fail to import?**
A: The script continues with remaining exercises. Failed ones are logged in the summary.

**Q: Do I need to create tags manually?**
A: No! Tags are auto-created from the `tags` array in your JSON.

**Q: Can I import exercises in batches?**
A: Yes! Create separate JSON files and run the script multiple times.

**Q: What if my JSON format is slightly different?**
A: The script expects the exact format shown in the example. You may need to transform your data first.

**Q: Can I undo an import?**
A: Run `DELETE FROM exercise_library;` in SQL. This also deletes associated tags (via CASCADE).

**Q: How do I update existing exercises?**
A: Delete them first, then re-import. Or use the admin UI to edit manually.

---

**Need help?** Check `EXERCISE_IMPORT_QUICKSTART.md` for detailed troubleshooting! 🚀
