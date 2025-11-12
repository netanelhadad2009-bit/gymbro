# Avatars Migration: Complete Implementation Summary

**Status:** ✅ Ready to Apply
**Breaking Change:** Yes (deprecates `user_avatar` system)
**Estimated Time:** 10 minutes
**Risk Level:** Low (has fallback mechanism)

---

## 📦 **What's Included**

This migration provides everything needed to switch from the complex avatar ID system to a simple persona-based system:

1. ✅ **SQL Migration** - Idempotent, RLS-enabled, with verification
2. ✅ **Code Updates** - Already applied in SignupClient and Journey API
3. ✅ **Persona Normalization** - Handles edge cases like "results" → "knowledge"
4. ✅ **Verification Script** - Automated testing of different personas
5. ✅ **Documentation** - Complete guides and troubleshooting
6. ✅ **Runbook** - Step-by-step commands

## 🛡️ **Two-Layer Protection Against Constraint Violations**

We've implemented **dual protection** to prevent CHECK constraint errors:

### Layer 1: Code-Side Normalization (Primary)
- **File:** `apps/web/lib/persona/normalize.ts`
- **Purpose:** Map non-canonical values to canonical ones
- **Examples:**
  - `"results"` → `"knowledge"`
  - `"novice"` → `"beginner"`
  - `"plant_based"` → `"vegan"`
  - `"moderate"` → `"medium"`
- **When:** Always runs before database insert
- **Benefit:** Ensures journey logic always receives predictable values

### Layer 2: Relaxed CHECK Constraint (Safety Net)
- **Migration:** `supabase/migrations/20251103_update_avatars_experience_check.sql`
- **Purpose:** Allow `"results"` in database (legacy/edge case support)
- **When:** If normalization is bypassed or fails
- **Benefit:** Prevents hard failures, allows system to continue

**Why Both?**
- **Normalization ensures consistency** for journey generation
- **Relaxed constraint prevents crashes** if edge cases slip through
- **Defense in depth** - multiple layers of protection

---

## 🎯 **The Change**

### Before: Complex Avatar System
```typescript
// user_avatar table
{
  user_id: "abc123",
  avatar_id: "avatar_001",      // ← Predefined avatar archetype
  confidence: 85,
  matched_rules: ["rule1", "rule2"],
  reasons: ["Matches cutting profile"]
}
```

### After: Simple Persona System
```typescript
// avatars table
{
  user_id: "abc123",
  gender: "male",               // ← Direct attributes
  goal: "cut",
  diet: "keto",
  frequency: "high",
  experience: "intermediate"
}
```

---

## 📋 **Quick Start**

```bash
# 1. Apply SQL Migration (paste into Supabase SQL Editor)
cat supabase/migrations/20251103_migrate_to_avatars_personas.sql | pbcopy
open "https://app.supabase.com/project/ivzltlqsjrikffssyvbr/sql/new"
# Paste and run (Cmd+V, Cmd+Enter)

# 2. Wait for schema cache reload
sleep 30

# 3. Regenerate types
supabase gen types typescript --project-id ivzltlqsjrikffssyvbr > apps/web/lib/database.types.ts

# 4. Restart dev server
pkill -f "pnpm.*dev" && pnpm --filter @gymbro/web dev

# 5. Verify
pnpm --filter @gymbro/web exec tsx scripts/verify-avatars-migration.ts
```

---

## 📄 **Files Changed**

### ✅ Already Updated (Previous Work)
- `apps/web/app/signup/SignupClient.tsx` - Uses individual columns, upserts to avatars
- `apps/web/app/api/journey/plan/route.ts` - Queries avatars with individual columns

### ✨ New Files Created
- `supabase/migrations/20251103_migrate_to_avatars_personas.sql` - Database migration
- `apps/web/scripts/verify-avatars-migration.ts` - Verification script
- `docs/AVATARS_MIGRATION.md` - Complete migration guide
- `docs/AVATARS_MIGRATION_RUNBOOK.md` - Step-by-step runbook
- `docs/AVATARS_MIGRATION_SUMMARY.md` - This file

### ⚠️ Files That Reference user_avatar (Not Changed)
These files are part of the old avatar system and are now **deprecated**:
- `apps/web/app/api/avatar/bootstrap/route.ts` - Old avatar resolver (not used with new signup flow)
- `apps/web/app/api/avatar/route.ts` - Old avatar API (not used with new signup flow)
- `apps/web/app/api/journey/plan/bootstrap/route.ts` - Old journey bootstrap (not used)
- `apps/web/lib/avatar/client.ts` - Old avatar client (not used)
- `apps/web/app/api/debug/journey/route.ts` - Debug endpoint (optional)

**Recommendation:** These can be deleted after confirming the new system works, but leaving them doesn't cause issues since they're not in the signup flow anymore.

---

## 🗃️ **Database Schema**

### New Table: `public.avatars`

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

-- RLS Policies
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "avatars_select_own" ON public.avatars
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "avatars_insert_own" ON public.avatars
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "avatars_update_own" ON public.avatars
  FOR UPDATE USING (auth.uid() = user_id);
```

---

## 🔍 **How It Works**

### Signup Flow
```
User completes onboarding
  ↓
SignupClient.ensureAvatar()
  ↓
Upsert to public.avatars with individual columns
  ↓
Logs: "[Signup] ensureAvatar created new avatar: <user_id>"
```

### Journey Generation Flow
```
User navigates to /journey
  ↓
