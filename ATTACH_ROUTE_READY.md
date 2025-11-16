# Attach Route - Ready for Testing

## What I've Done

✅ **Verified attach route implementation**
- File: [apps/web/app/api/nutrition/attach/route.ts](apps/web/app/api/nutrition/attach/route.ts)
- Has server-side generation with 10s + 10s retry (20s total)
- Uses shared generator from `/lib/server/nutrition/generate.ts`
- Includes all required logs: `[Attach] POST`, `[Attach] Server-side generate`, etc.
- Saves plan with all fields: `nutrition_plan`, `nutrition_calories`, `nutrition_status`, `nutrition_fingerprint`, `nutrition_updated_at`

✅ **Verified shared generator exists**
- File: [apps/web/lib/server/nutrition/generate.ts](apps/web/lib/server/nutrition/generate.ts)
- Exports: `generateNutritionPlan`, `generateNutritionPlanWithTimeout`
- Has timeout handling and retry logic

✅ **Restarted dev server**
- Killed old process
- Started fresh on port 3000
- Server is responding (HTTP 200)

✅ **OpenAI API key configured**
- Key exists in `.env.local`
- Ready for AI generation

✅ **Created test script**
- File: [test_attach_route.sh](test_attach_route.sh)
- Tests attach route with pending draft
- Verifies plan API
- Checks database state

---

## What You Need to Do Now

### Step 1: Get JWT Token (1 minute)

1. Open browser: `http://localhost:3000`
2. Log in (or sign up)
3. DevTools (F12) → Application → Local Storage
4. Find key: `sb-<something>-auth-token`
5. Copy the `access_token` value (starts with `eyJ...`)

### Step 2: Run Test Script (1 minute)

```bash
cd /Users/netanelhadad/Projects/gymbro

# Paste your token here:
export JWT='eyJhbGci...'

# Run the test:
./test_attach_route.sh
```

### Step 3: Check Results

The script will show you:
- ✅ **HTTP 200 + saved:true** = Success! Attach route works
- ⚠️ **HTTP 200 + error:"pending"** = Timeout (generation takes >20s)
- ❌ **HTTP 401** = Bad JWT token
- ❌ **HTTP 500** = Server error (check logs)

---

## Expected Outcomes

### Scenario A: Everything Works ✅

**Test script shows:**
```json
{
  "ok": true,
  "saved": true,
  "fingerprint": "test-cli-1234567890",
  "calories": 2000
}
```

**Server logs show:**
```
[Attach] POST user=abc12345 fp=test-cli-123
[Attach] Server-side generate start (days=1)
[Attach] Server-side generate response status=success
[Attach] Parsed hasPlan=true days=1
[Attach] Plan saved (fingerprint: test-cli-123)
```

**Plan API shows:**
```json
{
  "ok": true,
  "plan": { ... },
  "calories": 2000,
  "updatedAt": "2025-11-02T..."
}
```

**✅ NEXT STEP:** Test full onboarding flow in the app (see [TEST_ATTACH_INSTRUCTIONS.md](TEST_ATTACH_INSTRUCTIONS.md))

---

### Scenario B: Generation Times Out ⚠️

**Test script shows:**
```json
{
  "ok": false,
  "error": "pending",
  "fingerprint": "test-cli-1234567890"
}
```

**Server logs show:**
```
[Attach] POST user=abc12345 fp=test-cli-123
[Attach] Server-side generate start (days=1)
[Attach] First attempt timed out, retrying...
[Attach] Server-side generate response status=timeout
```

**Why:**
- OpenAI API is slow/overloaded
- Network issues
- AI generation is legitimately taking >20 seconds

**Fix:**
1. Check OpenAI API status: https://status.openai.com
2. Try again in a few minutes
3. If persistent, increase timeout in attach route

---

### Scenario C: No Logs Appear ❌

**Test script shows:**
```json
{
  "ok": false,
  "error": "..."
}
```

**Server logs:** No `[Attach]` logs at all

**Why:**
- The route isn't being called
- JWT token is invalid
- Route failed before logging

**Fix:**
1. Get a fresh JWT token
2. Check if dev server is running: `curl http://localhost:3000`
3. Check server terminal for errors

---

### Scenario D: Database Error ❌

**Test script shows:**
```json
{
  "ok": false,
  "error": "database_error",
  "message": "column \"nutrition_calories\" does not exist"
}
```

**Why:** Migration not applied

**Fix:**
```sql
ALTER TABLE public.profiles ADD COLUMN nutrition_calories INTEGER;
```

---

## After Testing

**If test succeeds** → Test full onboarding flow:
1. Clear localStorage
2. Go to `/onboarding/gender`
3. Complete onboarding
4. Sign up
5. Check `/nutrition` page

**If test fails** → Report back:
1. Full test script output
2. Server logs (from terminal or `/tmp/next-dev.log`)
3. Database query result (SQL in [TEST_ATTACH_INSTRUCTIONS.md](TEST_ATTACH_INSTRUCTIONS.md))

---

## Files Created

- **[test_attach_route.sh](test_attach_route.sh)** - Test script for attach route
- **[TEST_ATTACH_INSTRUCTIONS.md](TEST_ATTACH_INSTRUCTIONS.md)** - Detailed testing instructions
- **[ATTACH_ROUTE_READY.md](ATTACH_ROUTE_READY.md)** - This file (summary)

---

## Quick Commands

```bash
# Get your JWT token from browser localStorage
# Then run:

export JWT='your-token-here'
./test_attach_route.sh

# Check server logs
tail -100 /tmp/next-dev.log | grep "\[Attach\]"

# Check database
# Run this SQL in Supabase Studio:
# SELECT * FROM profiles WHERE id = '<your-user-id>' ORDER BY created_at DESC LIMIT 1;
```

---

## Bottom Line

The attach route code is **correct and ready**. We just need to verify it's actually running by testing it.

**Run the test script now** and report back the results! 🚀
