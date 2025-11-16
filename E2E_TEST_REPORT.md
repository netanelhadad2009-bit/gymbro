# End-to-End Nutrition Test Report

## Test Execution Status

❌ **BLOCKED**: Cannot complete curl-based testing

---

## Root Cause

### Authentication Method Incompatibility

The nutrition attach route uses **Supabase SSR** (`@supabase/ssr` package), which:

✅ **Supports**: HTTP-only cookies via Next.js `cookies()` API
❌ **Does NOT support**: `Authorization: Bearer` headers

### Technical Details

**File**: `/apps/web/app/api/nutrition/attach/route.ts`
**Line**: 145

```typescript
const supabase = await createClient();  // This uses Supabase SSR
const { data: { session }, error: authError } = await supabase.auth.getSession();
```

The `createClient()` function (from `/lib/supabase/server.ts`) uses `@supabase/ssr`'s `createServerClient`, which exclusively reads authentication state from cookies.

### Test Results

**JWT Token Verification**: ✅ PASS
- Issuer: `https://ivzltlqsjrikffssyvbr.supabase.co/auth/v1`
- User ID: `8ad7e90a-3651-4659-9f6a-66c576efc84c`
- Email: `oegjle@jtgjnt.com`
- Project: Correct (`ivzltlqsjrikffssyvbr`)

**Attach Route (curl with Authorization header)**: ❌ FAIL
```json
{
  "ok": false,
  "error": "unauthorized",
  "message": "Authentication required"
}
```

**Attempts**: 3/3
**All Results**: 401 Unauthorized

---

## Why This Happened

1. **Supabase SSR Design**: The `@supabase/ssr` library is designed for server-side rendering with Next.js
2. **Cookie-based Auth**: It expects authentication tokens in HTTP cookies, not headers
3. **Next.js Integration**: Uses `cookies()` from `next/headers` to read cookies
4. **No Fallback**: Does not check `Authorization` header as a fallback

---

## Alternative Testing Methods

### Option A: Browser Console Testing ✅ (Recommended)

**Advantages**:
- Works with existing code (no modifications)
- Uses real authentication flow
- Tests in production-like environment
- Shows server logs in real-time

**Instructions**: See [BROWSER_TEST_INSTRUCTIONS.md](BROWSER_TEST_INSTRUCTIONS.md)

**Quick Steps**:
1. Open http://localhost:3000 and log in
2. Open DevTools Console (F12)
3. Paste and run the test script
4. Watch console output + server logs

---

### Option B: Modify Route to Support Bearer Tokens (For curl Testing)

**Create a test-friendly version of the attach route:**

1. **Create backup**:
   ```bash
   cp apps/web/app/api/nutrition/attach/route.ts apps/web/app/api/nutrition/attach/route.ts.backup
   ```

2. **Add Authorization header support** (temporary modification):

   Add this function before the `POST` handler:

   ```typescript
   async function createAuthenticatedClient(req: Request) {
     // Check for Authorization header first (for testing)
     const authHeader = req.headers.get('authorization');

     if (authHeader?.startsWith('Bearer ')) {
       const token = authHeader.substring(7);

       // Create Supabase client with the token
       const supabase = createServerClient(
         process.env.NEXT_PUBLIC_SUPABASE_URL!,
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
         {
           global: {
             headers: {
               Authorization: `Bearer ${token}`
             }
           },
           cookies: {
             get() { return undefined; },
             set() {},
             remove() {},
           },
         }
       );

       return supabase;
     }

     // Fall back to SSR cookies
     return await createClient();
   }
   ```

   Then change line 145:
   ```typescript
   // OLD:
   const supabase = await createClient();

   // NEW:
   const supabase = await createAuthenticatedClient(req);
   ```

3. **Test with curl**:
   ```bash
   export JWT='eyJhbGci...'
   curl -X POST http://localhost:3000/api/nutrition/attach \
     -H "Authorization: Bearer $JWT" \
     -H "Content-Type: application/json" \
     -d '{"status":"pending","fingerprint":"cli-test-001"}'
   ```

4. **Restore original** after testing:
   ```bash
   mv apps/web/app/api/nutrition/attach/route.ts.backup apps/web/app/api/nutrition/attach/route.ts
   ```

**⚠️ WARNING**: This modification is for **testing only**. Do not commit to production.

---

### Option C: Direct Database Insert (Verification Only)

To verify the database accepts the data structure:

```sql
-- Replace with your user ID
UPDATE public.profiles
SET
  nutrition_plan = '{"days":[{"name":"Test Day","meals":[{"name":"Breakfast","macros":{"calories":500,"protein_g":30,"carbs_g":50,"fat_g":20}}]}],"dailyTargets":{"calories":2000,"protein_g":150,"carbs_g":200,"fat_g":70}}'::jsonb,
  nutrition_fingerprint = 'manual-test-001',
  nutrition_calories = 2000,
  nutrition_status = 'ready',
  nutrition_updated_at = NOW()
WHERE id = '8ad7e90a-3651-4659-9f6a-66c576efc84c';

-- Then test the GET API
```

Then test with curl:
```bash
curl -H "Authorization: Bearer $JWT" http://localhost:3000/api/nutrition/plan
```

This verifies the plan API works even if attach doesn't.

---

## Recommended Next Steps

### Immediate Action (Choose One):

**1. Browser Console Test** (5 minutes)
   - Fastest, no code changes
   - Full end-to-end flow
   - See [BROWSER_TEST_INSTRUCTIONS.md](BROWSER_TEST_INSTRUCTIONS.md)

**2. Modify Route** (10 minutes)
   - Enables curl testing
   - Temporary code change required
   - Follow Option B above

**3. Manual DB Insert + Plan API Test** (3 minutes)
   - Verifies database structure
   - Tests GET /api/nutrition/plan
   - Doesn't test attach route

### Long-term Solutions:

1. **Add dedicated test endpoint** (`/api/nutrition/test-attach`) that supports Bearer tokens
2. **Create integration tests** using Next.js testing framework with proper session handling
3. **Document** that curl testing requires cookie-based auth or route modification

---

## Files Created

| File | Purpose |
|------|---------|
| [BROWSER_TEST_INSTRUCTIONS.md](BROWSER_TEST_INSTRUCTIONS.md) | Step-by-step browser console testing guide |
| [E2E_TEST_REPORT.md](E2E_TEST_REPORT.md) | This report with analysis and options |
| [test_auth.sh](test_auth.sh) | JWT verification script |

---

## Summary

| Component | Status | Notes |
|-----------|--------|-------|
| JWT Token | ✅ Valid | From correct project (ivzltlqsjrikffssyvbr) |
| Attach Route Code | ✅ Correct | Has server-side generation + retry logic |
| Shared Generator | ✅ Exists | At /lib/server/nutrition/generate.ts |
| Database Migration | ✅ Applied | nutrition_calories column exists |
| Dev Server | ✅ Running | Port 3000 responding |
| curl Authentication | ❌ Blocked | Supabase SSR doesn't support Authorization header |
| End-to-End Test | ⏸️ Pending | Awaiting browser-based test or route modification |

---

## Next Action Required

**Please choose**:

**A.** Run browser console test (recommended - no code changes)
**B.** Apply temporary route modification for curl testing
**C.** Manual database verification + plan API test only

Let me know which approach you'd like to proceed with!
