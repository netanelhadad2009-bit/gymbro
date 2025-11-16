# Nutrition Plan Flow - Verification Guide

## Overview

The nutrition plan generation and persistence flow has been refactored to be robust against client timeouts. The system now:

1. **Shared Generation Logic** - Core AI generation is in `apps/web/server/nutrition/generate.ts`
2. **Server-Side Fallback** - `/api/nutrition/attach` generates plans server-side with 20s timeout (10s + 10s retry)
3. **Strict Persistence** - Only real plan objects are saved to `nutrition_plan` (JSONB), never placeholders
4. **Read-Only Tabs** - Nutrition tab only calls `GET /api/nutrition/plan`, never regenerates

---

## Architecture

```
Onboarding Flow (Client)
├─ POST /api/ai/nutrition (may timeout)
├─ Creates draft: { status: 'pending', fingerprint }
└─ Saved to localStorage

Signup Flow (Server)
├─ POST /api/nutrition/attach
│  ├─ Detects pending draft
│  ├─ Calls generateNutritionPlanWithTimeout() (internal, no HTTP)
│  │  ├─ Attempt 1: 10s timeout
│  │  └─ Attempt 2 (retry): 10s timeout
│  ├─ On success: Save { nutrition_plan: {...}, nutrition_status: 'ready' }
│  └─ On timeout/error: Save { nutrition_plan: null, nutrition_status: 'pending' }
└─ Returns { ok: true/false, fingerprint, calories? }

Nutrition Tab (Client)
└─ GET /api/nutrition/plan
   ├─ 200: { ok: true, plan, fingerprint, calories }
   └─ 404: { ok: false, error: 'not_found' }
```

---

## Database Schema

```sql
-- Columns in public.profiles
nutrition_plan         JSONB           -- Real plan object or NULL
nutrition_fingerprint  TEXT            -- Cache key based on profile data
nutrition_status       TEXT            -- 'pending' | 'ready'
nutrition_calories     INTEGER         -- Daily calorie target
nutrition_updated_at   TIMESTAMPTZ     -- Last update timestamp

-- Constraint
CHECK (nutrition_status IN ('pending', 'ready'))

-- Index
CREATE INDEX idx_profiles_nutrition_fingerprint ON profiles(nutrition_fingerprint);
```

---

## Expected Logs

### Case A: Ready Draft (Happy Path)
```
[Attach] POST user=abc12345 fp=def67890abcd
[Attach] Plan saved (fingerprint: def67890abcd)
```

### Case B: Pending Draft → Server-Side Generation (Success)
```
[Attach] POST user=abc12345 fp=xyz12345abcd
[Attach] Server-side generate start (days=1)
[Attach] Server-side generate response status=success
[Attach] Parsed hasPlan=true days=1
[Attach] Plan saved (fingerprint: mno67890pqrs)
```

### Case C: Pending Draft → Timeout → Retry → Success
```
[Attach] POST user=abc12345 fp=stu67890vwxy
[Attach] Server-side generate start (days=1)
[Attach] First attempt timed out, retrying...
[Attach] Server-side generate response status=success (retry)
[Attach] Parsed hasPlan=true days=1
[Attach] Plan saved (fingerprint: abc12345defg)
```

### Case D: Both Attempts Fail → Marked Pending
```
[Attach] POST user=abc12345 fp=hij67890klmn
[Attach] Server-side generate start (days=1)
[Attach] First attempt timed out, retrying...
[Attach] Server-side generate response status=timeout
[Attach] Parsed hasPlan=false days=0
[Attach] Marked pending (fingerprint: hij67890klmn)
```

---

## Manual Testing

### Prerequisites

1. Get JWT token:
```bash
# Login to app and extract JWT from browser DevTools
# Application → Local Storage → supabase.auth.token
# Or use Supabase CLI:
export USER_JWT="<your-jwt-token>"
export USER_ID="<your-user-id>"
```

### Test 1: Attach with Pending Draft

Simulate onboarding timeout by sending a pending draft:

```bash
curl -X POST http://localhost:3000/api/nutrition/attach \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "pending",
    "fingerprint": "test-fp-001",
    "calories": null
  }'
```

**Expected Response (Success after server-side generation):**
```json
{
  "ok": true,
  "saved": true,
  "fingerprint": "generated-fp-123",
  "calories": 2200
}
```

