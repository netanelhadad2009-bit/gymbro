# Developer Notes: Onboarding Refactor

## Quick Reference

### Endpoints Changed
```
❌ REMOVED CALLS (endpoints still exist):
  POST /api/ai/days         - No longer called from client
  POST /api/ai/workout      - Returns { disabled: true } if flag=false

✅ NEW ENDPOINTS:
  POST /api/nutrition/attach   - Migrate draft to user
  GET  /api/nutrition/plan     - Retrieve persisted plan

🔧 MODIFIED BEHAVIOR:
  POST /api/ai/nutrition       - Clamps days to 1
  POST /api/journey/plan/bootstrap - Idempotent (checks journey_bootstrapped)
```

### Feature Flags
```typescript
// apps/web/lib/config.ts
WORKOUTS_ENABLED = false  // Hard-disabled
NUTRITION_DAYS = 1        // Fixed to 1 day
```

### Flow Diagram

```
BEFORE:
Onboarding → [/ai/days, /ai/workout, /ai/nutrition (7 days)] → localStorage draft
                                                                      ↓
Signup → Check draft → If missing: regenerate all → commitProgram → DB
                                                                      ↓
Nutrition tab → Cache miss → POST /ai/nutrition (regenerate)

AFTER:
Onboarding → [/ai/nutrition (1 day)] → saveNutritionDraft(device-scoped)
                                              ↓
Signup → readNutritionDraft → POST /api/nutrition/attach → profiles.nutrition_plan
                                                                 ↓
                            → POST /api/journey/plan/bootstrap (once) → profiles.journey_bootstrapped=true
                                                                 ↓
Nutrition tab → GET /api/nutrition/plan (no regeneration)
```

## Implementation Details

### 1. Workout Disable Strategy

**Why not delete the workout code?**
- Kept for potential re-enable in future
- Feature flag allows quick toggle without code changes
- API still exists but returns early

**What happens when disabled?**
```typescript
// apps/web/app/api/ai/workout/route.ts
if (!WORKOUTS_ENABLED) {
  return { ok: false, disabled: true }  // No validation error
}
```

**Why return `ok: false` instead of 200?**
- Prevents callers from treating it as success
- Logs show "disabled" reason clearly
- Avoids silent failures

### 2. Nutrition Days Clamping

**Why clamp on server instead of client-only?**
- Belt-and-suspenders: ensures no client can bypass
- Prevents accidental multi-day requests from old code paths
- Server is source of truth

**Implementation:**
```typescript
// apps/web/app/api/ai/nutrition/route.ts
if (body.days !== NUTRITION_DAYS) {
  console.log(`Clamping days from ${body.days} to ${NUTRITION_DAYS}`);
  body.days = NUTRITION_DAYS;
}
```

### 3. Draft Storage Architecture

**Why device-scoped instead of global?**
- Prevents cross-device collision if user starts onboarding on phone, finishes on desktop
- Each device gets its own stable ID
- Migration to user account happens on signup

**Storage keys:**
```
Device ID:         gymbro:deviceId
Nutrition Draft:   gymbro:nutritionDraft:{deviceId}
User Nutrition:    gymbro:nutritionPlan:{userId}:{fingerprint}
```

**Draft structure:**
```typescript
{
  plan: NutritionPlanT,
  fingerprint: string,  // Hash of profile inputs
  calories: number,     // For quick display
  createdAt: number,    // Timestamp
}
```

### 4. Journey Bootstrap Idempotency

**Why both DB flag and chapter check?**
- DB flag is fast (single column read)
- Chapter check is belt-and-suspenders (ensures data consistency)
- If flag is false but chapters exist → set flag and return existing

**Idempotency guarantees:**
1. First call: Creates chapters, sets `journey_bootstrapped=true`
2. Second call: Returns early after checking flag
3. If flag missing but chapters exist: Sets flag, returns chapters

**Why not use a transaction?**
- Bootstrap is expensive (creates many rows)
- Flag check is cheap and sufficient
- Worst case: duplicate chapters (prevented by hasExistingPlan check)

### 5. Nutrition Attach vs. Commit

**Why create new /attach endpoint instead of reusing /commit?**
- Semantic clarity: "attach" = migrate draft, "commit" = generate fresh
- Attach skips generation, just persists to DB
- Allows different validation/logging for each path

**What /attach does:**
```typescript
1. Check auth
2. Parse draft from request body
3. UPDATE profiles SET
     nutrition_plan = plan,
     nutrition_fingerprint = fingerprint,
     nutrition_calories = calories
4. Return { ok: true }
```

**Why store in profiles table instead of dedicated table?**
- Current implementation (may change in future)
- One row per user = simple
- Easy to join with other profile data
- Can migrate to dedicated table later without API changes

### 6. Mutation Safety

**Why clear draft after attach?**
- Prevents stale data
- Ensures single source of truth (database)
- Frees up localStorage space

**What if attach fails?**
- Draft remains in localStorage
- User can retry signup
- On success, draft is cleared

**What if user signs up on different device?**
- Draft is device-scoped
- No draft found on new device
- Acceptable: user can regenerate or use existing plan from account

### 7. Logging Philosophy

**New logging pattern:**
```typescript
// Concise, structured
console.log("[Pipeline] Starting nutrition (1-day)...");
console.log(`[Pipeline] Nutrition done in ${ms}ms`);
console.log(`[Signup] Migrated draft to user ${uid.substring(0, 8)}`);
```

