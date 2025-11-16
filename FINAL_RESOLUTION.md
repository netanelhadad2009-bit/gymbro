# Final Resolution: Nutrition Plan Creation Fixed

## What Was Wrong

**You were right** - the issue wasn't new. The nutrition plan creation **was** working before, but I initially misdiagnosed the problem.

### The Real Issue

**AI generation timeout** - not authentication failure.

The attach route was being called successfully from your Capacitor app (authentication worked fine via cookies), but the OpenAI API was taking longer than the configured timeout, causing generation to fail.

---

## Timeline of What Actually Happened

### Before (When It Worked)
- Nutrition generation had longer timeouts OR
- OpenAI API was faster OR
- Different implementation entirely

### What Changed (Breaking Point)
According to git history, the nutrition API directory (`apps/web/app/api/nutrition/`) is untracked - meaning it was created in a recent conversation session with timeout set to:
- **10s first attempt**
- **10s retry**
- **20s total**

This was too short for OpenAI API calls.

### Your Symptoms
```
[Signup] Draft found: YES
[Signup] Failed to attach nutrition draft: pending  ← The key error
```

The error `"pending"` (not `"unauthorized"`) meant:
- ✅ Attach route was called
- ✅ Authentication worked
- ❌ Generation timed out after 20s
- ❌ Returned `{error: "pending"}`
- ❌ No plan saved to database

---

## What I Fixed

### File Modified
**`apps/web/app/api/nutrition/attach/route.ts`**

### Changes Made

**Line 56**: Increased first attempt timeout
```typescript
// Before:
const result = await generateNutritionPlanWithTimeout(payload, 10000, {...});

// After:
const result = await generateNutritionPlanWithTimeout(payload, 30000, {...});
```

**Line 82**: Increased retry timeout
```typescript
// Before:
const result = await generateNutritionPlanWithTimeout(payload, 10000, {...});

// After:
const result = await generateNutritionPlanWithTimeout(payload, 30000, {...});
```

**Line 209**: Updated comment
```typescript
// Before: (with 10s timeout + 10s retry = 20s total)
// After: (with 30s timeout + 30s retry = 60s total)
```

### New Behavior

**Total timeout**: 60 seconds (30s + 30s retry)

This gives OpenAI API enough time to generate nutrition plans even when the API is slow.

---

## Why The curl Test Failed (And Why That Didn't Matter)

I initially tested with curl using `Authorization: Bearer` headers, which failed with 401. This led me down the wrong path.

**Why it failed**: Supabase SSR (used in the attach route) only reads HTTP cookies, not Authorization headers.

**Why it doesn't matter**: Your Capacitor app authenticates correctly via cookies:
1. User signs up → Supabase sets cookies in WebView
2. SignupClient calls `fetch("/api/nutrition/attach")`
3. Cookies automatically included (same-origin)
4. Server reads cookies → authentication succeeds ✅

The curl test was irrelevant to your actual app flow.

---

## How To Test The Fix

### Option 1: In Capacitor App (Real Test)

1. **Clear app data**:
   - Delete app from simulator
   - Reinstall

2. **Go through onboarding**:
   - Fill all fields
   - Complete generating page
   - Sign up

3. **Watch server logs** (terminal where `pnpm dev` runs):
   ```
   [Attach] POST user=xxxxxxxx fp=...
   [Attach] Server-side generate start (days=1)
   [Attach] Server-side generate response status=success  ← Should see this!
   [Attach] Parsed hasPlan=true days=1
   [Attach] Plan saved (fingerprint: ...)
   ```

4. **Check nutrition tab**:
   - Navigate to `/nutrition`
   - Should see meal plan (not error)

### Option 2: Browser Console Test (Quick)

1. Open http://localhost:3000 in browser
2. Log in with any account
3. Open DevTools Console (F12)
4. Run:

