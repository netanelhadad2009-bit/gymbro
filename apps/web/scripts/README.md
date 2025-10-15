# Exercise Import Script

This script imports exercises from a JSON file into the Supabase database.

## Prerequisites

1. **Environment Variables**: Set these in your `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Database Setup**: Run migrations first:
   - `002_exercise_library.sql`
   - `003_exercise_storage_buckets.sql`

3. **Dependencies**: Install tsx for TypeScript execution:
   ```bash
   pnpm add -D tsx
   ```

## JSON File Format

Place your exercises JSON file at `apps/web/data/exercises_library.json`:

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
      "tags": ["חזה", "לחיצה", "קומפאונד"]
    }
  ]
}
```

### Required Fields
- `name_he` (string): Exercise name in Hebrew
- `primary_muscle` (string): Main target muscle

### Optional Fields
- `description_he` (string): Detailed description
- `secondary_muscles` (array): Additional muscles worked
- `equipment` (string): Required equipment
- `difficulty` (enum): `beginner`, `intermediate`, or `advanced`
- `sets_default` (number): Default number of sets
- `reps_default` (string): Default reps (e.g., "8-12")
- `tempo_default` (string): Tempo notation (e.g., "2-0-2")
- `rest_seconds_default` (number): Rest time in seconds
- `video_url` (string): Video URL (can be empty)
- `thumb_url` (string): Thumbnail URL (can be empty)
- `tags` (array): Array of tag strings

## Usage

### Basic Usage (default file path)
```bash
cd apps/web
pnpm tsx scripts/import_exercises.ts
```

### Custom File Path
```bash
pnpm tsx scripts/import_exercises.ts path/to/your/exercises.json
```

### With Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=yyy pnpm tsx scripts/import_exercises.ts
```

## How It Works

1. **Load JSON**: Reads and parses the exercises file
2. **Validation**: Checks required fields for each exercise
3. **Duplicate Check**: Skips exercises with duplicate `name_he`
4. **Insert Exercise**: Creates record in `exercise_library` table
5. **Process Tags**: Creates/links tags in `exercise_tags` and `exercise_library_tags`
6. **Summary Report**: Shows import statistics

## Output Example

```
🏋️  GymBro Exercise Library Import

============================================================

📂 Loading exercises from: /path/to/exercises_library.json
✅ Loaded 47 exercises from file

🔄 Starting import...

[1/47] Processing: "לחיצת חזה במוט שטוח"
   ✅ Imported: "לחיצת חזה במוט שטוח"
[2/47] Processing: "סקוואט חזיתי"
   ✅ Imported: "סקוואט חזיתי"
[3/47] Processing: "משיכות עליונות רחבות"
   ⏭️  Skipping "משיכות עליונות רחבות": Already exists
...

============================================================
📊 Import Summary
============================================================
Total exercises in file: 47
✅ Successfully imported: 45
⏭️  Skipped (duplicates/invalid): 2
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

✨ Import complete!
```

## Idempotency

The script is **idempotent** - running it multiple times is safe:
- Checks for existing exercises by `name_he`
- Skips duplicates automatically
- Only creates new tags that don't exist
- Won't create duplicate entries

## Error Handling

### Common Errors

**Missing Environment Variables**
```
❌ Missing environment variables:
   NEXT_PUBLIC_SUPABASE_URL: false
   SUPABASE_SERVICE_ROLE_KEY: false
```
→ Set the required environment variables

**File Not Found**
```
❌ Error loading file: File not found: /path/to/file.json
```
→ Check the file path is correct

**Invalid Exercise Data**
```
⚠️  Skipping "תרגיל לא תקין": Missing name_he
```
→ Ensure all required fields are present

**Database Connection Error**
```
❌ Failed to import "תרגיל": Connection timeout
```
→ Check Supabase URL and service role key are correct

## Troubleshooting

### Script Exits with Code 1
- Check the summary for failed exercises
- Review error messages for each failure
- Verify database connection and permissions

### Tags Not Created
- Tags are created automatically from the `tags` array
- If a tag fails, the exercise still imports
- Check console for tag-specific warnings

### Exercises Marked as Skipped
- Exercise with same `name_he` already exists
- Validation failed (missing required fields)
- Review the "Skipped Exercises" section in output

## Post-Import Steps

1. **Verify Import**: Check `/exercises` page in the app
2. **Set Admin Flag**: Grant yourself admin access:
   ```sql
   UPDATE public.profiles SET is_admin = true WHERE id = 'YOUR_USER_ID';
   ```
3. **Add Media**: Upload videos/thumbnails via `/exercises/admin`
4. **Test Integration**: Try selecting exercises in workout builder

## Advanced Usage

### Import from Multiple Files
```bash
# Import base exercises
pnpm tsx scripts/import_exercises.ts data/base_exercises.json

# Import advanced exercises
pnpm tsx scripts/import_exercises.ts data/advanced_exercises.json
```

### Dry Run (Check Without Importing)
Modify the script to add a `--dry-run` flag if needed.

## Support

For issues:
1. Check console output for detailed error messages
2. Verify database schema is up to date (migrations run)
3. Check RLS policies allow service role access
4. Review Supabase logs in dashboard
