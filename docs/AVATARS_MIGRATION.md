# Avatars Migration: From user_avatar to Persona-Based Avatars

**Date:** 2025-11-03
**Status:** ✅ Ready to Apply
**Breaking Change:** Yes (deprecates `user_avatar` table)

---

## 🎯 **Objective**

Migrate from the complex avatar ID system (`user_avatar` table with `avatar_id` assignments) to a simpler **persona-based system** using direct user attributes stored in `public.avatars`.

### **Before (Old System)**
- Table: `public.user_avatar`
- Columns: `user_id`, `avatar_id` (e.g., "avatar_001"), `confidence`, `matched_rules`, `reasons`
- Journey generation: Lookup avatar by ID, then apply avatar-specific rules

### **After (New System)**
- Table: `public.avatars`
- Columns: `user_id`, `gender`, `goal`, `diet`, `frequency`, `experience`
- Journey generation: Build directly from persona attributes

---

## 📋 **Why This Change**

1. **Simplicity**: Direct persona attributes are easier to understand and maintain
2. **Flexibility**: No need to pre-define avatar archetypes
3. **Transparency**: User attributes directly map to journey nodes
4. **Debugging**: Easier to trace which persona attribute triggered which nodes
5. **Scalability**: Adding new attributes doesn't require new avatar definitions

---

## 🗄️ **Database Changes**

### **New Table: `public.avatars`**

```sql
CREATE TABLE public.avatars (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  goal text NOT NULL CHECK (goal IN ('loss', 'bulk', 'recomp', 'cut')),
  diet text NOT NULL CHECK (diet IN ('vegan', 'keto', 'balanced', 'vegetarian', 'paleo', 'none')),
  frequency text NOT NULL CHECK (frequency IN ('low', 'medium', 'high')),
  experience text NOT NULL CHECK (experience IN ('beginner', 'intermediate', 'advanced', 'knowledge', 'time')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### **Row Level Security (RLS)**

- `SELECT`: User can only read their own row
- `INSERT`: User can only insert their own row
- `UPDATE`: User can only update their own row

### **Triggers**

- Auto-updates `updated_at` timestamp on any UPDATE

---

## 📝 **Migration Steps**

### **Step 1: Backup (Optional but Recommended)**

```sql
-- Export existing user_avatar data if you need to preserve it
COPY (SELECT * FROM public.user_avatar) TO '/tmp/user_avatar_backup.csv' CSV HEADER;
```

### **Step 2: Apply SQL Migration**

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to your Supabase Dashboard → SQL Editor
2. Paste the contents of `supabase/migrations/20251103_migrate_to_avatars_personas.sql`
3. Click "Run" (or Cmd/Ctrl + Enter)
4. Wait for ~30 seconds for schema cache to reload
5. Verify success in the output (should see "✓ SUCCESS" messages)

**Option B: Via Supabase CLI**

```bash
# From project root
cd /Users/netanelhadad/Projects/gymbro
supabase login
supabase link --project-ref ivzltlqsjrikffssyvbr
supabase db push
```

### **Step 3: Verify Schema**

```sql
-- Check table exists
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'avatars';

-- Check columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'avatars'
ORDER BY ordinal_position;

-- Expected output:
-- user_id      | uuid                     | NO
-- gender       | text                     | NO
-- goal         | text                     | NO
-- diet         | text                     | NO
-- frequency    | text                     | NO
-- experience   | text                     | NO
-- created_at   | timestamp with time zone | NO
-- updated_at   | timestamp with time zone | NO
```

### **Step 4: Deploy Code Changes**

The code changes are minimal because `SignupClient.tsx` and `app/api/journey/plan/route.ts` were already updated to use the new schema. You just need to:

1. Restart your dev server (it should already pick up the updated code)
2. Clear any cached builds: `rm -rf .next && pnpm build`

### **Step 5: Regenerate TypeScript Types**

```bash
# Generate types from your Supabase schema
supabase gen types typescript --project-id ivzltlqsjrikffssyvbr > apps/web/lib/database.types.ts

