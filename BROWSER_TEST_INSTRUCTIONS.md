# Browser-Based End-to-End Nutrition Test

## Issue Found

The attach route uses Supabase SSR which **only works with HTTP cookies**, not Authorization headers.
This means `curl` with Bearer tokens won't work unless we modify the route.

## Solution: Test Via Browser Console

### Step 1: Open Browser and Log In

1. Open http://localhost:3000 in your browser
2. Log in with: `oegjle@jtgjnt.com` (or any account)
3. **Keep this tab open**

### Step 2: Open DevTools Console

Press F12 (or Cmd+Option+I on Mac) → Go to Console tab

### Step 3: Run This Script in Console

Copy and paste this entire script into the browser console:

```javascript
// End-to-End Nutrition Plan Test
async function testNutritionFlow() {
  console.log('=== Nutrition Flow End-to-End Test ===\n');

  // Step 1: Call attach route
  console.log('Step 1: POST /api/nutrition/attach');
  console.log('--------------------------------------');

  const attachResponse = await fetch('/api/nutrition/attach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'pending',
      fingerprint: 'browser-test-001'
    })
  });

  const attachData = await attachResponse.json();
  console.log('Status:', attachResponse.status);
  console.log('Response:', attachData);
  console.log('');

  // Check for retry needed
  if (attachData.error === 'pending') {
    console.log('⚠️  Generation pending, retrying in 10s...');
    await new Promise(r => setTimeout(r, 10000));

    console.log('Retry 1/2...');
    const retry1 = await fetch('/api/nutrition/attach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'pending',
        fingerprint: 'browser-test-001'
      })
    });

    const retry1Data = await retry1.json();
    console.log('Status:', retry1.status);
    console.log('Response:', retry1Data);
    console.log('');

    if (retry1Data.error === 'pending') {
      console.log('⚠️  Still pending, final retry in 10s...');
      await new Promise(r => setTimeout(r, 10000));

      console.log('Retry 2/2...');
      const retry2 = await fetch('/api/nutrition/attach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'pending',
          fingerprint: 'browser-test-001'
        })
      });

      const retry2Data = await retry2.json();
      console.log('Status:', retry2.status);
      console.log('Response:', retry2Data);
      console.log('');
    }
  }

  // Step 2: Fetch the plan
  console.log('Step 2: GET /api/nutrition/plan');
  console.log('-----------------------------------');

  const planResponse = await fetch('/api/nutrition/plan');
  const planData = await planResponse.json();

  console.log('Status:', planResponse.status);
  console.log('Response:', planData);
  console.log('');

  // Summary
  console.log('=== SUMMARY ===');
  console.log('');

  if (attachData.ok && attachData.saved) {
    console.log('✅ Attach: SUCCESS - Plan created and saved');
    console.log('   Calories:', attachData.calories);
    console.log('   Fingerprint:', attachData.fingerprint);
  } else if (attachData.ok && !attachData.saved) {
    console.log('ℹ️  Attach: SKIPPED - Plan already exists with same fingerprint');
  } else {
    console.log('❌ Attach: FAILED');
    console.log('   Error:', attachData.error);
    console.log('   Message:', attachData.message);
  }

  console.log('');

  if (planResponse.status === 200 && planData.ok) {
    console.log('✅ Plan API: SUCCESS - Plan retrieved');
    console.log('   Calories:', planData.calories);
    console.log('   Fingerprint:', planData.fingerprint);
    console.log('   Days:', planData.plan?.days?.length || 0);
    console.log('   Updated:', planData.updatedAt);
  } else {
    console.log('❌ Plan API: FAILED');
    console.log('   Status:', planResponse.status);
    console.log('   Error:', planData.error);
  }

  console.log('');
  console.log('=== TEST COMPLETE ===');

  return { attach: attachData, plan: planData };
}

// Run the test
testNutritionFlow().then(results => {
  console.log('\n📊 Full Results Object:');
  console.log(results);
}).catch(err => {
  console.error('❌ Test failed with error:', err);
});
```

