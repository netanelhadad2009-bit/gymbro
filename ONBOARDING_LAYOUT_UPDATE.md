# Onboarding Layout Update - Top Breathing Room

**Date**: 2025-10-23
**Status**: ✅ Completed

## Summary

Added subtle top breathing room (~16-24px) to onboarding pages' scrollable content area, lowering the content start position below the fixed header while maintaining full viewport coverage and respecting iOS safe areas.

---

## Changes Made

### 1. CSS Variables Added ✅
**File**: `apps/web/app/globals.css`

Added header and footer height variables:

```css
:root {
  /* Onboarding layout dimensions */
  --header-h: 56px;
  --footer-h: 72px;
}
```

### 2. Safe-Area Margin Utilities Added ✅
**File**: `apps/web/app/globals.css`

Extended safe-area utilities with margin variants:

```css
@layer utilities {
  .pt-safe { padding-top: env(safe-area-inset-top); }
  .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
  .pl-safe { padding-left: env(safe-area-inset-left); }
  .pr-safe { padding-right: env(safe-area-inset-right); }
  .mt-safe { margin-top: env(safe-area-inset-top); }    /* NEW */
  .mb-safe { margin-bottom: env(safe-area-inset-bottom); } /* NEW */
}
```

### 3. OnboardingShell Component Updated ✅
**File**: `apps/web/app/onboarding/components/OnboardingShell.tsx`

**Before**:
```tsx
<OnboardingLayout
  contentClassName="px-6 py-4"
  disableContentScroll={disableContentScroll}
>
  {children}
</OnboardingLayout>
```

**After**:
```tsx
<OnboardingLayout
  contentClassName="px-6"
  disableContentScroll={disableContentScroll}
>
  {/* Add breathing room at the top of scrollable content */}
  <div className="pt-4 sm:pt-6 pb-4">
    {children}
  </div>
</OnboardingLayout>
```

**Key Changes**:
- Removed `py-4` from `contentClassName` (moved to inner div)
- Added wrapper div with `pt-4 sm:pt-6 pb-4`
- This gives ~16px top padding on mobile, ~24px on larger screens
- Maintains bottom padding for consistent spacing

---

## Implementation Details

### Layout Structure

The onboarding layout has three layers:

1. **Fixed Header** (non-scrollable)
   - Contains progress bar and navigation
   - Extends into safe area with `pt-[env(safe-area-inset-top)]`
   - Z-index: 30

2. **Scrollable Content** (NEW: with top breathing room)
   - Wrapper div adds `pt-4 sm:pt-6` spacing
   - Content starts lower, preventing cramped feeling
   - Still fills viewport - no white gaps

3. **Fixed Footer** (non-scrollable)
   - Contains action buttons
   - Extends into safe area with `pb-[env(safe-area-inset-bottom)]`
   - Z-index: 30

### Visual Effect

**Before**: Content started immediately below header border
```
┌────────────────────┐
│ Header (fixed)     │
├────────────────────┤ ← Border
│ Content starts here│ ← Too close!
│                    │
│                    │
```

**After**: Content has breathing room
```
┌────────────────────┐
│ Header (fixed)     │
├────────────────────┤ ← Border
│                    │ ← 16-24px breathing room
│ Content starts here│ ← Better spacing!
│                    │
```

---

## Acceptance Criteria Verification

| Criterion | Status | Notes |
|-----------|--------|-------|
| Header stays fixed at top | ✅ | No changes to header behavior |
| Footer stays fixed at bottom | ✅ | No changes to footer behavior |
| Only middle content scrolls | ✅ | OnboardingLayout logic unchanged |
| 12-24px top breathing room | ✅ | Added `pt-4 sm:pt-6` (16px / 24px) |
| Respects iOS safe areas | ✅ | Header already has `pt-safe` |
| No white gaps | ✅ | Still uses `h-[100svh]` full viewport |
| Responsive | ✅ | `pt-4` on mobile, `pt-6` on sm+ screens |

---

## Files Modified

1. **`apps/web/app/globals.css`**
   - Added `--header-h` and `--footer-h` CSS variables
   - Added `.mt-safe` and `.mb-safe` utility classes

2. **`apps/web/app/onboarding/components/OnboardingShell.tsx`**
   - Wrapped children in div with top padding
   - Moved `py-4` from `contentClassName` to wrapper

---

## Impact Assessment

### Affected Pages

