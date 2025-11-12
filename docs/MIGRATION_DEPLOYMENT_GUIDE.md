# Migration Deployment Guide: Avatars Table

This guide provides step-by-step instructions for deploying the avatars table migration to your Supabase project.

## Prerequisites

- Supabase CLI installed (`brew install supabase/tap/supabase`)
- Access to Supabase project (`ivzltlqsjrikffssyvbr`)
- Backup of current database (recommended)

## Migration Overview

**File:** `/Users/netanelhadad/Projects/gymbro/supabase/migrations/20251103_create_avatars_table.sql`

**What it does:**
- Creates `public.avatars` table with individual columns
- Adds CHECK constraints for data validation
- Enables Row Level Security (RLS)
- Creates RLS policies for authenticated users
- Adds auto-updating `updated_at` trigger
- Grants permissions to authenticated role

## Deployment Steps

### Step 1: Authenticate with Supabase

```bash
supabase login
```

This will open a browser window for authentication. Follow the prompts to sign in.

### Step 2: Link to Your Project

```bash
cd /Users/netanelhadad/Projects/gymbro
supabase link --project-ref ivzltlqsjrikffssyvbr
```

You may be prompted to enter your database password. This can be found in:
- Supabase Dashboard → Settings → Database → Connection string

### Step 3: Review Migration

Before applying, review the migration file to ensure it matches your requirements:

```bash
cat supabase/migrations/20251103_create_avatars_table.sql
```

**Key points to verify:**
- Table name: `public.avatars`
- Columns: `user_id`, `gender`, `goal`, `diet`, `frequency`, `experience`
- CHECK constraints match your valid values
- RLS policies are correct

### Step 4: Check for Conflicts

Check if there are any pending local migrations or conflicts:

```bash
supabase db diff
```

This should show the new avatars table as a pending change.

### Step 5: Apply Migration

Apply the migration to your remote database:

```bash
supabase db push
```

**Expected output:**
```
Applying migration 20251103_create_avatars_table.sql...
✓ Migration applied successfully
```

**If you see errors:**
- `PGRST116`: Schema cache is reloading, wait 10-30 seconds and retry
- `42P07`: Table already exists, check if migration was already applied
- `42501`: Permission denied, verify you have admin access

### Step 6: Verify Migration

Verify the table was created correctly:

```bash
supabase db pull
```

Or check in Supabase Dashboard:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to Table Editor
4. Look for `avatars` table
5. Verify columns and constraints

### Step 7: Generate TypeScript Types

Generate updated TypeScript types from your database schema:

```bash
supabase gen types typescript --project-id ivzltlqsjrikffssyvbr > apps/web/lib/database.types.ts
```

**Verify the types include:**
```typescript
export interface Database {
  public: {
    Tables: {
      avatars: {
        Row: {
          user_id: string
          gender: string
          goal: string
          diet: string
          frequency: string
          experience: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          gender: string
          goal: string
          diet: string
          frequency: string
          experience: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          gender?: string
          goal?: string
          diet?: string
          frequency?: string
          experience?: string
          created_at?: string
          updated_at?: string
        }
      }
      // ... other tables
    }
  }
}
```

### Step 8: Test with Real User

Create a test user to verify the system works end-to-end:

1. **Sign up a new user** with specific persona attributes
2. **Check the logs** in your terminal (if dev server running) or in Supabase Dashboard → Logs
3. **Verify avatar creation:**
   ```
   [Signup] Avatar upserted successfully
   ```
4. **Call the journey API** and verify persona source:
   ```
   [JourneyAPI] Found avatar with persona: { source: 'avatar', gender: 'male', goal: 'cut', ... }
   [JourneyAPI] Journey plan built: { persona_source: 'avatar', nodes: 7, ... }
   ```

### Step 9: Monitor Persona Source

After deployment, monitor the `persona_source` field in API responses to track adoption:

```bash
# In dev environment
grep "persona_source" apps/web/.next/server/app/api/journey/plan/route.js
```

**Expected behavior:**
- **Before migration:** All responses show `persona_source: 'metadata_fallback'`
- **After migration (new users):** New signups show `persona_source: 'avatar'`
- **After migration (existing users):** Still show `persona_source: 'metadata_fallback'` (until backfilled)

## Optional: Backfill Existing Users

If you want to migrate existing users from profiles to avatars table:

```sql
-- Run this in Supabase SQL Editor
INSERT INTO public.avatars (user_id, gender, goal, diet, frequency, experience)
SELECT
  id AS user_id,
  COALESCE(gender, 'male') AS gender,
  COALESCE(goal, 'recomp') AS goal,
  COALESCE(diet, 'balanced') AS diet,
  COALESCE(training_frequency_actual, 'medium') AS frequency,
  COALESCE(experience, 'beginner') AS experience
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.avatars)
  AND id IN (SELECT id FROM auth.users)
ON CONFLICT (user_id) DO NOTHING;
```

**⚠️ Important:**
- Review this query in a test environment first
- Verify the column mappings match your `profiles` table schema
- Check that all values satisfy the CHECK constraints
- Run during low-traffic period