### Step 4: Watch Server Logs

While the test runs, watch your terminal where `pnpm dev` is running.

**Expected logs:**

```
[Attach] POST user=8ad7e90a fp=browser-test-001
[Attach] Server-side generate start (days=1)
[Attach] Server-side generate response status=success
[Attach] Parsed hasPlan=true days=1
[Attach] Plan saved (fingerprint: browser-test-001)
```

### Step 5: Verify in Database

After the test completes, run this SQL in Supabase Studio:

```sql
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

**Expected result:**

| plan_type | nutrition_status | nutrition_calories | nutrition_fingerprint |
|-----------|------------------|-------------------|-----------------------|
| object    | ready            | ~2000             | browser-test-001      |

---

## Expected Browser Console Output

### Success Case:

```
=== Nutrition Flow End-to-End Test ===

Step 1: POST /api/nutrition/attach
--------------------------------------
Status: 200
Response: {ok: true, saved: true, fingerprint: "browser-test-001", calories: 2000}

Step 2: GET /api/nutrition/plan
-----------------------------------
Status: 200
Response: {ok: true, plan: {...}, fingerprint: "browser-test-001", calories: 2000, updatedAt: "2025-11-02T..."}

=== SUMMARY ===

✅ Attach: SUCCESS - Plan created and saved
   Calories: 2000
   Fingerprint: browser-test-001

✅ Plan API: SUCCESS - Plan retrieved
   Calories: 2000
   Fingerprint: browser-test-001
   Days: 1
   Updated: 2025-11-02T12:34:56.789Z

=== TEST COMPLETE ===
```

### Timeout Case:

```
=== Nutrition Flow End-to-End Test ===

Step 1: POST /api/nutrition/attach
--------------------------------------
Status: 200
Response: {ok: false, error: "pending", fingerprint: "browser-test-001"}

⚠️  Generation pending, retrying in 10s...
Retry 1/2...
Status: 200
Response: {ok: false, error: "pending", fingerprint: "browser-test-001"}

⚠️  Still pending, final retry in 10s...
Retry 2/2...
Status: 200
Response: {ok: false, error: "pending", fingerprint: "browser-test-001"}

Step 2: GET /api/nutrition/plan
-----------------------------------
Status: 404
Response: {ok: false, error: "not_found", message: "No nutrition plan found..."}

=== SUMMARY ===

❌ Attach: FAILED
   Error: pending
   Message: undefined

❌ Plan API: FAILED
   Status: 404
   Error: not_found

=== TEST COMPLETE ===
```

---

## Troubleshooting

### "401 Unauthorized"

**Cause:** Not logged in

**Fix:** Make sure you're logged in at http://localhost:3000 before running the script

### "Generation pending" on all 3 attempts

**Cause:** Server-side generation timing out (takes >20s total)

**Possible reasons:**
- OpenAI API key missing/invalid
- OpenAI API slow
- Network issues

**Check:** Look at server terminal for error logs

### "Network error" or fetch fails

**Cause:** Dev server not running

**Fix:**
```bash
cd /Users/netanelhadad/Projects/gymbro/apps/web
pnpm dev
```

---

## Why curl Doesn't Work

The attach route uses `createClient()` from Supabase SSR, which:
- Only reads cookies (via `cookies()` from Next.js)
- Does NOT support Authorization header
- This is by design for server-side rendering

To support curl testing, we would need to modify the route to also accept Bearer tokens.

---

## Alternative: Quick Route Modification for curl Testing

If you need curl to work, temporarily add this at the top of the POST handler in `attach/route.ts`:

```typescript
// Temporary: Support Authorization header for testing
const authHeader = req.headers.get('authorization');
if (authHeader?.startsWith('Bearer ')) {
  const token = authHeader.substring(7);
  // Create client with token...
}
```

But this is not recommended for production - better to test via browser.