# Or if you have local Supabase:
supabase gen types typescript --local > apps/web/lib/database.types.ts
```

### **Step 6: Run Verification Script**

```bash
pnpm --filter @gymbro/web exec tsx scripts/verify-avatars-migration.ts
```

**Expected Output:**
```
✅ All required columns present: user_id, gender, goal, diet, frequency, experience
✅ RLS policies check passed
✅ Male Keto Cutter (High Freq, Intermediate)
   Nodes: 7, Points: 185
✅ Female Vegan Weight Loss (Low Freq, Beginner)
   Nodes: 5, Points: 100
✅ ALL TESTS PASSED
```

### **Step 7: Test Manual Signup Flow**

1. Open your app: `http://localhost:3000`
2. Go through onboarding and sign up with these test personas:

**Test User 1: Male Keto Cutter**
- Gender: Male
- Goal: Cut
- Diet: Keto
- Frequency: High
- Experience: Intermediate

**Test User 2: Female Vegan Beginner**
- Gender: Female
- Goal: Weight Loss
- Diet: Vegan
- Frequency: Low
- Experience: Beginner

3. Check logs for:
```
[Signup] ensureAvatar created new avatar: <user_id>
[JourneyAPI] Found avatar with persona: { source: 'avatar', gender: 'male', goal: 'cut', ... }
[JourneyAPI] Journey plan built: { persona_source: 'avatar', nodes: 7 }
```

4. Navigate to `/journey` and verify:
   - Male user sees ~7 nodes including keto-specific nodes
   - Female user sees ~4-5 nodes with different nodes

### **Step 8: Check Supabase Table Editor**

1. Go to Supabase Dashboard → Table Editor
2. Find `avatars` table
3. Verify you see rows with individual columns (not a JSONB blob)
4. Try querying: `SELECT * FROM avatars;`

---

## 🔄 **Rollback Plan**

If something goes wrong, you can rollback:

```sql
-- Drop the new avatars table
DROP TABLE IF EXISTS public.avatars CASCADE;

-- Recreate user_avatar table (if you backed it up)
-- This is only needed if you want to go back to the old avatar system
CREATE TABLE public.user_avatar (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_id text NOT NULL,
  confidence integer NOT NULL,
  matched_rules text[] DEFAULT '{}',
  reasons text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Restore data from backup (if you made one)
\copy public.user_avatar FROM '/tmp/user_avatar_backup.csv' CSV HEADER;
```

**Then revert code changes:**
```bash
git checkout HEAD -- apps/web/app/signup/SignupClient.tsx
git checkout HEAD -- apps/web/app/api/journey/plan/route.ts
```

---

## ✅ **Acceptance Checklist**

- [ ] SQL migration runs without errors
- [ ] `public.avatars` table visible in Supabase Table Editor
- [ ] Table has 8 columns: `user_id`, `gender`, `goal`, `diet`, `frequency`, `experience`, `created_at`, `updated_at`
- [ ] RLS enabled on `avatars` table
- [ ] New signups create avatar rows
- [ ] Logs show `[Signup] ensureAvatar created new avatar`
- [ ] Logs show `[JourneyAPI] persona_source: 'avatar'`
- [ ] Different personas generate different node counts (not all getting 2-3 seed nodes)
- [ ] Male users get 120g protein target
- [ ] Female users get 90g protein target
- [ ] Keto users see keto-specific nodes
- [ ] Vegan users see vegan-specific nodes
- [ ] No references to `user_avatar` remain in codebase
- [ ] Verification script passes all tests
- [ ] TypeScript types regenerated
- [ ] No TypeScript compilation errors

---

## 🐛 **Troubleshooting**

### **Issue: PGRST205 - Table not found**

**Symptom:**
```
Could not find the table 'public.avatars' in the schema cache
```

