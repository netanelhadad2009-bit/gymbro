# Nutrition Generation Fix - Complete Summary

## Problems Identified

### 1. **Missing Attach Result Logs**
**Issue:** Signup code called attach route but never logged the result (success/failure).

**Root Cause:** No timeout on fetch, no detailed error handling.

**Impact:** Unable to diagnose why nutrition plans weren't being created.

### 2. **Silent Failures**
**Issue:** When server-side generation timed out, user saw generic "no plan found" error.

**Root Cause:**
- Attach route returned `{ok: false, error: "pending"}`
- Plan API returned generic 404 without status info
- Nutrition page showed same error whether user never completed onboarding OR generation failed

**Impact:** User couldn't tell if they needed to complete onboarding or if generation simply failed.

### 3. **No Retry Mechanism**
**Issue:** If server-side generation timed out (saved as `nutrition_status='pending'`), user had no way to retry.

**Root Cause:** Attach route skipped re-generation if fingerprint matched existing one, even if status was 'pending'.

**Impact:** User stuck with no plan, forced to go through onboarding again.

---

## Fixes Applied

### Fix 1: Enhanced Signup Logging & Timeout (SignupClient.tsx)

**File:** `/apps/web/app/signup/SignupClient.tsx`
**Lines:** 89-154

**Changes:**
1. Added detailed logging before calling attach:
   ```typescript
   console.log("[Signup] Calling attach route...", {
     fingerprint: draft.fingerprint,
     status: draft.status,
     hasPlan: !!draft.plan
   });
   ```

2. Added 70-second timeout to prevent indefinite hangs:
   ```typescript
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 70000);
   ```

3. Added HTTP status code logging:
   ```typescript
   console.log("[Signup] Attach route responded with status:", attachRes.status);
   ```

4. Enhanced error handling with detailed error info:
   ```typescript
   if (err.name === 'AbortError') {
     console.error("[Signup] Attach route timed out after 70s - continuing with signup");
   } else {
     console.error("[Signup] Error migrating nutrition draft:", {
       name: err.name,
       message: err.message,
       stack: err.stack
     });
   }
   ```

**Expected New Logs:**
```
[Signup] Draft found: YES
[Signup] Calling attach route... {fingerprint: "00ff1bu6", status: "pending", hasPlan: false}
[Signup] Attach route responded with status: 200
[Signup] Attach response data: {ok: false, error: "pending", fingerprint: "00ff1bu6"}
[Signup] Failed to attach nutrition draft: {error: "pending", message: undefined, fingerprint: "00ff1bu6"}
```

OR if successful:
```
[Signup] Draft found: YES
[Signup] Calling attach route... {fingerprint: "00ff1bu6", status: "pending", hasPlan: false}
[Signup] Attach route responded with status: 200
[Signup] Attach response data: {ok: true, saved: true, fingerprint: "00ff1bu6", calories: 2000}
[Signup] Draft migrated successfully {saved: true, calories: 2000}
```

---

### Fix 2: Plan API Returns Pending Status (plan/route.ts)

**File:** `/apps/web/app/api/nutrition/plan/route.ts`
**Lines:** 57-80

**Changes:**
Added check for `nutrition_status='pending'` and return different error:

```typescript
if (status === 'pending') {
  return NextResponse.json({
    ok: false,
    error: "pending",
    status: "pending",
    message: "Your nutrition plan is being generated. Please try again in a moment.",
    fingerprint: profile?.nutrition_fingerprint
  }, { status: 404 });
}
```

**Impact:** Client can now distinguish between:
- User never completed onboarding (`error: "not_found"`)
- Generation is pending/failed (`error: "pending", status: "pending"`)

---

### Fix 3: Allow Retry When Status is Pending (attach/route.ts)

**File:** `/apps/web/app/api/nutrition/attach/route.ts`
**Lines:** 172, 199-217

**Changes:**

1. Fetch `nutrition_status` from database:
   ```typescript
   .select("id, nutrition_fingerprint, nutrition_plan, nutrition_status")
   ```

2. Only skip if plan exists AND status is 'ready':
   ```typescript
   if (existing.nutrition_plan && existing.nutrition_status === 'ready') {
     console.log(`[Attach] Skipping (same fingerprint: ..., status: ready)`);
     return NextResponse.json({ok: true, saved: false, fingerprint: ...});
   }
   ```

3. Allow retry if status is 'pending':
   ```typescript
   if (existing.nutrition_status === 'pending') {
     console.log(`[Attach] Retrying generation (same fingerprint: ..., status: pending)`);
     // Continue to generation below
   }
   ```

**Impact:** Users can now retry failed generations by calling attach route again with same draft.

---

## Server-Side Timeout Configuration

**Current Settings:**
- First attempt: 30 seconds
- Retry: 30 seconds
- **Total server-side timeout: 60 seconds**

**Client-Side:**
- Signup fetch timeout: 70 seconds (allows server to respond)

**Previous Settings:**
- First attempt: 10 seconds
- Retry: 10 seconds
- Total: 20 seconds (TOO SHORT for OpenAI API)

