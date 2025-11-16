# PlanSession Architecture - Complete Refactor

## Overview

This document describes the new architecture for plan generation in the GymBro app. All plan generation (nutrition, workout, journey) now happens on the **GeneratingPage** during onboarding, and the **SignupClient** only handles user registration and attaching pre-generated plans.

## Key Changes

### Before (Old Architecture)
- **GeneratingPage**: Only created a pending nutrition draft (12s timeout)
- **SignupClient**: Called `/api/nutrition/attach` which did server-side generation (60s timeout)
- **Problem**: "Load failed" errors, long signup times, poor user experience

### After (New Architecture)
- **GeneratingPage**: Generates ALL plans (nutrition, workout, journey) with real progress tracking
- **SignupClient**: Only registers user and calls `/api/session/attach` to copy pre-generated plans
- **Benefit**: Fast signup, better error handling, resumable generation

---

## Core Components

### 1. PlanSession Storage (`/lib/planSession.ts`)

The `PlanSession` is a unified storage object that tracks generation of all plans.

```typescript
type PlanSession = {
  status: 'running' | 'done' | 'failed';
  deviceId: string;
  createdAt: number;
  updatedAt: number;

  nutrition?: NutritionPlanData;
  workout?: WorkoutPlanData;
  journey?: JourneyPlanData;

  progress: number; // 0-100
  message?: string; // User-facing message
};
```

**Key Functions:**
- `createPlanSession()` - Create new session
- `getPlanSession()` - Read current session
- `savePlanSession(session)` - Update session
- `updateNutritionPlan(data)` - Update nutrition data
- `updateWorkoutPlan(data)` - Update workout data
- `updateSessionProgress(progress, message)` - Update UI progress
- `markSessionDone()` - Mark session as complete
- `clearPlanSession()` - Clear session after signup

**Storage Location:** `localStorage` with key `gymbro:planSession:{deviceId}`

---

### 2. GeneratingPage (`/app/onboarding/generating/page.tsx`)

The main component that orchestrates plan generation.

**Flow:**

1. **Create or Resume Session** (0%)
   ```typescript
   let session = getPlanSession();
   if (!session || session.status === 'done') {
     session = createPlanSession();
   }
   ```

2. **Generate Nutrition Plan** (10% → 50%)
   - Update status to `'generating'`
   - Call `/api/ai/nutrition` with user profile
   - Save plan to session when ready
   - Update progress to 50%

3. **Generate Workout Plan** (50% → 80%) - Optional
   - Only if `WORKOUTS_ENABLED === true`
   - Call `/api/ai/workout` with user profile
   - Save plan to session when ready
   - Update progress to 80%

4. **Complete Session** (80% → 100%)
   - Mark session as `'done'`
   - Update progress to 100%
   - Navigate to `/onboarding/preview`

**Error Handling:**
- If nutrition generation fails → Continue with `status='failed'`
- If workout generation fails → Continue (workout is optional)
- User can click "המשך בכל זאת" (Continue Anyway) to skip generation

**Progress Thresholds:**
```typescript
const PROGRESS = {
  START: 0,
  NUTRITION_START: 10,
  NUTRITION_FETCHING: 30,
  NUTRITION_DONE: 50,
  WORKOUT_START: 50,
  WORKOUT_FETCHING: 60,
  WORKOUT_DONE: 80,
  JOURNEY_START: 80,
  JOURNEY_DONE: 95,
  COMPLETE: 100,
};
```

**Logs:**
```
[Generating] init (guarded, ranOnce=true)
[Generating] Starting nutrition generation...
[Generating] Nutrition generation completed {calories: 2500, fingerprint: "...", hasPlan: true}
[Generating] Nutrition plan ready
[Generating] Starting workout generation...
[Generating] Workout generation completed {hasPlan: true}
[Generating] Workout plan ready
[Generating] All generation complete → navigating to preview
```

---

### 3. Session Attach Route (`/app/api/session/attach/route.ts`)

Lightweight API route that copies pre-generated plans from PlanSession to the user's database profile.

**Flow:**

1. **Check Authentication**
   - Verify user is logged in
   - Get user ID

2. **Validate Session**
   - Check that request includes `session` object
   - Validate session structure

3. **Ensure Profile Exists**
   - Self-healing: Create profile if missing

4. **Attach Nutrition Plan**
   - If `nutrition.status === 'ready'`:
     ```sql
     UPDATE profiles SET
       nutrition_plan = plan,
       nutrition_fingerprint = fingerprint,
       nutrition_calories = calories,
       nutrition_status = 'ready',
       nutrition_updated_at = NOW()
     WHERE id = userId;
     ```
   - If `nutrition.status === 'failed'`:
     ```sql
     UPDATE profiles SET
       nutrition_plan = NULL,
       nutrition_status = 'pending',
       nutrition_updated_at = NOW()
     WHERE id = userId;
     ```