**Solution:**
1. Wait 30 seconds for PostgREST schema cache to reload
2. Or manually trigger reload:
   ```sql
   SELECT pg_notify('pgrst', 'reload schema');
   ```
3. Or restart PostgREST from Supabase Dashboard → Settings → API → Restart

### **Issue: Permission denied for table avatars**

**Symptom:**
```
permission denied for table avatars
```

**Solution:**
Check RLS policies were created:
```sql
SELECT * FROM pg_policies WHERE tablename = 'avatars';
```

If missing, re-run the policy creation part of the migration:
```sql
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "avatars_select_own" ON public.avatars
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "avatars_insert_own" ON public.avatars
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "avatars_update_own" ON public.avatars
  FOR UPDATE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.avatars TO authenticated;
```

### **Issue: All users getting same journey nodes**

**Symptom:**
```
[JourneyAPI] No avatar chapters - showing seed chapters
```

**Solution:**
1. Check avatar was created:
   ```sql
   SELECT * FROM public.avatars WHERE user_id = '<your_user_id>';
   ```
2. If missing, check SignupClient logs for errors
3. Verify the upsert code is using individual columns (not `persona` JSONB)
4. Check API route logs for `persona_source: 'avatar'` vs `persona_source: 'metadata_fallback'`

### **Issue: TypeScript errors after migration**

**Symptom:**
```
Property 'avatars' does not exist on type 'Database'
```

**Solution:**
Regenerate types:
```bash
supabase gen types typescript --project-id ivzltlqsjrikffssyvbr > apps/web/lib/database.types.ts
```

---

## 📚 **Related Documentation**

- [Journey Persona System](./JOURNEY_PERSONA.md) - How persona attributes map to journey nodes
- [Timed Progress Implementation](./TIMED_PROGRESS_IMPLEMENTATION.md) - Progress animation system
- [Persona Journey Implementation](./PERSONA_JOURNEY_IMPLEMENTATION.md) - Full journey builder documentation

---

## 🎓 **Technical Notes**

### **Why Individual Columns Instead of JSONB?**

1. **Type Safety**: CHECK constraints enforce valid values at database level
2. **Query Performance**: Indexed columns are faster than JSONB queries
3. **Schema Clarity**: Explicit columns are self-documenting
4. **RLS Compatibility**: Can reference columns in policies
5. **Simpler Queries**: `SELECT gender, goal FROM avatars` vs `SELECT persona->>'gender', persona->>'goal' FROM avatars`

### **Migration from avatar_id to Persona**

If you need to preserve existing `user_avatar` data, you'll need a mapping function:

```sql
-- Example mapping (customize based on your avatar definitions)
CREATE OR REPLACE FUNCTION migrate_avatar_to_persona(avatar_id_val text)
RETURNS TABLE(gender text, goal text, diet text, frequency text, experience text) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN avatar_id_val IN ('avatar_001', 'avatar_003') THEN 'male'
      ELSE 'female'
    END,
    CASE
      WHEN avatar_id_val IN ('avatar_001') THEN 'cut'
      WHEN avatar_id_val IN ('avatar_002') THEN 'bulk'
      ELSE 'recomp'
    END,
    -- Add more mappings...
    'balanced'::text,
    'medium'::text,
    'beginner'::text;
END;
$$ LANGUAGE plpgsql;

-- Then migrate:
INSERT INTO public.avatars (user_id, gender, goal, diet, frequency, experience)
SELECT
  ua.user_id,
  (migrate_avatar_to_persona(ua.avatar_id)).*
FROM public.user_avatar ua
ON CONFLICT (user_id) DO NOTHING;
```

---

## ✉️ **Support**

If you encounter issues:
1. Check the troubleshooting section above
2. Review the verification script output
3. Check Supabase logs in Dashboard → Logs
4. Verify the SQL migration completed successfully
5. Check Next.js console for error messages