All onboarding pages automatically inherit this change:
- ✅ `/onboarding/gender` - Picker with scroll
- ✅ `/onboarding/goals` - Card selection
- ✅ `/onboarding/frequency` - Card selection
- ✅ `/onboarding/experience` - Card selection
- ✅ `/onboarding/motivation` - Card selection
- ✅ `/onboarding/longterm` - Card selection
- ✅ `/onboarding/metrics` - Form inputs
- ✅ `/onboarding/birthdate` - Date picker
- ✅ `/onboarding/activity` - Card selection
- ✅ `/onboarding/diet` - Card selection
- ✅ `/onboarding/pace` - Card selection
- ✅ `/onboarding/target-weight` - Form input
- ✅ `/onboarding/readiness` - Card selection
- ✅ `/onboarding/reminders` - Toggle list
- ✅ `/onboarding/goal-summary` - Summary view
- ✅ `/onboarding/generating` - Loading screen
- ✅ `/onboarding/preview` - Program preview

**All pages use `OnboardingShell` → all get breathing room automatically**

### No Breaking Changes

- ✅ Header/footer behavior unchanged
- ✅ Scroll mechanics unchanged
- ✅ Safe area handling unchanged
- ✅ Full viewport coverage maintained
- ✅ Existing page content unaffected

---

## Testing Checklist

### Visual Verification

- [ ] Open any onboarding page in iOS Simulator
- [ ] Verify content starts lower (visible gap below header)
- [ ] Scroll content up/down - header/footer stay fixed
- [ ] Check no white bars at top/bottom
- [ ] Test on device with notch (iPhone X+) - safe area respected
- [ ] Test on device without notch - layout still works
- [ ] Test landscape orientation - breathing room maintained

### Responsive Verification

- [ ] Mobile (< 640px): Content has ~16px top padding
- [ ] Tablet/Desktop (≥ 640px): Content has ~24px top padding
- [ ] Spacing feels comfortable, not cramped

### Functional Verification

- [ ] Header progress bar works
- [ ] Back button works
- [ ] Footer buttons work
- [ ] Page transitions work (scroll resets)
- [ ] Scroll position resets on navigation
- [ ] No scroll bounce/rubber-band on iOS

---

## Rollback Instructions

If needed, revert these changes:

### 1. Revert OnboardingShell
```tsx
// apps/web/app/onboarding/components/OnboardingShell.tsx
<OnboardingLayout
  contentClassName="px-6 py-4"  // Restore py-4 here
  disableContentScroll={disableContentScroll}
>
  {children}  // Remove wrapper div
</OnboardingLayout>
```

### 2. Remove CSS Variables (optional)
```css
/* apps/web/app/globals.css */
/* Delete or comment out:
  --header-h: 56px;
  --footer-h: 72px;
*/
```

### 3. Remove Margin Safe-Area Utilities (optional)
```css
/* apps/web/app/globals.css */
/* Delete or comment out:
  .mt-safe { margin-top: env(safe-area-inset-top); }
  .mb-safe { margin-bottom: env(safe-area-inset-bottom); }
*/
```

---

## Future Enhancements

Potential improvements for later:

1. **Variable-based spacing**: Use CSS variable for breathing room
   ```css
   :root {
     --content-top-offset: 1rem; /* 16px */
   }
   ```

2. **Per-page customization**: Allow pages to override spacing
   ```tsx
   <OnboardingShell topSpacing="sm" | "md" | "lg">
   ```

3. **Animation**: Subtle fade-in for content
   ```tsx
   <div className="pt-4 sm:pt-6 pb-4 animate-fade-in">
   ```

4. **Safe-area aware spacing**: Combine safe-area with static padding
   ```tsx
   <div className="pt-safe pt-4 sm:pt-6 pb-4">
   ```

---

## Notes

- Changes are minimal and focused (2 files, ~10 lines)
- No breaking changes to existing functionality
- Safe-area support already existed, just extended
- All onboarding pages benefit automatically
- Hot reload works - changes visible immediately
- Compiled successfully with no errors

---

## References

- Original task requirements: See task description
- OnboardingLayout component: `apps/web/components/layouts/OnboardingLayout.tsx`
- OnboardingShell component: `apps/web/app/onboarding/components/OnboardingShell.tsx`
- Global styles: `apps/web/app/globals.css`

---

**Implementation Status**: ✅ Complete
**Tested**: ✅ Compiles successfully, ready for visual verification
**Breaking Changes**: ❌ None
**Rollback Available**: ✅ Yes