GET /api/journey/plan
  ↓
Query public.avatars by user_id
  ↓
If found: Use avatar columns
If not found: Fallback to metadata/profile
  ↓
buildJourneyFromPersona(persona)
  ↓
Return personalized journey nodes
  ↓
Logs: "[JourneyAPI] persona_source: 'avatar'"
```

### Persona → Journey Mapping

```typescript
// Example: Male + Cut + Keto + High + Intermediate
{
  gender: 'male',        // → 120g protein target (vs 90g for female)
  goal: 'cut',           // → Adds calorie_deficit_day node
  diet: 'keto',          // → Adds keto_day node (< 30g carbs)
  frequency: 'high',     // → Adds workout_3x_week node
  experience: 'intermediate'  // → Adds week_streak_7 node
}

// Result: 7 nodes (basics + goal + diet + frequency + experience)
```

---

## ✅ **Acceptance Criteria**

### Must Pass:
- [ ] SQL migration runs without errors
- [ ] `public.avatars` table exists with 6 persona columns
- [ ] RLS enabled with 3 policies
- [ ] Verification script passes all tests
- [ ] Logs show `persona_source: 'avatar'` (not `'metadata_fallback'`)
- [ ] Male users get 120g protein, female users get 90g
- [ ] Different personas generate different node counts (4-7 nodes, not 2-3 seed nodes)
- [ ] Keto users see keto_day node
- [ ] Vegan users see vegan_protein_sources node

### Should Pass:
- [ ] No TypeScript compilation errors
- [ ] No references to `user_avatar` in critical code paths
- [ ] Supabase Table Editor shows avatars table
- [ ] Two test signups with different personas work correctly

---

## 🧪 **Expected Test Results**

### Verification Script Output:
```
🧪 AVATARS MIGRATION VERIFICATION
==================================

✅ All required columns present: user_id, gender, goal, diet, frequency, experience
✅ RLS policies check passed
✅ Male Keto Cutter (High Freq, Intermediate): Nodes: 7, Points: 185
✅ Female Vegan Weight Loss (Low Freq, Beginner): Nodes: 5, Points: 100
✅ Male Bulking Balanced (Medium Freq, Advanced): Nodes: 6, Points: 145
✅ PASS: Different personas generate different journey node counts
✅ ALL TESTS PASSED
```

### Manual Signup Logs:
```
[Signup] ensureAvatar start
[Signup] No avatar found, creating new one
[Signup] Creating avatar with persona: { gender: 'male', goal: 'cut', diet: 'keto', frequency: 'high', experience: 'intermediate' }
[Signup] ensureAvatar created new avatar: 9df0ca44
[JourneyAPI] Found avatar with persona: { source: 'avatar', gender: 'male', goal: 'cut', diet: 'keto', frequency: 'high', experience: 'intermediate' }
[JourneyAPI] Journey plan built: { persona_source: 'avatar', nodes: 7, nodeIds: ['weigh_in_today', 'log_2_meals', 'protein_min', 'cal_deficit_day', 'keto_day', 'workout_3x_week', 'week_streak_7'] }
```

---

## 🐛 **Common Issues & Fixes**

### Issue 1: PGRST205 - Table not found
**Fix:** Wait 30s or run `SELECT pg_notify('pgrst', 'reload schema');`

### Issue 2: All users get same nodes
**Fix:** Check avatar creation succeeded, verify `persona_source: 'avatar'` in logs

### Issue 3: Permission denied
**Fix:** Re-run RLS policy creation from migration

### Issue 4: TypeScript errors
**Fix:** Regenerate types with `supabase gen types typescript`

---

## 📚 **Documentation Links**

- **[AVATARS_MIGRATION.md](./AVATARS_MIGRATION.md)** - Complete migration guide with troubleshooting
- **[AVATARS_MIGRATION_RUNBOOK.md](./AVATARS_MIGRATION_RUNBOOK.md)** - Step-by-step commands
- **[JOURNEY_PERSONA.md](./JOURNEY_PERSONA.md)** - How persona attributes map to journey nodes
- **[PERSONA_JOURNEY_IMPLEMENTATION.md](./PERSONA_JOURNEY_IMPLEMENTATION.md)** - Journey builder documentation

---

## 🔄 **Rollback**

If needed:
```sql
DROP TABLE IF EXISTS public.avatars CASCADE;
```

Then revert code (though SignupClient already has fallback to metadata/profile).

---

## ✉️ **Support**

**Before the migration:**
- Review AVATARS_MIGRATION.md for full context
- Check acceptance criteria above
- Ensure you have Supabase access

**During the migration:**
- Follow AVATARS_MIGRATION_RUNBOOK.md step-by-step
- Check logs for success/error messages
- Run verification script

**After the migration:**
- Verify with 2 test signups
- Check Supabase Table Editor
- Monitor logs for `persona_source: 'avatar'`

---

## 🎉 **Success Indicators**

You'll know it worked when:

1. ✅ SQL migration shows "✓ SUCCESS" messages
2. ✅ Verification script passes all tests
3. ✅ New signups create avatar rows
4. ✅ Logs show `persona_source: 'avatar'`
5. ✅ Male/female users get different protein targets
6. ✅ Different personas get different journey nodes
7. ✅ No more "showing seed chapters" logs

**Congratulations! Your persona-driven journey system is live.** 🎊

