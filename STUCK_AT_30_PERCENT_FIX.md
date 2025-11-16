# Fix: "Stuck at 30%" AbortError Issue

## Problem

Nutrition generation was failing immediately with:
```
[Generating] Nutrition generation failed: {"name":"AbortError","message":"Fetch is aborted","stack":"","response":{}}
```

The request was being aborted before it even reached the server (no `[AI][Nutrition]` logs appeared).

## Root Cause

**React StrictMode** is enabled in [next.config.js](apps/web/next.config.js:3):
```javascript
reactStrictMode: true
```

In development, StrictMode intentionally:
1. Mounts components
2. Unmounts components (triggers cleanup)
3. Remounts components

The issue occurred because:

### Timeline of the Bug:
1. **First Mount**: Component mounts, `useEffect` runs
2. `ranOnce.current` is set to `true` (persists across unmounts!)
3. `AbortController` is created
4. Async generation starts
5. **StrictMode Unmount**: React unmounts the component
6. **Cleanup function runs**: `controller.abort('unmount')` is called
7. **Fetch aborts**: Throws `AbortError`
8. **Second Mount**: Component remounts
9. **Effect doesn't run**: `ranOnce.current` is still `true`, so effect is skipped
10. **Result**: Aborted fetch, no retry, stuck at 30%

### Why the Guard Failed:

The original code had:
```typescript
let isGenerating = false; // Local variable in effect scope

// Later...
const cleanup = () => {
  if (!isGenerating) { // Checks CLOSURE value, not current value
    controller.abort('unmount');
  }
};
```

The problem: **closures capture values at creation time**. When the cleanup function was created, `isGenerating` was `false`. Even if it changed to `true` later, the cleanup still saw `false`.

## Solution

### 1. Use a Ref Instead of Local Variable

Changed from local variable to `useRef` so cleanup always checks the **current** value:

```typescript
const isGeneratingRef = useRef(false);

// Set to true at the very start of async flow
isGeneratingRef.current = true;

// Cleanup checks current value
const cleanup = () => {
  if (!isGeneratingRef.current) { // Always checks latest value
    controller.abort('unmount');
  }
};
```

### 2. Set Flag Immediately

Set `isGeneratingRef.current = true` at the **very beginning** of the async IIFE, before any await points:

```typescript
(async () => {
  try {
    // Mark as generating IMMEDIATELY to prevent StrictMode abort
    isGeneratingRef.current = true;

    // ... rest of generation flow
  }
})();
```

### 3. Add Proper 30-Second Timeout

The code had a comment "Call API with timeout" but **no timeout was actually set**. Added:

```typescript
const timeoutId = setTimeout(() => {
  console.warn('[Generating] Nutrition generation timeout (30s)');
  controller.abort('timeout');
}, 30000);

try {
  const result = await generateNutritionPlan(controller.signal);
  clearTimeout(timeoutId); // Clear on success
} catch (err) {
  clearTimeout(timeoutId); // Clear on error
  throw err;
}
```

### 4. Reset Flag at End of Flow

Set `isGeneratingRef.current = false` at:
- End of successful generation (before navigation)
- In catch block for fatal errors
- After each individual generation step completes/fails

## Files Modified

### [apps/web/app/onboarding/generating/page.tsx](apps/web/app/onboarding/generating/page.tsx)

**Changes:**
1. Added `isGeneratingRef` ref (line 157)
2. Set `isGeneratingRef.current = true` at start of async flow (line 171)
3. Added 30-second timeout for nutrition generation (lines 210-213)
4. Changed all `isGenerating` to `isGeneratingRef.current`
5. Reset flag after completion (line 356) and in catch (line 360)
6. Updated cleanup to check ref value (line 373)
7. Added same timeout logic to retry function (lines 409-412)

## Testing

### Before Fix:
```
[Generating] Starting nutrition generation...
[Generating] Nutrition generation failed: {"name":"AbortError","message":"Fetch is aborted"}
```
- No server logs
- Immediate abort
- Stuck at 30%

