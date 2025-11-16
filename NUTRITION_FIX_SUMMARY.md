# Nutrition Plan Fix Summary

## Problem Identified

The nutrition plan generation was failing because:

1. **Watchdog Timer Too Aggressive**: The generating page had a 5-second watchdog that fired BEFORE the API call could complete
   - Hard timeout: 12 seconds
   - Watchdog: 5 seconds (TOO SHORT!)
   - Result: Watchdog fires → Creates pending draft → Navigates away → No real plan generated

## Fix Applied

### Fixed Watchdog Timer
**File**: [apps/web/app/onboarding/generating/page.tsx:194](apps/web/app/onboarding/generating/page.tsx#L194)

**Change**:
```typescript
// Before (TOO SHORT):
watchdogId = setTimeout(() => {
  console.warn('[Generating] Watchdog fired → forcing finish');
  forceContinue();
  finishAndGo();
}, 5000);  // ← 5 seconds

// After (FIXED):
// Watchdog: if we're still here 15s later, force finish
// (Set longer than HARD_TIMEOUT_MS to let proper timeout mechanism complete)
watchdogId = setTimeout(() => {
  console.warn('[Generating] Watchdog fired → forcing finish');
  forceContinue();
  finishAndGo();
}, 15000);  // ← 15 seconds (allows full 12s timeout + cleanup)
```

**Impact**:
- API now has full 12 seconds to complete
- Hard timeout mechanism works correctly
- Catch/finally blocks can execute properly
- Real nutrition plans should be generated successfully

---

## Required Next Steps

### Step 1: Apply Database Migration

The nutrition_calories column and other improvements need to be added to your database.

**Migration File**: [supabase/migrations/026_nutrition_calories.sql](supabase/migrations/026_nutrition_calories.sql)

#### Option A: Remote Supabase (Recommended if Docker not running)

```bash
# Navigate to project root
cd /Users/netanelhadad/Projects/gymbro

# Link to your remote Supabase project (if not already linked)
supabase link --project-ref <YOUR_PROJECT_REF>

# Apply migration
supabase db push

# Verify migration applied
supabase db reset --debug  # Optional: reapply all migrations
```

#### Option B: Manual SQL (If Supabase CLI unavailable)

1. Open Supabase Studio → SQL Editor
2. Copy the entire contents of `supabase/migrations/026_nutrition_calories.sql`
3. Paste and run the query
4. Verify success (should see "Success. No rows returned")

#### Verify Migration Applied

Run this query in Supabase Studio SQL Editor:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name LIKE 'nutrition%'
ORDER BY column_name;
```

**Expected Result** (should show 5 columns):
```
column_name           | data_type                   | is_nullable
----------------------|-----------------------------|-----------
nutrition_calories    | integer                     | YES
nutrition_fingerprint | text                        | YES
nutrition_plan        | jsonb                       | YES
nutrition_status      | text                        | YES
nutrition_updated_at  | timestamp with time zone    | YES
```

---

### Step 2: Test Complete Flow

#### A. Test New User Signup

1. **Clear browser data** (to simulate new user):
   ```
   - Open DevTools (F12)
   - Application → Local Storage → Delete all
   - Application → Session Storage → Delete all
   ```

2. **Go through onboarding**:
   - Navigate to `/onboarding`
   - Fill out profile information
   - Click "Generate Plan" or similar button

3. **Watch generating page**:
   - Should show progress bar
   - Should reach 40%
   - **Should wait full 12 seconds for API**
   - Watch console logs for `[Generating]` messages

4. **Complete signup**:
   - Enter email/password
   - Submit signup form
   - **Watch console logs for `[Attach]` messages**:
     ```
     [Attach] POST user=<uid> fp=<fingerprint>
     [Attach] Plan saved (fingerprint: <fp>)
     ```

5. **Verify nutrition tab**:
   - Navigate to `/nutrition` page
   - Should show nutrition plan (not error message)
   - Check console for `[Nutrition Plan] Plan retrieved successfully`

#### B. Test Existing User (With Pending Status)

If you have an existing user with no nutrition plan:

1. Get JWT token:
   - Open DevTools → Application → Local Storage
   - Find `supabase.auth.token`
   - Copy `access_token` value

2. Run verification script:
   ```bash
   cd /Users/netanelhadad/Projects/gymbro
   export JWT='<your-jwt-token-here>'
   ./verify_nutrition_e2e.sh
   ```

3. Check output:
   - Should show user ID extraction
   - Should test GET /api/nutrition/plan
   - If 404, will attempt manual attach
   - Should show final verification report

---

## Expected Console Logs

### Generating Page (Onboarding)

**Success Path** (API completes before 12s):
```
[Generating] Start: 10%
[Generating] POST /api/ai/nutrition (days=1): 40%
[Generating] Draft saved (full) → navigate now
[Generating] Cleanup complete
```

**Timeout Path** (API takes >12s):
```
[Generating] Start: 10%
[Generating] POST /api/ai/nutrition (days=1): 40%
[Generating] Error/Timeout → forcing finish TimeoutError: Request timed out after 12s
[Generating] Cleanup complete
```

**Watchdog Should NOT Fire** (unless something is seriously broken):
```
[Generating] Watchdog fired → forcing finish  ← Should NOT see this anymore!
```

### Signup Page

**With Draft**:
```
[Signup] Draft found: YES
[Signup] Avatar resolved: <avatarId> (confidence: 0.95)
[Attach] POST user=abc12345 fp=def67890abcd
[Attach] Plan saved (fingerprint: def67890abcd)
[Signup] Draft migrated
[Journey] Bootstrapped (chapters: 3)
[Signup] Redirecting to /journey
```

**Without Draft** (if generating timed out):
```
[Signup] Draft found: YES
[Attach] POST user=abc12345 fp=ghi12345jklm
[Attach] Server-side generate start (days=1)
[Attach] Server-side generate response status=success
[Attach] Parsed hasPlan=true days=1
[Attach] Plan saved (fingerprint: mno67890pqrs)
[Signup] Draft migrated
```

### Nutrition Tab

**With Plan**:
```
[Nutrition Plan] GET request for user abc12345
[Nutrition Plan] Plan retrieved successfully
```

**No Plan**:
```
[Nutrition Plan] GET request for user abc12345
[Nutrition Plan] No plan found for user abc12345 (status: pending)
```

---

## Troubleshooting

### Issue: Still getting "No nutrition plan found" error

**Check**:
1. ✅ Migration applied? (Run verification query above)
2. ✅ Watchdog timer fixed? (Check `generating/page.tsx:194` shows `15000`)
3. ✅ API call completing? (Check browser Network tab for `/api/ai/nutrition`)
4. ✅ Attach route called? (Check console during signup for `[Attach]` logs)

**Fix**:
- If migration not applied → Apply migration (Step 1)
- If API timing out → Check OpenAI API key, server performance
- If attach not called → Check signup flow, verify draft exists in localStorage

### Issue: Migration fails with "column already exists"

**Explanation**: Migration is idempotent (safe to run multiple times)

**Fix**: This is actually OK! The migration uses `IF NOT EXISTS` checks, so it will skip already-created columns. Check the output for any actual errors.

### Issue: Watchdog still firing after 5 seconds

**Check**: Make sure you saved the file and restarted the dev server

```bash
# Kill current dev server
pkill -f next-server

# Restart in project directory
cd /Users/netanelhadad/Projects/gymbro
pnpm dev
```

---

## Files Modified

| File | Change | Line |
|------|--------|------|
| `apps/web/app/onboarding/generating/page.tsx` | Increased watchdog timeout from 5s to 15s | 194 |
| `supabase/migrations/026_nutrition_calories.sql` | ✅ Already created (ready to apply) | - |
| `apps/web/app/api/nutrition/attach/route.ts` | ✅ Already updated (fingerprint short-circuit, calories field) | - |
| `apps/web/app/api/nutrition/plan/route.ts` | ✅ Already returns calories and updatedAt | - |

---

## Success Criteria

After applying the migration and testing:

- ✅ Generating page waits full 12 seconds for API call
- ✅ Watchdog does NOT fire prematurely
- ✅ Real nutrition plans are created and saved to database
- ✅ Attach route persists plans during signup
- ✅ Nutrition tab shows plans successfully
- ✅ Console logs show expected flow (no premature "Watchdog fired" messages)
- ✅ Database has `nutrition_calories` column
- ✅ No "No nutrition plan found" errors for users who completed onboarding

---

## Next Actions

1. **Apply Migration** → Choose Option A or B above
2. **Verify Schema** → Run verification query
3. **Test New User Flow** → Clear data, go through onboarding
4. **Check Console Logs** → Verify expected log messages
5. **Verify Nutrition Tab** → Should show plan, not error

See [NUTRITION_FLOW_VERIFICATION.md](NUTRITION_FLOW_VERIFICATION.md) for detailed testing guide.