---

## How to Test

### Prerequisites

1. **Dev server running:**
   ```bash
   cd /Users/netanelhadad/Projects/gymbro/apps/web
   pnpm dev
   ```

2. **Migration applied:**
   - Run SQL from `diagnose_nutrition_user.sql` in Supabase Studio
   - Verify `nutrition_calories` column exists

### Test 1: Fresh Signup Flow

1. **Clear app data** in iOS Simulator or device:
   - Settings → GymBro → Reset → Clear All Data
   - Or reinstall app

2. **Go through onboarding:**
   - Complete all steps
   - Watch generating page (should show progress)
   - May timeout and create pending draft (expected if AI is slow)

3. **Complete signup:**
   - Enter email/password
   - Submit form
   - **Watch Xcode logs** for new detailed attach logs

4. **Check server terminal** (where `pnpm dev` runs):
   - Look for `[Attach]` logs:
     ```
     [Attach] POST user=16e075a7 fp=00ff1bu6
     [Attach] Server-side generate start (days=1)
     [Attach] Server-side generate response status=success/timeout
     [Attach] Plan saved (fingerprint: ...) OR Marked pending (fingerprint: ...)
     ```

5. **Navigate to nutrition page:**
   - If plan created: Should show nutrition plan
   - If pending: Should show "תוכנית תזונה בהכנה" message (after UI update)

### Test 2: Verify Database State

Run this SQL in Supabase Studio:

```sql
-- Replace with your user ID from Xcode logs
SELECT
  id,
  nutrition_status,
  nutrition_fingerprint,
  nutrition_calories,
  jsonb_typeof(nutrition_plan) AS plan_type,
  nutrition_updated_at
FROM public.profiles
WHERE id = 'YOUR_USER_ID_HERE';
```

**Expected Results:**

**Success Case:**
| nutrition_status | plan_type | nutrition_calories | nutrition_fingerprint |
|------------------|-----------|--------------------|-----------------------|
| ready            | object    | 1800-2500          | 00ff1bu6              |

**Timeout Case:**
| nutrition_status | plan_type | nutrition_calories | nutrition_fingerprint |
|------------------|-----------|--------------------|-----------------------|
| pending          | null      | null               | 00ff1bu6              |

### Test 3: Retry Failed Generation

If generation timed out (status='pending'):

**Option A: Via Signup (Recommended for Testing)**

Since the draft is already cleared after signup, you'd need to:
1. Manually insert a pending draft in Capacitor storage (complex)
2. Call attach API directly (easier)

**Option B: Via API Call (Easiest)**

