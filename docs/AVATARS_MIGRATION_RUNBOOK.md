# Avatars Migration Runbook

**Quick Reference Guide for Applying the Avatars Migration**

---

## 🚀 **Quick Start (5 Minutes)**

```bash
# 1. Navigate to project root
cd /Users/netanelhadad/Projects/gymbro

# 2. Copy SQL to clipboard
cat supabase/migrations/20251103_migrate_to_avatars_personas.sql | pbcopy

# 3. Open Supabase Dashboard SQL Editor
open "https://app.supabase.com/project/ivzltlqsjrikffssyvbr/sql/new"

# 4. Paste and run SQL (Cmd+V, then Cmd+Enter)
# Wait for "✓ SUCCESS" messages

# 5. Wait 30 seconds for schema cache reload

# 6. Regenerate TypeScript types
supabase gen types typescript --project-id ivzltlqsjrikffssyvbr > apps/web/lib/database.types.ts

# 7. Restart dev server (if running)
# Kill existing dev servers first:
lsof -ti:3000 | xargs kill -9
pnpm --filter @gymbro/web dev

# 8. Run verification
pnpm --filter @gymbro/web exec tsx scripts/verify-avatars-migration.ts

# 9. Test manual signup
open "http://localhost:3000"
```

---

## 📋 **Detailed Steps**

### **Phase 1: Pre-Migration Checks**

```bash
# Check current database state
psql "$DATABASE_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('user_avatar', 'avatars');"

# Expected: user_avatar exists, avatars does not exist

# Check if dev server is running
lsof -i:3000

# Check for uncommitted code changes
git status
```

###  **Phase 2: Apply SQL Migration**

**Step 1: Open Supabase SQL Editor**
```bash
open "https://app.supabase.com/project/ivzltlqsjrikffssyvbr/sql/new"
```

**Step 2: Paste SQL**
```bash
# Copy migration SQL to clipboard
cat supabase/migrations/20251103_migrate_to_avatars_personas.sql | pbcopy
```

**Step 3: Execute**
- Paste into SQL Editor (Cmd+V)
- Click "Run" or press Cmd+Enter
- Wait for execution

**Step 4: Verify Output**
Look for these success messages:
```
NOTICE:  ✓ SUCCESS: public.avatars table created with 6 persona columns
NOTICE:  ✓ Columns: user_id, gender, goal, diet, frequency, experience
NOTICE:  ✓ RLS enabled with 3 policies (SELECT, INSERT, UPDATE)
NOTICE:  ✓ Auto-update trigger configured for updated_at
NOTICE:  ✓ PostgREST schema cache reload requested
```

**Step 5: Wait for Schema Cache Reload**
```bash
# Wait 30 seconds
sleep 30

# Or manually trigger reload via SQL:
psql "$DATABASE_URL" -c "SELECT pg_notify('pgrst', 'reload schema');"
```

### **Phase 3: Update Code & Types**

**Step 1: Regenerate TypeScript Types**
```bash
# Using Supabase CLI
supabase gen types typescript --project-id ivzltlqsjrikffssyvbr > apps/web/lib/database.types.ts

# Verify avatars type was generated
grep -A 10 "avatars:" apps/web/lib/database.types.ts
```

**Step 2: Check for Type Errors**
```bash
# Run TypeScript compiler
pnpm --filter @gymbro/web tsc --noEmit

# Expected: No errors related to avatars table
```

**Step 3: Restart Dev Server**
```bash
# Kill any existing dev servers
pkill -f "pnpm.*dev"

# Or more forceful:
lsof -ti:3000 | xargs kill -9

# Start fresh dev server
pnpm --filter @gymbro/web dev
```

### **Phase 4: Verification**

**Step 1: Run Automated Verification**
```bash
pnpm --filter @gymbro/web exec tsx scripts/verify-avatars-migration.ts
```