5. **Attach Workout Plan** (Future)
   - Currently logs but doesn't persist (table schema not ready)

6. **Attach Journey Data** (Future)
   - Currently logs but doesn't persist

**Response:**
```json
{
  "ok": true,
  "attached": {
    "nutrition": true,
    "workout": false,
    "journey": false
  }
}
```

**Logs:**
```
[SessionAttach] POST user=80e4de32 {nutrition: "ready", workout: undefined, journey: undefined}
[SessionAttach] Profile created successfully
[SessionAttach] Attaching nutrition plan...
[SessionAttach] Nutrition plan attached successfully
[SessionAttach] Session attached successfully {nutritionAttached: true, workoutAttached: false, journeyAttached: false}
```

---

### 4. SignupClient (`/app/signup/SignupClient.tsx`)

Simplified signup flow that only handles registration and session attachment.

**Old Flow (Removed):**
```typescript
// ❌ OLD: Called /api/nutrition/attach with 70s timeout
const attachRes = await fetch("/api/nutrition/attach", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(draft),
  signal: controller.signal,
});
```

**New Flow:**
```typescript
// ✅ NEW: Read PlanSession and call /api/session/attach
const planSession = getPlanSession();
if (planSession) {
  const attachRes = await fetch("/api/session/attach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session: planSession }),
  });

  clearPlanSession();
}
```

**Steps:**

1. **Register User** (`supabase.auth.signUp`)
2. **Save Goal to Profile** (from onboarding data)
3. **Bootstrap Avatar** (non-blocking)
4. **Attach Pre-Generated Plans** (fast, no generation)
5. **Bootstrap Journey Plan** (uses avatar)
6. **Clear Onboarding Data**
7. **Navigate to `/journey`**

**Logs:**
```
[Signup] PlanSession found: YES
[Signup] PlanSession details: {status: "done", nutrition: "ready", workout: undefined, journey: undefined}
[Signup] Calling session attach route...
[Signup] Session attach responded with status: 200
[Signup] Session attach response data: {ok: true, attached: {...}}
[Signup] Plans attached successfully {nutrition: true, workout: false, journey: false}
[Signup] PlanSession cleared
[Signup] Redirecting to /journey
```

---

## Files Modified

| File | Changes | Purpose |
|------|---------|---------|
| `/lib/planSession.ts` | Created | PlanSession storage and management |
| `/lib/storage.ts` | Exported `getDeviceId()` | Used by planSession |
| `/app/onboarding/generating/page.tsx` | Complete rewrite | Full plan generation orchestration |
| `/app/api/session/attach/route.ts` | Created | Attach pre-generated plans |
| `/app/signup/SignupClient.tsx` | Simplified | Removed generation logic |

---

## Migration Path

### For Existing Users

If a user has an old nutrition draft from before this refactor:

1. **GeneratingPage**:
   - Will create a new PlanSession
   - Old draft will be ignored
   - New plan will be generated

2. **SignupClient**:
   - Will look for PlanSession (new)
   - If not found, logs warning but continues
   - No error - user can still sign up

### Backward Compatibility

- ✅ Old `/api/nutrition/attach` route still exists (not removed)
- ✅ Old nutrition draft functions still exist (`readNutritionDraft`, etc.)
- ✅ If PlanSession not found, signup continues without error

---

## Benefits of New Architecture

### 1. Better User Experience
- **Real progress bar** (0-100%) with accurate updates
- **Resumable generation** - if user navigates away, session persists
- **Faster signup** - no generation during registration

### 2. Better Error Handling
- **No "Load failed" errors** - short HTTP requests
- **Graceful failures** - if nutrition fails, workout can still succeed
- **Retry support** - session tracks which plans failed

### 3. Better Scalability
- **Parallel generation** - can generate workout while nutrition is in progress (future)
- **Background generation** - can move to web workers (future)
- **Progress streaming** - can add SSE for real-time updates (future)

### 4. Better Debugging
- **Comprehensive logging** - every step logged with `[Generating]` prefix
- **Session inspection** - can inspect PlanSession in localStorage
- **Clear separation** - generation vs registration

---

## Testing Instructions

### 1. Fresh Onboarding Flow

1. **Clear app data**:
   ```javascript
   localStorage.clear();
   ```

2. **Go through onboarding** until GeneratingPage

3. **Watch console logs**:
   ```
   [Generating] init (guarded, ranOnce=true)
   [Generating] Starting nutrition generation...
   [PlanSession] Created new session {deviceId: "..."}
   [PlanSession] Updated nutrition {status: "generating"}
   [PlanSession] Saved {status: "running", progress: 30, nutrition: "generating", ...}
   [Generating] Nutrition generation completed {calories: 2500, ...}
   [PlanSession] Updated nutrition {status: "ready"}
   [Generating] All generation complete → navigating to preview
   [PlanSession] Marked session as done
   ```