## Rollback Plan

If you need to rollback the migration:

### Option 1: Drop the Table (Non-Destructive)

Since the system has a fallback mechanism, you can simply drop the table:

```sql
DROP TABLE IF EXISTS public.avatars CASCADE;
```

The system will automatically fall back to using metadata/profiles.

### Option 2: Disable RLS Policies

If there are issues with RLS policies:

```sql
-- Disable specific policy
DROP POLICY "Users can read own avatar" ON public.avatars;

-- Or disable RLS entirely (not recommended for production)
ALTER TABLE public.avatars DISABLE ROW LEVEL SECURITY;
```

### Option 3: Revert Migration

```bash
# This will revert the last migration
supabase db reset
```

**⚠️ Warning:** This will reset the entire database to the last known state. Only use in development.

## Troubleshooting

### Issue: PGRST205 - Table not found

**Symptoms:**
```
[Signup] avatars table missing (PGRST205); falling back to metadata persona
```

**Cause:** PostgREST schema cache hasn't refreshed yet (10-30 second delay)

**Solution:**
1. Wait 30 seconds and try again
2. Or manually reload schema cache:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
3. Or restart PostgREST (in Supabase Dashboard → Settings → API → Restart)

### Issue: RLS Policy Denies Access

**Symptoms:**
```
[Signup] Avatar upsert failed: new row violates row-level security policy
```

**Cause:** RLS policy preventing insert/update

**Solution:**
1. Verify user is authenticated: Check `auth.uid()` is not null
2. Check policy conditions in Supabase Dashboard → Authentication → Policies
3. Verify `user_id` matches `auth.uid()`

### Issue: CHECK Constraint Violation

**Symptoms:**
```
[Signup] Avatar upsert failed: new row violates check constraint "avatars_gender_check"
```

**Cause:** Invalid value for constrained column

**Solution:**
1. Verify metadata values match CHECK constraints
2. Check the constraint values in migration file
3. Update `ensureAvatar()` to map values correctly:
   ```typescript
   // Map invalid values to valid ones
   const goal = normalizeGoal(meta.goal); // 'loss' → 'cut'
   ```

### Issue: Permission Denied

**Symptoms:**
```
permission denied for table avatars
```

**Cause:** Missing GRANT statements or wrong role

**Solution:**
1. Verify GRANT statements in migration:
   ```sql
   GRANT SELECT, INSERT, UPDATE ON public.avatars TO authenticated;
   ```
2. Check user's role: Should be `authenticated`
3. Re-apply GRANT statements in SQL Editor

## Verification Checklist

After deployment, verify these behaviors:

- [ ] New user signup creates avatar row
- [ ] API returns `persona_source: 'avatar'` for new users
- [ ] API returns `persona_source: 'metadata_fallback'` for old users
- [ ] Different personas generate different journey nodes
- [ ] Male users get 120g protein target
- [ ] Female users get 90g protein target
- [ ] Vegan diet adds vegan protein node
- [ ] Keto diet adds keto compliance node
- [ ] Cut goal adds calorie deficit node
- [ ] Bulk goal adds calorie surplus node
- [ ] RLS policies prevent users from seeing others' avatars
- [ ] Updated_at trigger updates timestamp on changes

## Monitoring

### Metrics to Track

1. **Persona Source Distribution**
   ```sql
   -- Query your analytics or logs
   SELECT persona_source, COUNT(*)
   FROM journey_api_logs
   GROUP BY persona_source;
   ```

2. **Avatar Table Growth**
   ```sql
   SELECT COUNT(*) FROM public.avatars;
   ```

3. **Node Distribution**
   ```sql
   -- Track which nodes are most common
   -- Query your journey progression table
   ```

### Logs to Watch

**Successful avatar creation:**
```
[Signup] Avatar upserted successfully
[JourneyAPI] Found avatar with persona: { source: 'avatar', ... }
```

**Fallback to metadata:**
```
[Signup] avatars table missing (PGRST205); falling back to metadata persona
[JourneyAPI] No avatar found for user; using metadata fallback
```

**Errors to investigate:**
```
[Signup] Avatar upsert failed (non-fatal): { code: '...', message: '...' }
[JourneyAPI] Avatar fetch error (...); using metadata fallback
```

## Support

If you encounter issues during deployment:

1. **Check Supabase Logs:** Dashboard → Logs → Filter by "avatars"
2. **Review Migration File:** Ensure CHECK constraints are correct
3. **Test in Local Environment:** Use `supabase start` to test locally first
4. **Check Documentation:** See [PERSONA_JOURNEY_IMPLEMENTATION.md](./PERSONA_JOURNEY_IMPLEMENTATION.md)
5. **Verify Fallback Works:** System should never fail even if migration has issues

## Summary

This migration is **non-breaking** because:
- ✅ System has fallback to metadata/profiles
- ✅ PGRST205 error is handled gracefully
- ✅ Signup continues even if avatar creation fails
- ✅ API always returns a persona (avatar OR fallback)

You can deploy with confidence knowing the system will work before, during, and after the migration.