1. Get user's auth token from browser localStorage:
   - Open app in browser (http://localhost:3000)
   - Login
   - Open DevTools → Application → Local Storage
   - Find `sb-ivzltlqsjrikffssyvbr-auth-token`
   - Copy `access_token` value

2. Call attach route with same draft:
   ```bash
   export JWT='your_access_token_here'
   export FP='00ff1bu6'  # Use actual fingerprint from database

   curl -X POST http://localhost:3000/api/nutrition/attach \
     -H "Authorization: Bearer $JWT" \
     -H "Content-Type: application/json" \
     -d "{\"status\":\"pending\",\"fingerprint\":\"$FP\"}"
   ```

   **Note:** This requires modifying attach route to support Authorization header (currently cookie-only).

**Option C: Via UI (Future Enhancement)**

Add "Retry" button on nutrition page when status is 'pending'.

---

## Expected Xcode Logs (Complete Flow)

### Generating Page
```
⚡️  [log] - [Generating] POST /api/ai/nutrition (days=1): 0%
⚡️  [log] - [Generating] POST /api/ai/nutrition (days=1): 20%
⚡️  [log] - [Generating] POST /api/ai/nutrition (days=1): 40%
⚡️  [warn] - [Generating] Error/Timeout → forcing finish {}
⚡️  [log] - [storage] draft saved {"calories":null,"fingerprint":"00ff1bu6","status":"pending","note":"optimistic-start"}
```

### Signup
```
⚡️  [log] - [Signup] Draft found: YES
⚡️  [log] - [Signup] Calling attach route... {fingerprint: "00ff1bu6", status: "pending", hasPlan: false}
⚡️  [log] - [Signup] Attach route responded with status: 200
⚡️  [log] - [Signup] Attach response data: {ok: true, saved: true, fingerprint: "00ff1bu6", calories: 2000}
⚡️  [log] - [Signup] Draft migrated successfully {saved: true, calories: 2000}
```

OR if timeout:
```
⚡️  [log] - [Signup] Draft found: YES
⚡️  [log] - [Signup] Calling attach route... {fingerprint: "00ff1bu6", status: "pending", hasPlan: false}
⚡️  [log] - [Signup] Attach route responded with status: 200
⚡️  [log] - [Signup] Attach response data: {ok: false, error: "pending", fingerprint: "00ff1bu6"}
⚡️  [error] - [Signup] Failed to attach nutrition draft: {error: "pending", message: undefined, fingerprint: "00ff1bu6"}
```

### Nutrition Page (Success)
```
⚡️  [log] - [Nutrition] Cache MISS - fetching from API
⚡️  [log] - [Nutrition] API response received: {ok: true, plan: {...}, calories: 2000, ...}
⚡️  [log] - [Nutrition] Plan cached successfully
```

### Nutrition Page (Pending)
```
⚡️  [log] - [Nutrition] Cache MISS - fetching from API
⚡️  [error] - [Nutrition] API error: {ok: false, error: "pending", status: "pending", message: "Your nutrition plan is being generated..."}
```

---

## Server Logs (Terminal where pnpm dev runs)

### Success Case
```
[Attach] POST user=16e075a7 fp=00ff1bu6
[Attach] Server-side generate start (days=1)
[Attach] Server-side generate response status=success
[Attach] Parsed hasPlan=true days=1
[Attach] Plan saved (fingerprint: 00ff1bu6)
```

### Timeout Case
```
[Attach] POST user=16e075a7 fp=00ff1bu6
[Attach] Server-side generate start (days=1)
[Attach] First attempt timed out, retrying...
[Attach] Server-side generate response status=timeout
[Attach] Parsed hasPlan=false days=0
[Attach] Marked pending (fingerprint: 00ff1bu6)
```

---

## Troubleshooting

### Issue: Still seeing timeout after 60s

**Possible Causes:**
1. OpenAI API is very slow (>60s)
2. Network issues
3. OpenAI API key missing/invalid

**Diagnostics:**
1. Check OpenAI API status: https://status.openai.com/
2. Check API key in `.env.local`:
   ```bash
   grep OPENAI /Users/netanelhadad/Projects/gymbro/apps/web/.env.local
   ```
3. Test OpenAI API directly:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_OPENAI_API_KEY"
   ```

**Solutions:**
1. Increase timeout to 90s or 120s (not recommended - too long for user)
2. Implement background generation with polling
3. Switch to faster OpenAI model (gpt-4o-mini instead of gpt-4o)

### Issue: No [Attach] logs in server terminal

**Possible Causes:**
1. Attach route not being called
2. Fetch failing before reaching server
3. Authentication failing (401)

**Diagnostics:**
1. Check Xcode logs for `[Signup] Attach route responded with status: XXX`
2. If status is 401: Authentication issue (cookie not set)
3. If status is 500: Server error (check error response)
4. If no status logged: Fetch timed out or network error

### Issue: "לא נמצאה תוכנית תזונה" on nutrition page

**Diagnostics:**
1. Check database (SQL above)
2. If `nutrition_status='pending'`: Generation timed out, retry needed
3. If `nutrition_status='ready'` but `nutrition_plan=null`: Data corruption
4. If profile doesn't exist: User not synced to database

---

## Files Modified

| File | Changes | Purpose |
|------|---------|---------|
| [SignupClient.tsx](apps/web/app/signup/SignupClient.tsx#L89-L154) | Added timeout, detailed logging, better error handling | Diagnose attach failures |
| [plan/route.ts](apps/web/app/api/nutrition/plan/route.ts#L57-L80) | Return pending status in error response | Let client distinguish pending vs not_found |
| [attach/route.ts](apps/web/app/api/nutrition/attach/route.ts#L172,L199-L217) | Allow retry when status='pending' | Enable retry mechanism |

## Files Created

| File | Purpose |
|------|---------|
| [diagnose_nutrition_user.sql](diagnose_nutrition_user.sql) | SQL queries to check user's nutrition data |
| [check_server_logs.sh](check_server_logs.sh) | Script to check server logs for [Attach] entries |
| [NUTRITION_GENERATION_FIX.md](NUTRITION_GENERATION_FIX.md) | This file - complete documentation |

---

## Next Steps

1. **Test the fixes:**
   - Go through fresh signup flow
   - Check both Xcode logs AND server terminal logs
   - Verify database state

2. **If still timing out:**
   - Consider increasing server timeout to 90s
   - Or implement background generation with polling
   - Or switch to faster OpenAI model

3. **Future enhancements:**
   - Add "Retry" button on nutrition page when status='pending'
   - Add loading indicator showing "תוכנית תזונה בהכנה..."
   - Implement background generation (fire-and-forget, poll for completion)
   - Add metrics to track generation success rate and duration

---

## Summary

**Problem:** Nutrition plans weren't being created during signup.

**Root Causes:**
1. Client-side generation timing out too early (watchdog timer) ✅ Fixed in previous session
2. Server-side generation timing out (20s too short) ✅ Fixed (now 60s)
3. Missing diagnostic logs ✅ Fixed (added detailed logging)
4. No way to retry failed generation ✅ Fixed (attach allows retry)
5. Generic error messages ✅ Fixed (plan API returns status)

**Current Status:**
- ✅ All fixes applied
- ⏳ Awaiting user testing
- 📊 Need to verify if 60s is sufficient for OpenAI API

**Expected Outcome:**
- Users can now complete signup successfully
- If generation times out, status is 'pending' with ability to retry
- Detailed logs help diagnose any remaining issues