4. **Check localStorage**:
   ```javascript
   const session = JSON.parse(localStorage.getItem('gymbro:planSession:device-...'));
   console.log(session);
   // Should show: {status: "done", nutrition: {status: "ready", plan: {...}}, ...}
   ```

5. **Complete signup**

6. **Watch signup logs**:
   ```
   [Signup] PlanSession found: YES
   [Signup] Calling session attach route...
   [SessionAttach] POST user=...
   [SessionAttach] Nutrition plan attached successfully
   [Signup] Plans attached successfully
   [Signup] PlanSession cleared
   ```

7. **Check database**:
   ```sql
   SELECT id, nutrition_status, nutrition_calories,
          jsonb_typeof(nutrition_plan) as plan_type
   FROM profiles
   WHERE id = 'YOUR_USER_ID';
   -- Should show: nutrition_status='ready', plan_type='object'
   ```

### 2. Error Scenario Testing

**Test nutrition generation failure:**

1. **Modify `/api/ai/nutrition`** to return error:
   ```typescript
   return NextResponse.json({ ok: false, error: "mock_error" }, { status: 500 });
   ```

2. **Go through onboarding**

3. **Watch logs**:
   ```
   [Generating] Nutrition generation failed: Nutrition API failed: 500...
   [PlanSession] Updated nutrition {status: "failed"}
   [Generating] Continuing despite nutrition failure
   [Generating] All generation complete → navigating to preview
   ```

4. **Complete signup**

5. **Check database**:
   ```sql
   -- Should show: nutrition_status='pending', nutrition_plan=NULL
   ```

### 3. Resume Scenario Testing

**Test session resume:**

1. **Start generation**, wait for nutrition to reach 30%

2. **Close tab** (navigate away)

3. **Open tab again**, go back to GeneratingPage

4. **Should continue** from where it left off (session persists)

---

## Future Enhancements

### 1. Parallel Generation
Currently generates sequentially. Can be parallelized:

```typescript
const [nutritionResult, workoutResult] = await Promise.allSettled([
  generateNutritionPlan(controller.signal),
  generateWorkoutPlan(controller.signal),
]);
```

### 2. Web Workers
Move generation to web worker to avoid blocking UI:

```typescript
const worker = new Worker('/workers/generate.js');
worker.postMessage({ type: 'generateNutrition', payload: req });
worker.onmessage = (e) => {
  if (e.data.type === 'nutritionReady') {
    updateNutritionPlan(e.data.result);
  }
};
```

### 3. Server-Sent Events (SSE)
Stream progress from server in real-time:

```typescript
const eventSource = new EventSource('/api/ai/nutrition/stream');
eventSource.onmessage = (event) => {
  const { progress, message } = JSON.parse(event.data);
  updateSessionProgress(progress, message);
};
```

### 4. Background Generation
Allow user to navigate away while generation continues:

```typescript
// In GeneratingPage:
if (session.status === 'running') {
  startBackgroundGeneration();
  // Allow navigation to preview immediately
}

// In PreviewPage:
useEffect(() => {
  const session = getPlanSession();
  if (session?.status === 'running') {
    // Poll for completion
    const interval = setInterval(() => {
      const updated = getPlanSession();
      if (updated?.status === 'done') {
        clearInterval(interval);
        showCompletionToast();
      }
    }, 2000);
  }
}, []);
```

---

## Troubleshooting

### Issue: "No PlanSession found" during signup

**Cause**: User skipped GeneratingPage or cleared localStorage

**Solution**: Signup continues without error, but no plans are attached. User will see "No nutrition plan found" on nutrition page. Add a "Generate Plan" button to retry.

### Issue: PlanSession shows `status='running'` but generation stopped

**Cause**: User closed tab or app crashed during generation

**Solution**: When user returns to GeneratingPage, it will resume from last saved state. If session is very old (>1 hour), create a new one.

### Issue: Nutrition plan attached but showing wrong data

**Cause**: Fingerprint mismatch between generation and profile

**Solution**: Check that profile data hasn't changed between generation and signup. Add validation in attach route to compare fingerprints.

---

## Summary

This refactor achieves the goals stated in the requirements:

1. ✅ **All generation happens on GeneratingPage** - No generation during signup
2. ✅ **Real progress tracking** - 0-100% with accurate updates
3. ✅ **Lightweight signup** - Just copies pre-generated plans
4. ✅ **Better error handling** - Graceful failures, retry support
5. ✅ **Comprehensive logging** - Every step logged with clear prefixes
6. ✅ **Resumable generation** - Session persists if user navigates away

The new architecture provides a better user experience, clearer code organization, and sets the foundation for future enhancements like parallel generation and background processing.
