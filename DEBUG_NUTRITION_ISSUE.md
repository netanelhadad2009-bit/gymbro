# Debug: No Nutrition Plan Found

You're seeing "לא נמצאה תוכנית תזונה" (No nutrition plan found). Let's diagnose exactly what's happening.

## Quick Diagnostic Steps

### Step 1: Check Browser Console Logs

**Open DevTools (F12) → Console tab** while on the nutrition page (`/nutrition`).

Look for these messages:

#### ✅ What you SHOULD see if everything is working:
```
[Nutrition] Profile loaded: { userId: 'xxx-xxx-xxx' }
[Nutrition] Fetching merged profile (async)...
[Nutrition] Merged profile: { ... }
[Nutrition] Built payload: { payload: {...}, missing: [] }
[Nutrition] Cache key: { userId: '...', fingerprint: '...' }
[Nutrition] Cache MISS - fetching from API
[Nutrition Plan] GET request for user xxxxxxxx
[Nutrition Plan] Plan retrieved successfully
[Nutrition] API response received: { ... }
[Nutrition] Plan cached successfully
```

#### ❌ What you're PROBABLY seeing (404 error):
```
[Nutrition] Profile loaded: { userId: 'xxx-xxx-xxx' }
[Nutrition] Fetching merged profile (async)...
[Nutrition] Merged profile: { ... }
[Nutrition] Built payload: { payload: {...}, missing: [] }
[Nutrition] Cache MISS - fetching from API
[Nutrition Plan] GET request for user xxxxxxxx
[Nutrition Plan] No plan found for user xxxxxxxx (status: pending)  ← KEY LOG
[Nutrition] Error: no_plan
```

The key log is: **`[Nutrition Plan] No plan found for user`**

This tells us the API endpoint is working, but the user has no plan in the database.

---

### Step 2: Check What's in Your Database

The most important question: **Does your user profile actually have a nutrition plan?**

Run this SQL query in **Supabase Studio → SQL Editor**:

```sql
-- Get the most recent user profiles with nutrition info
SELECT
  id,
  email,
  nutrition_status,
  nutrition_calories,
  CASE
    WHEN nutrition_plan IS NOT NULL THEN 'HAS PLAN ✓'
    ELSE 'NO PLAN ✗'
  END as plan_status,
  nutrition_fingerprint,
  nutrition_updated_at,
  created_at
FROM auth.users
JOIN public.profiles ON auth.users.id = profiles.id
ORDER BY profiles.created_at DESC
LIMIT 5;
```

**Look at your user row:**

#### Scenario A: You see `NO PLAN ✗` and `status = NULL`
**Problem:** You never completed onboarding, or the generating page didn't create a plan.

**Fix:** Go through onboarding from scratch:
1. Clear localStorage: DevTools → Application → Local Storage → Clear All
2. Go to `/onboarding/gender`
3. Fill ALL fields
4. Watch console for `[Generating] Draft saved (full)`
5. Complete signup

#### Scenario B: You see `NO PLAN ✗` and `status = pending`
**Problem:** The generating page created a pending draft, but the attach route failed to generate a real plan.

**Why this happens:**
- Generating page timed out (should be fixed now with 15s watchdog)
- Attach route failed to generate server-side
- OpenAI API error
- Network timeout

**Check server logs** (terminal where `pnpm dev` is running):
Look for:
```
[Attach] POST user=xxx fp=xxx
[Attach] Server-side generate start (days=1)
[Attach] Server-side generate response status=timeout  ← If you see this
```

**Fix:** Manually trigger attach route (see Step 4 below)

#### Scenario C: You see `HAS PLAN ✓` and `status = ready`
**Problem:** Database has a plan, but the client isn't receiving it.

**Why this happens:**
- Cached 404 response in browser
- localStorage has stale data
- API authentication issue

**Fix:**
1. Clear browser cache completely
2. Log out and log back in
3. Refresh the page
4. Check Network tab for `/api/nutrition/plan` response

---

### Step 3: Test the API Directly

Use the test script to call the API endpoint:

```bash
# 1. Get your JWT token:
#    - Open DevTools → Application → Local Storage
#    - Find key like: sb-<something>-auth-token
#    - Copy the "access_token" value

# 2. Run the test script:
export JWT='your-access-token-here'
./test_nutrition_api.sh
```

The script will tell you:
- HTTP status code (200 = success, 404 = no plan, 401 = auth error)
- Whether plan data exists in the response
- Your user ID for database queries

---

### Step 4: Manually Trigger Plan Generation

If your status is `pending` and you have no plan, you can manually trigger the attach route:

#### Get Your Data

First, extract the draft from localStorage:

1. Open DevTools (F12) → Console
2. Run this code:

```javascript
// Get the draft
const keys = Object.keys(localStorage);
const nutritionKey = keys.find(k => k.includes('nutrition-draft'));
if (nutritionKey) {
  const draft = JSON.parse(localStorage.getItem(nutritionKey));
  console.log('Draft:', draft);

  // Copy this JSON - you'll need it
  copy(JSON.stringify(draft, null, 2));
  console.log('Draft copied to clipboard!');
} else {
  console.log('No draft found in localStorage');
}
```

If you have a draft, it will be copied to your clipboard.

