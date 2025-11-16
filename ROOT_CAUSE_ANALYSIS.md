# Root Cause Analysis: Why Nutrition Plans Stopped Working

## TL;DR

**Authentication is NOT the issue.** The attach route IS being called successfully from the Capacitor app.

**The real problem**: AI generation is timing out (>20 seconds), so the attach route returns `error: "pending"` and no plan gets saved.

---

## Evidence

### 1. Error Message Analysis

**From Xcode logs** (you reported):
```
[Signup] Draft found: YES
[Signup] Failed to attach nutrition draft: pending
```

**Key observation**: The error is `"pending"`, not `"unauthorized"`.

**What this means**:
- ✅ The attach route WAS called successfully (no auth error)
- ✅ Authentication worked (otherwise would see "unauthorized")
- ❌ Server-side generation timed out
- ❌ Returned `{ok: false, error: "pending"}` (line 265-269 of attach/route.ts)

### 2. curl Test Was a Red Herring

The curl test failed with 401 because:
- Capacitor apps use cookie-based auth (set by Supabase automatically)
- curl with `Authorization: Bearer` header doesn't work with Supabase SSR
- But the ACTUAL app flow (fetch from SignupClient) works fine with cookies

### 3. Server-Side Generation Timeout

**Current timeout configuration**:
- First attempt: 10 seconds
- Retry: 10 seconds
- **Total: 20 seconds**

**What happens**:
1. User signs up → calls attach route
2. Attach route calls `generateNutritionPlanWithTimeout(payload, 10000)`
3. OpenAI API takes > 10 seconds
4. Timeout → retry with another 10 seconds
5. Still times out
6. Returns `{error: "pending"}` to client
7. Database gets `nutrition_status = 'pending'`, `nutrition_plan = NULL`

---

## Why Did It Work Before?

Checking git history and file status:

```bash
$ git status apps/web/app/api/nutrition/
Untracked files:
  apps/web/app/api/nutrition/
```

**The entire nutrition API directory is untracked** - meaning it was created in a recent conversation session.

### Hypothesis: Different Implementation Before

Looking at git commits, there was a commit on Oct 16, 2025:
> "fix: add mock API routes for plan generation"
> "Created mock API endpoints for /ai/nutrition"

This suggests:
1. **Before**: Nutrition generation might have been client-side only or used different endpoints
2. **After**: New attach route with server-side generation was created
3. **Current**: Server-side generation times out due to 20s limit

---

## The Real Question

**Why is generation taking > 20 seconds?**

Possible reasons:

### A. OpenAI API Latency
- API might be slow/overloaded
- Network latency
- Model response time varies

### B. Generation Logic Complexity
Check `/lib/server/nutrition/generate.ts`:
- Multiple prompts/attempts?
- Large context?
- Complex validation?

### C. Timeout Too Short
20 seconds might not be enough for:
- AI model processing
- Retries
- Validation + diet compliance checks

---

## How It Flows In Reality

### Capacitor App Flow:

```
1. User completes onboarding
   ↓
2. Generating page creates draft in Capacitor Preferences
   └─> status: "pending", plan: null
   ↓
3. User signs up → creates session
   └─> Session stored in Capacitor Preferences
   └─> Supabase also sets HTTP cookies in WebView
   ↓
4. SignupClient calls fetch("/api/nutrition/attach")
   └─> Cookies automatically included (same-origin)
   ↓
5. Attach route reads session from cookies ✅
   ↓
6. Calls generateNutritionPlanWithTimeout(10000)
   ↓
7. Waits 10s → timeout → retry 10s → timeout again
   ↓
8. Returns {error: "pending"}
   ↓
9. Database: nutrition_status = 'pending', nutrition_plan = NULL
   ↓
10. User sees: "לא נמצאה תוכנית תזונה"
```

---

## Solutions

### Option 1: Increase Timeout (Quick Fix)

In `/apps/web/app/api/nutrition/attach/route.ts` line 58 and 82:

```typescript
// Change from:
const result = await generateNutritionPlanWithTimeout(payload, 10000, {...});

// To:
const result = await generateNutritionPlanWithTimeout(payload, 30000, {...});
```

**New total**: 30s + 30s retry = 60 seconds

**Pros**:
- Simple change
- Might fix the issue if generation takes 20-40s

**Cons**:
- User waits longer during signup
- Still might timeout if API is very slow

### Option 2: Background Generation (Better)

Don't wait for generation during signup:

```typescript
// In attach route, for pending drafts:
// 1. Save immediately with status='pending'
// 2. Trigger background job to generate
// 3. Return success to client
// 4. Client polls or shows "generating..." state
```

**Pros**:
- Signup completes immediately
- Generation can take as long as needed
- Better UX

**Cons**:
- More complex
- Need polling or websocket for status updates

### Option 3: Use Mock/Fallback Plan

For development, return a pre-made plan when generation times out:

```typescript
// In attach route, after timeout:
const fallbackPlan = {
  days: [{name: "יום 1", meals: [...]}],
  dailyTargets: {calories: 2000, protein_g: 150, ...},
  summary: "תוכנית זמנית"
};

return {
  ok: true,
  hasPlan: true,
  plan: fallbackPlan,
  fingerprint: draft.fingerprint,
  calories: 2000
};
```

**Pros**:
- Always works
- Fast
- Good for development

**Cons**:
- Not real/personalized
- Should only be for dev mode

### Option 4: Optimize Generation

Check `/lib/server/nutrition/generate.ts` for optimizations:
- Reduce prompt size
- Use faster model (gpt-3.5-turbo vs gpt-4)
- Cache common patterns
- Simplify validation

---

## Recommended Fix (Immediate)

**For now, increase timeout to 30s per attempt** (total 60s):

```bash
# Edit attach route
cd /Users/netanelhadad/Projects/gymbro/apps/web

# Line 58 and 82, change 10000 to 30000
```

**Then test**:
1. Clear Capacitor Preferences in simulator
2. Go through onboarding
3. Sign up
4. Check if plan is created

**Watch server logs for**:
```
[Attach] Server-side generate start (days=1)
[Attach] Server-side generate response status=success  ← Should see this now
[Attach] Plan saved (fingerprint: ...)
```

---

## Long-Term Fix

Implement background generation:
1. Attach route saves pending immediately
2. Triggers async generation job
3. Client shows "Generating your plan..." with loading state
4. Poll `/api/nutrition/plan` every 5s until ready
5. Show plan when `nutrition_status = 'ready'`

This matches what real apps like MyFitnessPal do - they don't block signup on plan generation.

---

## Files to Modify

| File | Change | Line |
|------|--------|------|
| `apps/web/app/api/nutrition/attach/route.ts` | Change `10000` to `30000` | 58, 82 |

---

## Test After Fix

```javascript
// In browser console at http://localhost:3000 after login:
async function testAttach() {
  const res = await fetch('/api/nutrition/attach', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({status: 'pending', fingerprint: 'test-001'})
  });
  console.log(await res.json());
}
testAttach();
```

Should see: `{ok: true, saved: true, calories: ...}` (might take 20-60s)

---

## Summary

| What You Thought | What's Actually Happening |
|------------------|---------------------------|
| Auth is broken | ✅ Auth works fine via cookies |
| curl should work | ❌ curl won't work (needs cookies, not Bearer) |
| Code is broken | ✅ Code is correct, just timeout is too short |
| Nothing is being created | ✅ Things ARE being attempted, just timing out |

**The fix is simple**: Increase timeout from 10s to 30s (or implement background generation).
