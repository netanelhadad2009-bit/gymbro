# Nutrition Plan E2E Verification - Ready to Test

## Pre-Verification Status: ✅ ALL CHECKS PASSED

I've verified that all code and migration files are correctly in place:

### ✅ Migration File
- **File**: `supabase/migrations/026_nutrition_calories.sql` (88 lines)
- ✅ `nutrition_calories` column definition
- ✅ Status constraint (`pending` | `ready`)
- ✅ Fingerprint index
- ✅ RLS update policy
- ✅ Calories backfill logic

### ✅ API Routes
- **Attach Route**: `apps/web/app/api/nutrition/attach/route.ts`
  - ✅ References `nutrition_calories`
  - ✅ Fingerprint short-circuit with log
  - ✅ Saves calories on success
  - ✅ Sets calories to NULL on pending

- **Plan Route**: `apps/web/app/api/nutrition/plan/route.ts`
  - ✅ Selects `nutrition_calories`
  - ✅ Returns `calories` in response
  - ✅ Returns `updatedAt` in response

- **Generate Utility**: `apps/web/lib/server/nutrition/generate.ts`
  - ✅ Shared generation logic
  - ✅ Timeout wrapper (20s total)

---

## How to Run Full E2E Verification

I've created a comprehensive verification script that tests everything from database to API.

### Step 1: Get Your JWT Token

1. Open your app in browser: http://localhost:3000
2. Login/signup if needed
3. Open DevTools (F12 or right-click → Inspect)
4. Go to **Application** tab → **Local Storage** → `http://localhost:3000`
5. Find the Supabase auth entry (usually `sb-<project>-auth-token`)
6. Copy the `access_token` value

### Step 2: Run Verification Script

```bash
cd /Users/netanelhadad/Projects/gymbro

# Set your JWT token
export JWT='<paste-your-jwt-token-here>'

# Run the verification
./verify_nutrition_e2e.sh
```

### What the Script Tests

The script will automatically:

1. ✅ **Extract User ID** from JWT
2. ✅ **Test API** - GET /api/nutrition/plan
3. ✅ **Query Database** - Check actual stored data
4. ✅ **Verify Schema** - Confirm all columns exist
5. ✅ **Check Logs** - Look for [Attach] entries
6. ✅ **Force Generation** - If no plan exists, trigger manual attach

### Expected Output

#### Scenario A: Plan Exists (Success)
```json
{
  "user_id": "abc123...",
  "api_status": 200,
  "plan_type": "object",
  "fingerprint": "def456...",
  "calories": 2200,
  "updatedAt": "2025-11-02T10:30:00Z",
  "database_verified": true,
  "status": "SUCCESS"
}
```

#### Scenario B: No Plan Yet (Needs Onboarding)
```json
{
  "user_id": "abc123...",
  "api_status": 404,
  "plan_type": "null",
  "fingerprint": "null",
  "calories": "null",
  "updatedAt": "null",
  "database_verified": true,
  "status": "NEEDS_ATTENTION"
}
```

The script will automatically attempt to generate a plan if none exists.

---

## Quick Manual Checks (Without Script)

If you prefer manual testing:

### 1. Test API Endpoint
```bash
export JWT='your-jwt-token'

# Get nutrition plan
curl -s -H "Authorization: Bearer $JWT" \
  http://localhost:3000/api/nutrition/plan | jq
```

**Expected (with plan):**
```json
{
  "ok": true,
  "plan": { "dailyTargets": {...}, "days": [...] },
  "fingerprint": "abc123...",
  "calories": 2200,
  "updatedAt": "2025-11-02T..."
}
```

**Expected (no plan):**
```json
{
  "ok": false,
  "error": "not_found",
  "message": "No nutrition plan found. Complete onboarding first."
}
```

### 2. Force Manual Generation
```bash
curl -X POST http://localhost:3000/api/nutrition/attach \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"status":"pending","fingerprint":"manual-test-001"}' | jq
```

**Expected response:**
```json
{
  "ok": true,
  "saved": true,
  "fingerprint": "generated-fp-...",
  "calories": 2200
}
```

### 3. Check Database (Supabase Studio)

Go to Supabase Studio → SQL Editor:

```sql
SELECT
  id,
  jsonb_typeof(nutrition_plan) as plan_type,
  nutrition_status,
  nutrition_fingerprint,
  nutrition_calories,
  nutrition_updated_at
FROM public.profiles
WHERE id = 'your-user-id';
```

**Expected:**
- `plan_type` = `'object'` (or `NULL` if no plan)
- `nutrition_status` = `'ready'` or `'pending'`
- `nutrition_calories` = integer or `NULL`

---

## Common Issues & Fixes

### Issue: "Migration not applied"
**Solution:**
```bash
supabase db push
# OR manually run SQL in Supabase Studio
```

### Issue: "API returns 404 but user completed onboarding"
**Check:**
1. Server logs for [Attach] entries
2. Database - does row exist for user?
3. Try manual attach (see above)

### Issue: "nutrition_calories is NULL but plan exists"
**Solution:** Run backfill manually:
```sql
UPDATE public.profiles
SET nutrition_calories = (nutrition_plan #>> '{dailyTargets,calories}')::INT
WHERE nutrition_plan IS NOT NULL AND nutrition_calories IS NULL;
```

### Issue: "Fingerprint short-circuit not working"
**Check logs for:**
```
[Attach] Skipping (same fingerprint: abc123...)
```
If not appearing, fingerprints don't match or attach is being called with different data.

---

## Files Reference

| File | Purpose |
|------|---------|
| `verify_nutrition_e2e.sh` | **Run this** - Full E2E verification |
| `supabase/migrations/026_nutrition_calories.sql` | Database migration |
| `apps/web/app/api/nutrition/attach/route.ts` | Attach endpoint (server-side generation) |
| `apps/web/app/api/nutrition/plan/route.ts` | GET endpoint (read-only) |
| `apps/web/lib/server/nutrition/generate.ts` | Shared AI generation logic |
| `NUTRITION_FLOW_VERIFICATION.md` | Detailed testing guide |
| `NUTRITION_FLOW_COMPLETE.md` | Implementation summary |

---

## Quick Start

**Just run this:**
```bash
# 1. Get JWT from browser DevTools (see Step 1 above)
export JWT='your-jwt-token'

# 2. Run verification
./verify_nutrition_e2e.sh
```

The script will tell you exactly what's working and what needs attention!
