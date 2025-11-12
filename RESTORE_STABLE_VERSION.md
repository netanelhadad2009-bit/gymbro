# Restore Stable Version Guide

## Current Stable Version
**Tag:** `journey-layout-stable-2025-11-12`
**Commit:** `6ac4949`
**Date:** November 12, 2025

## What's Included
- ✅ Journey page layout fixes
- ✅ Fixed 3-part visual separation issue
- ✅ Proper scrolling behavior (like nutrition page)
- ✅ Correct bottom padding (~64-82px instead of ~224px)
- ✅ Header scrolls with content
- ✅ No dark square at bottom
- ✅ MapFrame component with `constrainHeight` prop
- ✅ Documentation in `docs/LAYOUT_TROUBLESHOOTING.md`

## How to Restore This Version

### Option 1: View the code (read-only)
```bash
git checkout journey-layout-stable-2025-11-12
```

To return to your branch:
```bash
git checkout feat/mobile-shell-rollout
```

### Option 2: Create a new branch from this stable version
```bash
git checkout -b restore-stable-layout journey-layout-stable-2025-11-12
```

### Option 3: Reset current branch to this version (⚠️ CAUTION)
```bash
# Save your current work first!
git stash

# Reset to stable version (loses uncommitted changes)
git reset --hard journey-layout-stable-2025-11-12

# Or merge the stable version into current branch
git merge journey-layout-stable-2025-11-12
```

### Option 4: Cherry-pick just the layout fixes
```bash
# Apply only the layout fix commit to your current branch
git cherry-pick 6ac4949
```

## View Commit Details
```bash
# See what changed
git show journey-layout-stable-2025-11-12

# See the files changed
git diff journey-layout-stable-2025-11-12^..journey-layout-stable-2025-11-12 --name-only

# View the troubleshooting documentation
git show journey-layout-stable-2025-11-12:docs/LAYOUT_TROUBLESHOOTING.md
```

## Key Files Modified
1. `apps/web/app/(app)/journey/page.tsx` - Journey page with scrolling layout
2. `apps/web/components/journey/MapFrame.tsx` - Added `constrainHeight` prop
3. `apps/web/components/journey/OrbMap.tsx` - Reduced bottom padding
4. `docs/LAYOUT_TROUBLESHOOTING.md` - Complete troubleshooting guide

## If You Need to Undo Future Changes
```bash
# See what changed since this stable version
git diff journey-layout-stable-2025-11-12..HEAD

# Restore specific files from stable version
git checkout journey-layout-stable-2025-11-12 -- apps/web/app/(app)/journey/page.tsx
git checkout journey-layout-stable-2025-11-12 -- apps/web/components/journey/MapFrame.tsx
git checkout journey-layout-stable-2025-11-12 -- apps/web/components/journey/OrbMap.tsx
```

## Verification
After restoring, verify the fixes work:
1. Navigate to `/journey` page
2. ✅ Check header scrolls with content
3. ✅ Check no 3-part visual separation
4. ✅ Check no dark square at bottom
5. ✅ Check reasonable spacing before bottom nav
6. ✅ Check preview page (`/onboarding/preview`) still works with centered layout

## Support
For detailed troubleshooting, see:
- `docs/LAYOUT_TROUBLESHOOTING.md` - Complete troubleshooting guide
- Commit message: `git log --format=fuller 6ac4949`