**Expected Output:**
```
🧪 AVATARS MIGRATION VERIFICATION
==================================

🔍 Step 1: Verifying avatars table schema...

✅ All required columns present: user_id, gender, goal, diet, frequency, experience

🔍 Step 2: Verifying RLS policies...

✅ RLS policies check passed

🔍 Step 3: Verifying persona-driven journey generation...

✅ Male Keto Cutter (High Freq, Intermediate)
   Nodes: 7, Points: 185
   Sample nodes: weigh_in_today, log_2_meals, protein_min...
✅ Female Vegan Weight Loss (Low Freq, Beginner)
   Nodes: 5, Points: 100
   Sample nodes: weigh_in_today, log_2_meals, protein_min...
✅ Male Bulking Balanced (Medium Freq, Advanced)
   Nodes: 6, Points: 145
   Sample nodes: weigh_in_today, log_2_meals, protein_min...

====================================================================================================
VERIFICATION SUMMARY
====================================================================================================

| Persona                        | Gender | Goal  | Diet       | Freq | Exp          | Nodes | Points | Status   |
|--------------------------------|--------|-------|------------|------|--------------|-------|--------|----------|
| Male Keto Cutter (High Freq... | male   | cut   | keto       | high | intermediate | 7     | 185    | ✅ PASS |
| Female Vegan Weight Loss (L... | female | loss  | vegan      | low  | beginner     | 5     | 100    | ✅ PASS |
| Male Bulking Balanced (Mediu... | male   | bulk  | balanced   | med  | advanced     | 6     | 145    | ✅ PASS |

✅ PASS: Different personas generate different journey node counts
✅ PASS: Both male and female personas tested

✅ ALL TESTS PASSED
```

**Step 2: Manual Signup Test**
```bash
# Open app
open "http://localhost:3000"
```

**Test User 1: Male Keto Cutter**
- Click "Get Started"
- Gender: Male
- Goals: Cut / Lose Fat
- Training Frequency: High (5-7x/week)
- Experience: Intermediate
- Diet: Keto
- Complete signup

**Check Logs:**
```bash
# Terminal should show:
[Signup] ensureAvatar created new avatar: 9df0ca44...
[JourneyAPI] Found avatar with persona: { source: 'avatar', gender: 'male', goal: 'cut', diet: 'keto', frequency: 'high', experience: 'intermediate' }
[JourneyAPI] Journey plan built: { persona_source: 'avatar', nodes: 7, nodeIds: [...] }
```

**Test User 2: Female Vegan Beginner**
- Sign out, sign up again
- Gender: Female
- Goals: Weight Loss
- Training Frequency: Low (1-2x/week)
- Experience: Beginner
- Diet: Vegan
- Complete signup

**Check Logs:**
```bash
[Signup] ensureAvatar created new avatar: addd2223...
[JourneyAPI] Found avatar with persona: { source: 'avatar', gender: 'female', goal: 'loss', diet: 'vegan', frequency: 'low', experience: 'beginner' }
[JourneyAPI] Journey plan built: { persona_source: 'avatar', nodes: 5, nodeIds: [...] }
```

**Step 3: Verify in Supabase Dashboard**
```bash
open "https://app.supabase.com/project/ivzltlqsjrikffssyvbr/editor"
```

- Go to Table Editor
- Find `avatars` table
- Should see 2 rows (one for each test user)
- Verify columns are populated with individual values (not JSON)

**Step 4: Query Database Directly**
```sql
-- Check avatar data
SELECT
  user_id,
  gender,
  goal,
  diet,
  frequency,
  experience,
  created_at
FROM public.avatars
ORDER BY created_at DESC
LIMIT 10;

-- Verify RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'avatars';
```

### **Phase 5: Post-Migration Checks**

**Check 1: No user_avatar References**
```bash
# Search for any remaining user_avatar references
grep -r "user_avatar" apps/web/app/ apps/web/lib/ --exclude-dir=node_modules --exclude-dir=.next

# Expected: No matches (or only in comments/docs)
```

**Check 2: Journey Personalization Works**
```bash
# Compare two different users' journeys
# User 1 (male/cut/keto) should have ~7 nodes
# User 2 (female/loss/vegan) should have ~4-5 nodes

# Check logs show different node IDs
grep "nodeIds" <your-dev-server-logs> | tail -2
```

**Check 3: Protein Targets**
```bash
# Male users should get 120g protein target
# Female users should get 90g protein target

# Check in journey builder logs or API responses
```

---

## 🔍 **What to Look For in Logs**

### **Success Indicators**