```javascript
async function testAttach() {
  console.time('Generation Time');

  const res = await fetch('/api/nutrition/attach', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      status: 'pending',
      fingerprint: 'browser-test-' + Date.now()
    })
  });

  const data = await res.json();
  console.timeEnd('Generation Time');

  if (data.ok && data.saved) {
    console.log('✅ SUCCESS! Plan created');
    console.log('Calories:', data.calories);
    console.log('Fingerprint:', data.fingerprint);
  } else {
    console.log('❌ FAILED');
    console.log('Error:', data.error);
  }

  return data;
}

testAttach();
```

**Expected output** (after 15-40 seconds):
```
Generation Time: 23458.92ms
✅ SUCCESS! Plan created
Calories: 2000
Fingerprint: browser-test-1730559123456
```

### Option 3: Verify in Database

After successful test, check Supabase Studio:

```sql
SELECT
  id,
  nutrition_status,
  nutrition_calories,
  jsonb_typeof(nutrition_plan) AS plan_type,
  nutrition_fingerprint,
  nutrition_updated_at
FROM public.profiles
ORDER BY nutrition_updated_at DESC NULLS LAST
LIMIT 5;
```

**Expected result** (for successful generation):
| nutrition_status | nutrition_calories | plan_type | nutrition_fingerprint |
|------------------|-------------------|-----------|-----------------------|
| ready            | ~2000             | object    | browser-test-...      |

---

## Expected Logs After Fix

### Server Terminal (pnpm dev):

**Success case** (~20-40s):
```
[Attach] POST user=8ad7e90a fp=browser-test-001
[Attach] Server-side generate start (days=1)
[Attach] Server-side generate response status=success
[Attach] Parsed hasPlan=true days=1
[Attach] Plan saved (fingerprint: browser-test-001)
```

**Timeout case** (>60s, rare):
```
[Attach] POST user=8ad7e90a fp=browser-test-001
[Attach] Server-side generate start (days=1)
[Attach] First attempt timed out, retrying...
[Attach] Server-side generate response status=timeout
[Attach] Parsed hasPlan=false days=0
[Attach] Marked pending (fingerprint: browser-test-001)
```

### Browser/Xcode Logs:

**Success**:
```
[Signup] Draft found: YES
[Signup] Draft migrated  ← Success!
```

**Failure** (should be rare now):
```
[Signup] Draft found: YES
[Signup] Failed to attach nutrition draft: pending
```

---

## Files Modified/Created

| File | Change | Status |
|------|--------|--------|
| `apps/web/app/api/nutrition/attach/route.ts` | Timeout: 10s→30s (lines 58, 82, 209) | ✅ Fixed |
| `ROOT_CAUSE_ANALYSIS.md` | Detailed analysis | ✅ Created |
| `FINAL_RESOLUTION.md` | This file | ✅ Created |

---

## If It Still Doesn't Work

If generation still times out after 60 seconds:

### Check OpenAI API Status
- Visit: https://status.openai.com
- Check for outages or slowdowns

### Check Network
```bash
# Test OpenAI API directly
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hi"}]}'
```

### Enable Verbose Logging
In attach route line 60 and 84, change:
```typescript
enableVerboseLogging: false,  // Change to true
```

This will show detailed generation logs.

### Alternative: Implement Background Generation

For better UX, don't wait for generation during signup:

1. Attach route immediately returns success with `status: 'pending'`
2. Triggers background job to generate
3. Client polls `/api/nutrition/plan` every 5s
4. Shows loading state until `status: 'ready'`

This is how most production apps handle long-running AI tasks.

---

## Summary

| Issue | Status | Solution |
|-------|--------|----------|
| Authentication broken | ❌ False alarm | Works fine via cookies |
| curl testing doesn't work | ✅ Expected | Capacitor uses cookies, not Bearer tokens |
| AI generation timeout | ✅ **Fixed** | **Increased from 20s to 60s** |
| Plans not being created | ✅ **Should work now** | Wait for test results |

---

## Next Steps

1. ✅ **Code fixed** - timeout increased to 60s
2. ⏳ **Test in app** - Go through onboarding and verify plan is created
3. ⏳ **Monitor logs** - Check for `[Attach] Plan saved` message
4. ⏳ **Verify in database** - Confirm `nutrition_status = 'ready'`

The fix is applied and ready to test. Let me know the results!
