# Testing Attach Route - Instructions

The attach route implementation looks correct and includes server-side generation. Now we need to verify it's actually working.

## Current Status

✅ **Attach route** - Has server-side generation logic
✅ **Shared generator** - Exists at `/lib/server/nutrition/generate.ts`
✅ **Dev server** - Restarted and running on port 3000
✅ **Migration** - Applied (nutrition_calories column exists)

⏳ **Need to test** - Verify the attach route actually generates plans

---

## Step 1: Get Your JWT Token

1. Open your app in browser: `http://localhost:3000`
2. Log in (or sign up if you haven't)
3. Open DevTools (F12 or Cmd+Option+I)
4. Go to **Application** tab → **Local Storage**
5. Find a key like: `sb-<something>-auth-token`
6. Click on it and copy the `access_token` value (long string starting with `eyJ...`)

---

## Step 2: Test the Attach Route

Run the test script:

```bash
cd /Users/netanelhadad/Projects/gymbro

# Set your JWT token (paste the token you copied)
export JWT='eyJhbGci...'  # Replace with your actual token

# Run the test
./test_attach_route.sh
```

### Expected Output (Success):

```
================================================
Testing Attach Route with Pending Draft
================================================

Step 1: Testing POST /api/nutrition/attach
-------------------------------------------

Sending pending draft to attach route...

HTTP Status: 200

Response Body:
{
  "ok": true,
  "saved": true,
  "fingerprint": "test-cli-1234567890",
  "calories": 2000
}

✓ SUCCESS: Plan created and saved!
  Calories: 2000

================================================

Step 2: Checking Server Logs
-----------------------------

Recent [Attach] logs from dev server:

[Attach] POST user=abc12345 fp=test-cli-123
[Attach] Server-side generate start (days=1)
[Attach] Server-side generate response status=success
[Attach] Parsed hasPlan=true days=1
[Attach] Plan saved (fingerprint: test-cli-123)

================================================

Step 3: Testing GET /api/nutrition/plan
---------------------------------------------

HTTP Status: 200

✓ Plan API returns 200

Response:
{
  "ok": true,
  "calories": 2000,
  "updatedAt": "2025-11-02T...",
  "hasPlan": true
}

================================================

✓✓✓ ALL TESTS PASSED ✓✓✓
```

### If You See `error: "pending"`:

```json
{
  "ok": false,
  "error": "pending",
  "fingerprint": "test-cli-1234567890"
}
```

**This means:** Server-side generation timed out (took longer than 20 seconds).

**Check:**
1. OpenAI API key in `.env.local` (should start with `sk-`)
2. Server logs for timeout errors
3. Internet connectivity

---

## Step 3: Check Server Logs

The test script shows recent logs, but you should also check the terminal where `pnpm dev` is running.

**Look for these logs:**

### Success Path:
```
[Attach] POST user=abc12345 fp=xxx
[Attach] Server-side generate start (days=1)
[Attach] Server-side generate response status=success
[Attach] Parsed hasPlan=true days=1
[Attach] Plan saved (fingerprint: xxx)
```

### Timeout Path:
```
[Attach] POST user=abc12345 fp=xxx
[Attach] Server-side generate start (days=1)
[Attach] First attempt timed out, retrying...
[Attach] Server-side generate response status=timeout
[Attach] Parsed hasPlan=false days=0
[Attach] Marked pending (fingerprint: xxx)
```

### Error Path:
```
[Attach] POST user=abc12345 fp=xxx
[Attach] Server-side generate start (days=1)
[Attach] Failed to save plan: { ... }
```

---

## Step 4: Verify in Database

Run this SQL in **Supabase Studio → SQL Editor**:

```sql
-- Get your most recent profile with nutrition data
SELECT
  id,
  jsonb_typeof(nutrition_plan) AS plan_type,
  nutrition_status,
  nutrition_fingerprint,
  nutrition_calories,
  nutrition_updated_at,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 1;
```

### Expected Result (Success):

| plan_type | nutrition_status | nutrition_calories |
|-----------|------------------|-------------------|
| `object`  | `ready`         | `2000` (or similar)|

### If You See (Problem):

| plan_type | nutrition_status | nutrition_calories |
|-----------|------------------|-------------------|
| `null`    | `pending`        | `null`            |

This means the attach route was called but generation failed/timed out.

---

## Step 5: Test in the App

Now that the attach route is verified, test the full onboarding flow:

### A. Clear App Data
1. Open DevTools (F12)
2. **Application** → **Local Storage** → Clear All
3. **Application** → **Session Storage** → Clear All
4. Close DevTools

### B. Go Through Onboarding
1. Navigate to `/onboarding/gender`
2. Fill out ALL fields with real data
3. Click through to the generating page
4. **Open DevTools Console** before clicking generate

### C. Watch Console Logs

**On Generating Page:**
```
[Generating] Start: 10%
[Generating] POST /api/ai/nutrition (days=1): 40%
[Generating] Draft saved (full) → navigate now  ← MUST SEE THIS
[Generating] Cleanup complete
```

**Should NOT see** (before 15 seconds):
```
[Generating] Watchdog fired → forcing finish  ← BAD
```

### D. Complete Signup

1. Enter email and password
2. Click signup
3. **Watch console for:**

```
[Signup] Draft found: YES
[Attach] POST user=xxx fp=xxx  ← Server log
[Attach] Plan saved (fingerprint: xxx)  ← Server log
[Signup] Draft migrated
```

### E. Check Nutrition Tab

1. Navigate to `/nutrition`
2. Should see your nutrition plan with meals
3. Should NOT see "לא נמצאה תוכנית תזונה" error

---

## Step 6: Capacitor App Testing

Once the web version works, test in Capacitor:

1. **Quit the Capacitor app completely** (not just background)
2. **Relaunch** from Xcode
3. Go through onboarding
4. Watch Xcode logs for:

```
[Signup] Draft found: YES
[Signup] Draft migrated  ← Should see this, not "Failed to attach"
```

---

## Troubleshooting

### Issue: `error: "pending"` even with valid OpenAI key

**Check if the API key is loaded:**

```bash
cd /Users/netanelhadad/Projects/gymbro/apps/web
grep OPENAI_API_KEY .env.local
```

Should output: `OPENAI_API_KEY=sk-...`

If missing or empty, add it:

```bash
echo "OPENAI_API_KEY=your-key-here" >> .env.local
```

Then restart dev server.

### Issue: No `[Attach]` logs appear

**The route isn't being called.** Check:

1. Is the JWT token valid? (Try getting a fresh one)
2. Is the request actually reaching the server? (Check Network tab)
3. Is there a CORS issue? (Check browser console for errors)

### Issue: `column "nutrition_calories" does not exist`

**The migration wasn't applied.** Run this SQL:

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nutrition_calories INTEGER;
```

### Issue: Capacitor shows old cached version

**Clear the app cache:**

1. In Xcode, **Product** → **Clean Build Folder** (Cmd+Shift+K)
2. Quit the app completely
3. Rebuild and run

---

## What to Report Back

After running the test script, send me:

1. **The full output** of `./test_attach_route.sh`
2. **Server logs** from the terminal (search for `[Attach]`)
3. **Database query result** (the SQL from Step 4)
4. **Any errors** you see in browser console or Xcode logs

This will tell me exactly what's happening and what (if anything) needs to be fixed.

---

## Quick Reference

```bash
# Get JWT token from browser localStorage
# Look for: sb-<project>-auth-token → access_token

# Test attach route
export JWT='your-token-here'
./test_attach_route.sh

# Check server logs
tail -100 /tmp/next-dev.log | grep "\[Attach\]"

# Or check the terminal where pnpm dev is running
```

---

**Next Step:** Run the test script and report back the results! 🚀