✅ **Signup Flow:**
```
[Signup] ensureAvatar start
[Signup] No avatar found, creating new one
[Signup] Creating avatar with persona: { gender: 'male', goal: 'cut', ... }
[Signup] ensureAvatar created new avatar: 9df0ca44
[Signup] Avatar ensured: { id: '9df0ca44', persona: { gender: 'male', ... } }
```

✅ **Journey API:**
```
[JourneyAPI] Found avatar with persona: { source: 'avatar', gender: 'male', goal: 'cut', diet: 'keto', frequency: 'high', experience: 'intermediate' }
[JourneyAPI] Journey plan built: { persona_source: 'avatar', nodes: 7 }
```

### **Failure Indicators**

❌ **PGRST204 Error:**
```
[Signup] Failed to insert avatar: PGRST204 - Could not find the 'persona' column
```
**Fix:** Re-run SQL migration (table has wrong schema)

❌ **PGRST205 Error:**
```
[Signup] Failed to insert avatar: PGRST205 - Could not find the table 'public.avatars'
```
**Fix:** Wait 30s for schema cache, or manually reload with `SELECT pg_notify('pgrst', 'reload schema');`

❌ **All Users Getting Same Nodes:**
```
[JourneyAPI] No avatar chapters - showing seed chapters
[JourneyAPI] persona_source: 'metadata_fallback'
```
**Fix:** Check avatar creation in signup logs, verify table exists

---

## ⏪ **Rollback Instructions**

If you need to rollback:

```bash
# 1. Drop new avatars table
psql "$DATABASE_URL" -c "DROP TABLE IF EXISTS public.avatars CASCADE;"

# 2. Revert code changes (if you made any beyond what's in this migration)
git checkout HEAD -- apps/web/app/signup/SignupClient.tsx
git checkout HEAD -- apps/web/app/api/journey/plan/route.ts

# 3. Restart dev server
pkill -f "pnpm.*dev"
pnpm --filter @gymbro/web dev
```

---

## 📞 **Support Checklist**

Before asking for help:

- [ ] SQL migration ran without errors
- [ ] Waited 30 seconds after running migration
- [ ] Verified `avatars` table exists in Supabase Table Editor
- [ ] Regenerated TypeScript types
- [ ] Restarted dev server
- [ ] Checked browser console for errors
- [ ] Checked dev server logs for error messages
- [ ] Ran verification script
- [ ] Tested manual signup with 2 different personas
- [ ] Checked Supabase logs in Dashboard

---

## 🎓 **Key Commands Reference**

```bash
# Apply migration
open "https://app.supabase.com/project/ivzltlqsjrikffssyvbr/sql/new"

# Regenerate types
supabase gen types typescript --project-id ivzltlqsjrikffssyvbr > apps/web/lib/database.types.ts

# Restart dev server
pkill -f "pnpm.*dev" && pnpm --filter @gymbro/web dev

# Run verification
pnpm --filter @gymbro/web exec tsx scripts/verify-avatars-migration.ts

# Check table schema
psql "$DATABASE_URL" -c "\\d public.avatars"

# Query avatars
psql "$DATABASE_URL" -c "SELECT * FROM public.avatars;"

# Reload schema cache
psql "$DATABASE_URL" -c "SELECT pg_notify('pgrst', 'reload schema');"

# Check for user_avatar references
grep -r "user_avatar" apps/web/ --exclude-dir=node_modules --exclude-dir=.next

# Test signup
open "http://localhost:3000"
```

---

## ✅ **Completion Checklist**

- [ ] SQL migration applied successfully
- [ ] "✓ SUCCESS" messages appeared in SQL output
- [ ] Waited 30 seconds for schema cache reload
- [ ] TypeScript types regenerated
- [ ] Dev server restarted
- [ ] Verification script passed all tests
- [ ] Manual signup test #1 (male/keto/cut) completed
- [ ] Manual signup test #2 (female/vegan/loss) completed
- [ ] Logs show `persona_source: 'avatar'`
- [ ] Different personas generate different node counts
- [ ] `avatars` table visible in Supabase Table Editor
- [ ] No `user_avatar` references in code
- [ ] No TypeScript compilation errors
- [ ] Journey page shows personalized nodes (not seed nodes)

**When all boxes are checked: ✅ MIGRATION COMPLETE**