#### Call Attach Route Manually

Now call the attach route with your JWT token:

```bash
export JWT='your-jwt-token-here'

curl -X POST http://localhost:3000/api/nutrition/attach \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d '{
    "fingerprint": "your-fingerprint-from-draft",
    "plan": null,
    "status": "pending",
    "createdAt": 1234567890
  }'
```

This will trigger server-side generation with 20s timeout (10s + 10s retry).

Watch the server logs for:
```
[Attach] POST user=xxx fp=xxx
[Attach] Server-side generate start
[Attach] Server-side generate response status=success
[Attach] Plan saved (fingerprint: xxx)
```

---

### Step 5: Check Generating Page Behavior

The generating page should create a draft with a REAL plan before navigating away.

**Test the generating page:**

1. Clear localStorage
2. Go to `/onboarding/gender`
3. Fill all fields (use real values)
4. **Open DevTools Console FIRST**
5. Click button to generate plan

**Watch for these logs:**

```
[Generating] Start: 10%
[Generating] POST /api/ai/nutrition (days=1): 40%
[Generating] Draft saved (full) → navigate now  ← MUST SEE THIS
[Generating] Cleanup complete
```

**If you see this INSTEAD:**
```
[Generating] Watchdog fired → forcing finish  ← BAD! Means fix didn't work
```

That means the watchdog fix didn't apply. Verify:

```bash
grep "15000" /Users/netanelhadad/Projects/gymbro/apps/web/app/onboarding/generating/page.tsx
```

Should output: `}, 15000);`

If it says `}, 5000);` the file wasn't saved. Re-apply the fix:

```bash
cd /Users/netanelhadad/Projects/gymbro
git diff apps/web/app/onboarding/generating/page.tsx
```

Should show the change from 5000 to 15000.

---

### Step 6: Check Network Requests

**DevTools → Network tab** while on `/nutrition` page:

1. Refresh the page
2. Filter by "nutrition"
3. Click on the `plan` request (GET /api/nutrition/plan)

**Check:**
- Status code: Should be 200, probably showing 404
- Response Headers: Check for auth headers
- Response Body: What does it say?

**If 404:**
```json
{
  "ok": false,
  "error": "not_found",
  "message": "No nutrition plan found. Complete onboarding first."
}
```

This confirms: Database has no plan for this user.

**If 401:**
```json
{
  "ok": false,
  "error": "unauthorized",
  "message": "Authentication required"
}
```

This means: JWT token is invalid/expired. Log out and log back in.

---

## Common Scenarios & Fixes

### Scenario 1: Brand New User, Never Completed Onboarding

**Symptoms:**
- Database: `NO PLAN`, `status = NULL`
- Console: No `[Generating]` logs
- Never saw the generating page

**Fix:**
Go through complete onboarding flow from `/onboarding/gender`

---

### Scenario 2: Completed Onboarding, But Watchdog Fired Too Early

**Symptoms:**
- Database: `NO PLAN`, `status = pending`
- Console: `[Generating] Watchdog fired → forcing finish` (before 15s)
- Draft in localStorage has `status: 'pending'`, `plan: null`

**Fix:**
1. Verify watchdog fix was applied (should be 15000ms, not 5000ms)
2. Restart Next.js dev server: `pkill -f next-server && pnpm dev`
3. Clear localStorage and try onboarding again

---

### Scenario 3: Generating Page Created Plan, But Attach Failed

**Symptoms:**
- Database: `NO PLAN`, `status = pending`
- Console: `[Generating] Draft saved (full)` ✓
- Draft in localStorage has a real plan object
- Server logs: `[Attach] Server-side generate response status=timeout`

**Fix:**
Check OpenAI API key in `.env.local`:
```bash
grep OPENAI_API_KEY /Users/netanelhadad/Projects/gymbro/.env.local
```

Should output: `OPENAI_API_KEY=sk-...`

If missing, add it:
```bash
echo "OPENAI_API_KEY=your-key-here" >> /Users/netanelhadad/Projects/gymbro/.env.local
```

Then restart dev server.

---

### Scenario 4: Migration Not Applied

**Symptoms:**
- Server logs: `column "nutrition_calories" does not exist`
- Attach route fails with database error

**Fix:**
Re-run the migration SQL in Supabase Studio (I sent it earlier)

Verify with:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='profiles' AND column_name='nutrition_calories';
```

Should return 1 row. If not, migration wasn't applied.

---

## What To Send Me

If none of the above fixes work, send me:

1. **Browser console logs** (copy/paste from DevTools Console)
   - While loading `/nutrition` page
   - During onboarding (if you test it)

2. **Server logs** (from terminal where pnpm dev is running)
   - Search for `[Attach]`
   - Search for `[Nutrition Plan]`
   - Any error stack traces

3. **Database query result:**
   ```sql
   SELECT id, nutrition_status, nutrition_calories,
          CASE WHEN nutrition_plan IS NOT NULL THEN 'YES' ELSE 'NO' END as has_plan
   FROM profiles
   ORDER BY created_at DESC LIMIT 1;
   ```

4. **Network tab screenshot** showing the `/api/nutrition/plan` request and response

5. **localStorage draft** (run the JavaScript code from Step 4 above)

This will help me pinpoint exactly where the flow is breaking.