**Or (Timeout/Error):**
```json
{
  "ok": false,
  "error": "pending",
  "fingerprint": "test-fp-001"
}
```

### Test 2: GET Nutrition Plan

```bash
curl -H "Authorization: Bearer $USER_JWT" \
  http://localhost:3000/api/nutrition/plan
```

**Expected Response (Plan exists):**
```json
{
  "ok": true,
  "plan": {
    "dailyTargets": { "calories": 2200, "protein_g": 165, ... },
    "days": [
      {
        "day": 1,
        "meals": [ ... ]
      }
    ],
    "summary": "...",
    "shoppingList": [ ... ]
  },
  "fingerprint": "generated-fp-123",
  "calories": 2200,
  "updatedAt": "2025-11-02T10:30:00Z"
}
```

**Expected Response (No plan / pending):**
```json
{
  "ok": false,
  "error": "not_found",
  "message": "No nutrition plan found. Complete onboarding first."
}
```

### Test 3: Idempotency - Re-attach Same Fingerprint

```bash
# First attach
curl -X POST http://localhost:3000/api/nutrition/attach \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ready",
    "plan": { "dailyTargets": {"calories": 2000, "protein_g": 150, "carbs_g": 200, "fat_g": 67}, "days": [{"day": 1, "meals": []}] },
    "fingerprint": "same-fp-456",
    "calories": 2000
  }'

# Second attach (same fingerprint) - should skip work
curl -X POST http://localhost:3000/api/nutrition/attach \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ready",
    "plan": { "dailyTargets": {"calories": 2000, "protein_g": 150, "carbs_g": 200, "fat_g": 67}, "days": [{"day": 1, "meals": []}] },
    "fingerprint": "same-fp-456",
    "calories": 2000
  }'
```

**Expected Second Response:**
```json
{
  "ok": true,
  "saved": false,
  "fingerprint": "same-fp-456"
}
```

**Expected Log:**
```
[Attach] Skipping (same fingerprint: same-fp-456)
```

---

## Database Verification

### Check Schema (All Nutrition Columns)

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name LIKE 'nutrition%'
ORDER BY column_name;
```

**Expected output:**
```
column_name           | data_type                   | is_nullable
----------------------|-----------------------------|-----------
nutrition_calories    | integer                     | YES
nutrition_fingerprint | text                        | YES
nutrition_plan        | jsonb                       | YES
nutrition_status      | text                        | YES
nutrition_updated_at  | timestamp with time zone    | YES
```

### Check User's Nutrition Data

```sql
SELECT
  id,
  jsonb_typeof(nutrition_plan) as plan_type,
  nutrition_status,
  nutrition_fingerprint,
  nutrition_calories,
  nutrition_updated_at,
  left(nutrition_plan::text, 200) as plan_snippet
FROM public.profiles
WHERE id = '<USER_ID>';
```

**Expected Results:**

- **With Plan:**
  - `plan_type = 'object'`
  - `nutrition_status = 'ready'`
  - `plan_snippet` shows JSON with `dailyTargets` and `days`

- **Pending (no plan):**
  - `plan_type = NULL`
  - `nutrition_status = 'pending'`
  - `plan_snippet = NULL`

### Check All Users' Nutrition Status

```sql
SELECT
  nutrition_status,
  COUNT(*) as count,
  COUNT(nutrition_plan) as with_plan,
  COUNT(*) FILTER (WHERE nutrition_plan IS NULL) as without_plan
FROM public.profiles
GROUP BY nutrition_status;
```

### Find Users with Invalid States

```sql
-- Should return 0 rows (no status='ready' without plan)
SELECT id, nutrition_status, jsonb_typeof(nutrition_plan) as plan_type
FROM public.profiles
WHERE nutrition_status = 'ready' AND nutrition_plan IS NULL;

-- Should return 0 rows (no placeholders)
SELECT id, nutrition_status, nutrition_plan::text
FROM public.profiles
WHERE nutrition_plan IS NOT NULL
  AND nutrition_plan::text NOT LIKE '%dailyTargets%';
```

### Check RLS Policies

```sql
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
  AND policyname LIKE '%nutrition%'
