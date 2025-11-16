# Nutrition Plan Issue - Root Cause Found

## Summary

❌ **ROOT CAUSE IDENTIFIED:** JWT token mismatch between app configuration and provided token.

The JWT token you provided is from a **different Supabase project** than what your local app is configured to use.

---

## The Problem

### API Test Results:

**POST /api/nutrition/attach**
```
HTTP Status: 401 Unauthorized
{
  "ok": false,
  "error": "unauthorized",
  "message": "Authentication required"
}
```

### Why This Happened:

Your JWT token is from: `nykldtztbglmzcxmbqhg.supabase.co`
Your app expects: `ivzltlqsjrikffssyvbr.supabase.co`

**These are two different Supabase projects!**

---

## Detailed Analysis

### 1. JWT Token Analysis

```
Issuer: https://nykldtztbglmzcxmbqhg.supabase.co/auth/v1
User ID: 8ad7e90a-3651-4659-9f6a-66c576efc84c
Email: neta@neta.com
```

### 2. App Configuration

From `/apps/web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL="https://ivzltlqsjrikffssyvbr.supabase.co"
```

### 3. Server Logs

**No `[Attach]` logs found** - This confirms the attach route has never been successfully called with valid authentication.

---

## Why Authentication Failed

The Supabase SSR client (used by the attach route) validates JWT tokens against the project URL and keys in `.env.local`.

When you send a JWT from project `nykldtztbglmzcxmbqhg` to an app configured for project `ivzltlqsjrikffssyvbr`, the validation fails with 401 Unauthorized.

This means:
- ❌ The attach route was never called successfully
- ❌ No server-side generation was attempted
- ❌ No nutrition plans were created
- ❌ The database in project `ivzltlqsjrikffssyvbr` likely has no data for this user

---

## The Fix

You have two options:

### Option A: Get Fresh JWT from Local App (Recommended)

1. Open http://localhost:3000 in your browser
2. **Log in** with an account (or create one if needed)
3. Open DevTools (F12) → Application → Local Storage
4. Find the auth token key (looks like `sb-ivzltlqsjrikffssyvbr-auth-token`)
5. Copy the `access_token` value
6. Use that token for testing

### Option B: Update App Configuration to Match JWT

If you want to use the `nykldtztbglmzcxmbqhg` project:

1. Update `/apps/web/.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL="https://nykldtztbglmzcxmbqhg.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key-from-nykldtztbglmzcxmbqhg-project>"
   ```

2. Restart dev server:
   ```bash
   pkill -f next-server
   pnpm dev
   ```

3. Re-test with the same JWT token

---

## Next Steps (After Fixing Authentication)

Once you have a valid JWT token:

### 1. Test Attach Route

```bash
export JWT='your-fresh-token-here'

curl -X POST http://localhost:3000/api/nutrition/attach \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"status":"pending","fingerprint":"cli-test-001"}'
```

**Expected response:**
```json
{
  "ok": true,
  "saved": true,
  "fingerprint": "cli-test-001",
  "calories": 2000
}
```

**Server logs should show:**
```
[Attach] POST user=xxxxxxxx fp=cli-test-001
[Attach] Server-side generate start (days=1)
[Attach] Server-side generate response status=success
[Attach] Parsed hasPlan=true days=1
[Attach] Plan saved (fingerprint: cli-test-001)
```

### 2. Test Plan API

```bash
curl -H "Authorization: Bearer $JWT" \
  http://localhost:3000/api/nutrition/plan
```

**Expected response:**
```json
{
  "ok": true,
  "plan": { ... },
  "fingerprint": "cli-test-001",
  "calories": 2000,
  "updatedAt": "2025-11-02T..."
}
```

### 3. Test in App

1. Clear browser localStorage
2. Go through onboarding
3. Complete signup
4. Check `/nutrition` page - should show plan

---

## Why This Wasn't Obvious Earlier

1. **The error message** "לא נמצאה תוכנית תזונה" (No nutrition plan found) is a generic 404 from the plan API - it doesn't indicate the auth problem
2. **No server logs** appeared because the attach route was never reached (failed at auth middleware)
3. **The JWT looked valid** superficially - it's a real JWT, just from the wrong project
4. **Migration was applied** to the correct database (`ivzltlqsjrikffssyvbr`), but tests were using credentials from a different project

---

## Files Created

- [test_auth.sh](test_auth.sh) - Script to detect JWT/app mismatch
- [DIAGNOSIS_REPORT.md](DIAGNOSIS_REPORT.md) - This file

---

## To Verify Database State

Once you have the correct JWT, run this SQL in Supabase Studio (for project `ivzltlqsjrikffssyvbr`):

```sql
-- Check if the user exists in this project
SELECT id, email, created_at
FROM auth.users
WHERE id = '8ad7e90a-3651-4659-9f6a-66c576efc84c';

-- If user exists, check their nutrition data
SELECT
  id,
  jsonb_typeof(nutrition_plan) AS plan_type,
  nutrition_status,
  nutrition_fingerprint,
  nutrition_calories,
  nutrition_updated_at
FROM public.profiles
WHERE id = '8ad7e90a-3651-4659-9f6a-66c576efc84c';
```

**Most likely**: The user doesn't exist in project `ivzltlqsjrikffssyvbr` because they signed up in project `nykldtztbglmzcxmbqhg`.

---

## Quick Summary

| What | Status |
|------|--------|
| JWT Token | ❌ From wrong project (nykldtztbglmzcxmbqhg) |
| App Config | ✅ Points to ivzltlqsjrikffssyvbr |
| Database Migration | ✅ Applied to ivzltlqsjrikffssyvbr |
| Attach Route Code | ✅ Correct implementation |
| Shared Generator | ✅ Exists and working |
| Auth | ❌ Failed due to project mismatch |
| Attach Route Called | ❌ Never reached (401 at auth) |
| Plan Created | ❌ Never attempted |

**Fix**: Get fresh JWT from local app or update app config to match JWT's project.