### After Fix:
- Request should reach server
- Server logs `[AI][Nutrition] POST request received`
- 30-second timeout instead of immediate abort
- StrictMode unmount doesn't interrupt generation

### How to Test:

1. **Clear localStorage**:
   ```javascript
   localStorage.clear()
   ```

2. **Go through onboarding** to GeneratingPage

3. **Check both consoles**:
   - **Browser**: Should see `[Generating]` logs without AbortError
   - **Server terminal**: Should see `[AI][Nutrition]` logs

4. **If it still fails**:
   - Check server logs for actual error (OpenAI, validation, etc.)
   - Check if it's a timeout (30s)
   - Use retry button to try again

### Quick Test Without Onboarding:

Use the test utilities:
- **Browser**: http://localhost:3000/test-nutrition.html
- **Console**: `testNutrition()`
- **Node.js**: `node test-nutrition-node.js`

## Why This Fix Works

### Prevents StrictMode Abort:
✅ `isGeneratingRef` is set to `true` immediately, before any async operations
✅ Cleanup checks the **current** ref value, not a stale closure value
✅ Even if StrictMode unmounts during generation, cleanup sees `isGeneratingRef.current = true` and doesn't abort

### Proper Timeout:
✅ 30-second timeout is now actually set
✅ Timeout is cleared on success or failure (no memory leaks)
✅ Timeout fires with clear log message

### Retry Support:
✅ Retry function has same timeout logic
✅ User can retry after timeout or other errors
✅ Each retry gets a fresh 30-second window

## Alternative Solution (Not Implemented)

If the issue persists, you could **disable StrictMode for this page only**:

```typescript
// apps/web/app/onboarding/generating/layout.tsx (create new file)
export default function GeneratingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

Then in `next.config.js`:
```javascript
// Disable StrictMode globally
reactStrictMode: false,
```

**However, this is NOT recommended** because StrictMode helps catch bugs. The ref-based solution is better.

## Expected Behavior Now

### Successful Case:
```
[Generating] init (guarded, ranOnce=true)
[Generating] Starting nutrition generation...
[AI][Nutrition] POST request received
[AI][Nutrition] Request payload { ... }
[AI][Nutrition] Starting generation { model: 'gpt-4o-mini', days: 1 }
[AI][Nutrition] OpenAI request starting { ... }
[AI][Nutrition] OpenAI request completed { elapsed_ms: 15234 }
[AI][Nutrition] Generation successful { calories: 2500, ... }
[Generating] Nutrition generation completed { calories: 2500, ... }
[Generating] Nutrition plan ready
```

### Timeout Case (after 30s):
```
[Generating] Starting nutrition generation...
[AI][Nutrition] POST request received
[AI][Nutrition] OpenAI request starting { ... }
[Generating] Nutrition generation timeout (30s)
[Generating] Nutrition generation failed: {"name":"AbortError","message":"The operation was aborted"}
```
Then user can click "Retry" button.

### Diet Violation Case (model error):
```
[Generating] Starting nutrition generation...
[AI][Nutrition] POST request received
[AI][Nutrition] OpenAI request completed { elapsed_ms: 15234 }
[AI][Nutrition] Generation failed: { message: "Diet violation: ..." }
[Generating] Nutrition generation failed: {"name":"Error","message":"Nutrition API failed: 422 ..."}
```
Then user can click "Retry" button (often succeeds on 2nd try).

## Summary

The "stuck at 30%" issue was caused by **React StrictMode** aborting the fetch during unmount/remount cycles. The fix uses a **ref instead of a local variable** so the cleanup function always checks the current generation state, preventing premature aborts.

Additionally, a **proper 30-second timeout** was added (it was commented but not implemented), and the same logic was applied to the retry function.

**The request should now reach the server and complete successfully, or timeout after 30 seconds with a clear error message.**