ORDER BY policyname;
```

**Expected:** At least one UPDATE policy allowing authenticated users to update their own row:
```
policyname: profiles_update_self_nutrition
cmd: UPDATE
qual: (auth.uid() = id)
```

---

## Client-Side Verification

### Nutrition Tab (Read-Only)

1. Open DevTools → Network tab
2. Navigate to `/nutrition` page
3. Verify:
   - **Only ONE request**: `GET /api/nutrition/plan`
   - **Zero POST requests** to `/api/ai/nutrition`

### localStorage Inspection

```javascript
// In browser console
const draft = localStorage.getItem('nutrition_draft');
console.log(JSON.parse(draft));
```

**Valid Draft Structure:**
```json
{
  "status": "ready",
  "plan": { "dailyTargets": {...}, "days": [...] },
  "fingerprint": "abc123...",
  "calories": 2200,
  "createdAt": 1698765432000,
  "note": "optimistic-start"
}
```

---

## Acceptance Criteria

✅ **Robust Generation**
- Client timeout → Server generates plan during attach (20s max: 10s + 10s retry)
- Logs show `[Attach] Server-side generate start (days=1)`
- Real plan saved to `nutrition_plan` (JSONB object)

✅ **Strict Persistence**
- `nutrition_plan` contains only real objects or NULL
- No placeholders like `{ status: 'pending', fingerprint: '...' }`
- `nutrition_status` accurately reflects 'ready' or 'pending'

✅ **Read-Only Tabs**
- Nutrition tab never calls `/api/ai/nutrition`
- Only GET `/api/nutrition/plan`
- 404 response shows CTA to complete onboarding

✅ **Idempotency**
- Re-attaching same fingerprint returns `{ skipped: true }`
- No duplicate plan generation

✅ **Structured Logs**
- `[Attach] POST user=<uid> fp=<fp>`
- `[Attach] Server-side generate start (days=<n>)`
- `[Attach] Server-side generate response status=success|timeout|error`
- `[Attach] Parsed hasPlan=<bool> days=<n>`
- `[Attach] Plan saved (fingerprint: <fp>)` or `[Attach] Marked pending (fingerprint: <fp>)`

---

## Troubleshooting

### Issue: "Column nutrition_status does not exist"

**Solution:** Run migration

```bash
cd apps/web
supabase migration new add_nutrition_columns
# Paste migration SQL (see NUTRITION_FLOW_VERIFICATION.md)
supabase db push
```

### Issue: Attach always returns "pending"

**Check:**
1. Server logs - is generation timing out?
2. OpenAI API key configured?
3. Database - verify `nutrition_plan` is NULL

```sql
SELECT id, nutrition_plan, nutrition_status
FROM profiles
WHERE id = '<USER_ID>';
```

### Issue: GET /api/nutrition/plan returns 404 but plan exists

**Check plan type:**
```sql
SELECT jsonb_typeof(nutrition_plan) FROM profiles WHERE id = '<USER_ID>';
```

Expected: `'object'`
If `'string'` or `NULL` → Plan is invalid/missing

### Issue: Nutrition tab shows "Complete onboarding" but user completed signup

**Likely cause:** Server generation timed out twice
**Solution:** Retry attach manually or restart onboarding

```bash
# Force re-attach
curl -X POST http://localhost:3000/api/nutrition/attach \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"status":"pending","fingerprint":"manual-retry"}'
```

---

## Code References

| File | Purpose |
|------|---------|
| `apps/web/server/nutrition/generate.ts` | Shared AI generation logic |
| `apps/web/app/api/ai/nutrition/route.ts` | HTTP endpoint for onboarding |
| `apps/web/app/api/nutrition/attach/route.ts` | Server-side fallback + persistence |
| `apps/web/app/api/nutrition/plan/route.ts` | GET endpoint (read-only) |
| `apps/web/app/(app)/nutrition/page.tsx` | Client tab (read-only) |

---

## Summary

The refactored flow eliminates client timeout issues by:
1. **Extracting shared generation logic** into `server/nutrition/generate.ts`
2. **Server-side fallback** with 20s timeout (10s + retry 10s) in attach route
3. **Strict persistence** - only real plans saved, never placeholders
4. **Read-only tabs** - nutrition page only fetches, never regenerates

Even if onboarding times out, signup will complete the plan generation server-side and persist it for the nutrition tab to display.