**What to log:**
- ✅ State transitions (starting, done, migrated)
- ✅ Performance metrics (time in ms)
- ✅ Idempotency hits (already bootstrapped)
- ❌ Noisy debug info (unless NEXT_PUBLIC_LOG_CACHE=1)
- ❌ Full objects (use concise summaries)

### 8. Error Handling Strategy

**Nutrition generation failure:**
- Retry once automatically
- If both fail: show error to user
- Don't save bad draft

**Attach failure during signup:**
- Log error but don't block signup
- User account is created
- Can regenerate plan later from nutrition tab

**Bootstrap failure during signup:**
- Log warning but don't block signup
- User can access app without journey
- Can manually trigger bootstrap later

**Philosophy:** Graceful degradation over blocking users

### 9. Cache Invalidation

**When to clear nutrition cache:**
- Profile changes (height, weight, goals, etc.)
- Fingerprint mismatch detected
- User explicitly refreshes

**How fingerprint works:**
```typescript
// Normalized hash of profile inputs
{
  gender: "זכר" → "זכר",
  age: 28,
  height: 175,
  weight: 75,
  // ... etc
}
→ Hash → "a3f9e2b1"
```

**Why fingerprint in draft?**
- Detects if onboarding inputs changed
- Prevents using stale plan for different goals
- Cheap comparison vs. deep object equality

### 10. Future Improvements

**Potential enhancements:**
```typescript
// 1. Background pre-generation during onboarding
// Generate plan while user fills out forms
// Save to cache before "generating" page

// 2. Incremental plan updates
// Change only affected days when profile changes
// Don't regenerate full plan

// 3. Plan versioning
// Track plan schema version
// Migrate old plans on read

// 4. A/B test multi-day vs single-day
// Compare user retention/engagement
// Feature flag per cohort
```

## Debugging Tips

### Check if draft exists
```typescript
// Browser console
JSON.parse(localStorage.getItem('gymbro:nutritionDraft:device-...'))
```

### Check if user has plan
```sql
-- Supabase SQL
SELECT nutrition_plan, nutrition_calories, journey_bootstrapped
FROM profiles
WHERE id = 'user-id-here';
```

### Force re-generation
```typescript
// Browser console
localStorage.clear();
// Then go through onboarding again
```

### Check bootstrap status
```sql
SELECT journey_bootstrapped, updated_at
FROM profiles
WHERE id = 'user-id-here';
```

### Network debugging
```
Enable: NEXT_PUBLIC_LOG_CACHE=1
Check network tab for:
  - POST /api/ai/nutrition (should be 1 call, days=1)
  - POST /api/nutrition/attach (during signup)
  - GET /api/nutrition/plan (when opening nutrition tab)
```

## Common Pitfalls

### ❌ Don't call /api/ai/nutrition from nutrition page
```typescript
// BAD
const plan = await fetch('/api/ai/nutrition', { method: 'POST', ... });

// GOOD
const plan = await fetch('/api/nutrition/plan', { method: 'GET' });
```

### ❌ Don't regenerate on cache miss
```typescript
// BAD
if (!cached) {
  generateNewPlan();  // Expensive!
}

// GOOD
if (!cached) {
  const plan = await fetchPersistedPlan();  // From DB
}
```

### ❌ Don't skip draft migration
```typescript
// BAD
if (!draft) {
  generateProgram();  // Duplicates work!
}

// GOOD
if (!draft) {
  // Just proceed - user will see empty state or can regenerate manually
}
```

## Questions & Answers

**Q: What if user completes onboarding but never signs up?**
A: Draft stays in localStorage indefinitely. Acceptable - user can return and sign up later.

**Q: What if user signs up on mobile, then logs in on desktop?**
A: Plan is in database, fetched via GET /api/nutrition/plan. Works across devices.

**Q: What if we want to enable workouts again?**
A: Set WORKOUTS_ENABLED=true, update generating page to include workout call, update signup to expect workoutText.

**Q: What if nutrition plan schema changes?**
A: Add version field, handle migration on read. Or invalidate all cached plans (clear by fingerprint pattern).

**Q: Why not use a queue for generation?**
A: Current flow is fast enough (<15s). If we add more complexity (multi-day, workouts), consider queue.

**Q: What about internationalization?**
A: Hebrew-specific logic is in nutrition API (diet tokens, prompts). Same flow works for other languages.

**Q: Can we pre-generate plans server-side?**
A: Yes - run generation in background job after onboarding step 1, save to Redis keyed by deviceId. Not implemented yet.

## Performance Notes

**Before refactor:**
- 3-4 parallel AI calls during onboarding
- ~25s total time (longest pole: workout generation)
- Retry logic for each call → 50s worst case
- Duplicate generation on signup if draft missing

**After refactor:**
- 1 AI call during onboarding
- ~15s total time (nutrition only)
- Single retry → 30s worst case
- No duplicate generation (migrate draft)

**Cost reduction:**
- 75% fewer AI API calls
- 60% less total generation time
- 90% fewer database writes (nutrition only vs. nutrition + workout + days)

**Metrics to track:**
- Time to complete onboarding (starttime → redirect)
- Signup success rate (before vs. after)
- Nutrition tab cold start time (cache miss flow)
- Bootstrap API latency (should be <200ms after idempotency)
