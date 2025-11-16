# Fix: UI Stuck at 30% Despite Successful Generation

## Additional Issue Found

After fixing the AbortError, we discovered a **new issue**: the generation was **succeeding** but the **UI was stuck at 30%**.

### Evidence from Logs:
```
⚡️  [log] - [Generating] Nutrition generation completed {"calories":2900,"fingerprint":"00o7eak4","hasPlan":true}
⚡️  [log] - [PlanSession] Saved {"status":"done","progress":100}
⚡️  [log] - [Generating] All generation complete → navigating to preview
```

But the UI showed 30% progress bar, not 100%.

## Root Cause

With StrictMode enabled:

1. **First mount**: Effect starts async generation, updates UI state via `setUiProgress()`
2. **StrictMode unmounts**: Cleanup sets `mounted = false`
3. **First mount's async flow**: Continues running (we prevented abort ✓)
   - But now checks `if (mounted)` before calling `setUiProgress()`
   - Since `mounted = false`, it **stops updating UI**
   - Still updates **PlanSession** in localStorage ✓
4. **StrictMode remounts**: Creates fresh component instance with new state
5. **Second mount's main effect**: Blocked by `ranOnce.current = true`
6. **Second mount's UI state**: Initialized to default (0), never updates
7. **Result**: PlanSession shows progress 100, but UI shows progress 0 (or wherever it was when first mount stopped updating)

## Solution: UI Polling Effect

Added a **separate effect that polls the session** every 500ms and syncs the UI:

```typescript
useEffect(() => {
  const syncUI = () => {
    const session = getPlanSession();
    if (!session) return;

    // Update UI to match session progress
    if (session.progress !== undefined && session.progress !== uiProgress) {
      console.log('[Generating] Syncing UI progress', { from: uiProgress, to: session.progress });
      setUiProgress(session.progress);
    }

    // Update message based on state
    if (session.status === 'done') {
      setMessage('התוכניות מוכנות!');
    } else if (session.nutrition?.status === 'generating') {
      setMessage('מייצר תפריט אישי...');
    }
    // ... etc

    // Navigate when done
    if (session.status === 'done' && session.progress === 100) {
      hardNavigate(router, '/onboarding/preview');
    }
  };

  // Sync immediately on mount
  syncUI();

  // Poll every 500ms
  const interval = setInterval(syncUI, 500);

  return () => clearInterval(interval);
}, [uiProgress, router]);
```

### Why This Works:

✅ **Runs on every mount** (including StrictMode remounts) - not blocked by `ranOnce`
✅ **Polls session** every 500ms to detect progress changes
✅ **Updates UI state** to match session, even if main effect is blocked
✅ **Handles all states**: generating, ready, failed, done
✅ **Navigates when done** even if main effect didn't run
✅ **Cleans up interval** on unmount (no memory leaks)

## Files Modified

### [apps/web/app/onboarding/generating/page.tsx](apps/web/app/onboarding/generating/page.tsx)

**Changes:**
- Added new polling effect (lines 161-204) that:
  - Runs on every mount (not blocked by ranOnce)
  - Syncs UI progress with session every 500ms
  - Updates message based on session state
  - Navigates to preview when done
  - Cleans up interval on unmount

## How It Works Now

### StrictMode Mount/Unmount/Remount Cycle:

1. **First Mount**:
   - Polling effect starts, syncs UI with session
   - Main effect starts generation (guarded by ranOnce)

2. **StrictMode Unmount**:
   - Polling effect cleanup: clears interval
   - Main effect cleanup: sets mounted = false, doesn't abort (generation protected)

3. **StrictMode Remount**:
   - **Polling effect runs again** (not guarded!) ✓
   - Reads session.progress, updates UI ✓
   - Continues polling every 500ms ✓
   - Main effect blocked by ranOnce (generation already running from first mount)

4. **Generation Completes** (from first mount):
   - Updates PlanSession to progress 100, status done

5. **Polling detects completion**:
   - Reads session.progress = 100
   - Updates UI: `setUiProgress(100)` ✓
   - Navigates to preview ✓

### Timeline with Logs:

```
[Mount 1] Polling effect: sync UI (progress 0)
[Mount 1] Main effect: start generation
[Mount 1] Session saved: progress 30
[Unmount] Cleanup: mounted = false, generation continues
[Mount 2] Polling effect: sync UI (progress 30) ← UI UPDATES!
[Mount 2] Main effect: BLOCKED by ranOnce
[Background] Generation completes
[Background] Session saved: progress 100
[Polling] Detects progress 100 ← UI UPDATES AGAIN!
[Polling] Navigates to preview ✓
```

## Testing

Clear localStorage and go through onboarding:

```javascript
localStorage.clear()
```

### Expected Logs:

```
[Generating] Syncing UI progress { from: 0, to: 10 }
[Generating] Syncing UI progress { from: 10, to: 30 }
[Generating] Component unmounting but generation in progress - not aborting
[Generating] Syncing UI progress { from: 30, to: 50 }
[Generating] Syncing UI progress { from: 50, to: 100 }
[Generating] Session done, navigating to preview
```

### What You Should See:

✅ Progress bar smoothly updates from 0 → 10 → 30 → 50 → 100
✅ No stuck at 30%
✅ Automatically navigates to preview when done
✅ Even if StrictMode remounts, UI stays in sync

## Summary

The UI was stuck because:
- StrictMode unmount stopped the main effect from updating UI
- StrictMode remount blocked the main effect from running again
- Session was updating correctly, but UI wasn't syncing with it

The fix:
- Added a **polling effect** that runs on every mount (not guarded)
- Polls PlanSession every 500ms
- Updates UI to match session progress
- Works even when main effect is blocked by StrictMode

**Now the UI always stays in sync with the actual generation progress!**
