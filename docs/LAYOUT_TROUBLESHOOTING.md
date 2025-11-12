# Layout Troubleshooting Guide

## Issue: 3-Part Visual Separation with Dark Square at Bottom

### Symptoms
- Page appears to have 3 distinct sections with visual boundaries
- Dark square/rectangle appears at bottom of a component, covering content
- Content appears clipped or cut off
- Only happens on some pages but not others (e.g., journey page but not nutrition page)

### Root Cause
This issue typically occurs when a container component has:
1. **Fixed height constraint** (e.g., `maxHeight: calc(100dvh - ...)`)
2. **`overflow: hidden`** property
3. **Children with bottom padding** that extends beyond the container's constrained height

The clipped padding creates a "dark void" effect where the background color shows through but content is hidden.

### Example from Journey Page Fix (November 2024)

**Problem Code:**
```typescript
// MapFrame with strict viewport-based height
<div style={{
  height: 'min(92vw, 720px)',
  maxHeight: 'calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px) - 120px)',
  overflow: 'hidden',  // Clips children!
}}>
  <OrbMap paddingBottom="6rem" /> {/* This padding gets clipped */}
</div>
```

**What Happened:**
- MapFrame limited height to fit viewport
- OrbMap's bottom padding extended beyond MapFrame bounds
- `overflow: hidden` clipped the padding
- Dark background showed through as a "dark square"
- Content couldn't scroll naturally

**Solution:**
```typescript
// Add flexibility for scrolling vs. constrained layouts
interface MapFrameProps {
  constrainHeight?: boolean; // Default: true
}

const heightStyle = constrainHeight
  ? {
      height: 'min(92vw, 720px)',
      maxHeight: 'calc(100dvh - ...)', // Constrained for preview/centered pages
    }
  : {
      height: 'auto',                   // Natural height for scrolling pages
      minHeight: 'min(92vw, 720px)',    // Ensure minimum size
    };

// Usage on scrolling page:
<MapFrame constrainHeight={false}>
  <OrbMap />
</MapFrame>
```

### How to Fix Similar Issues

#### Step 1: Identify the Constrained Container
Look for components with:
- `maxHeight` constraints based on viewport
- `height: 100vh` or `height: 100dvh`
- `overflow: hidden`
- Fixed pixel heights

#### Step 2: Check for Clipped Children
Inspect children for:
- Bottom padding (`paddingBottom`, `pb-*` classes)
- Content that should extend beyond visible area
- Scroll behavior that seems broken

#### Step 3: Compare with Working Pages
Find a similar page that works correctly and compare:
- Root container classes (e.g., nutrition page uses `min-h-[100dvh] overflow-y-auto`)
- Height constraints (or lack thereof)
- Overflow behavior

#### Step 4: Apply Fix

**Option A: Use Natural Height for Scrolling Pages**
```typescript
// Instead of:
<div style={{ height: '100dvh', overflow: 'hidden' }}>

// Use:
<div className="min-h-[100dvh] overflow-y-auto overscroll-contain">
```

**Option B: Add Layout Mode Props**
```typescript
// Make component flexible for different use cases
interface ComponentProps {
  variant?: 'constrained' | 'scrollable';
}

const heightStyle = variant === 'constrained'
  ? { height: '100dvh', overflow: 'hidden' }
  : { minHeight: '100dvh', height: 'auto' };
```

**Option C: Remove Height Constraints**
- If the component should always scroll, remove `maxHeight` entirely
- Let content determine natural height
- Use `min-height` for minimum size guarantees

### Best Practices

#### For Scrolling Pages (like Journey, Nutrition)
```typescript
<div className="min-h-[100dvh] overflow-y-auto overscroll-contain bg-gradient-to-b from-[#0e0f12] to-[#1a1b20]">
  <header>{/* Scrolls with content */}</header>
  <main className="pb-32">{/* Bottom padding for BottomNav */}</main>
</div>
```

**Key patterns:**
- `min-h-[100dvh]` - Fills viewport minimum
- `overflow-y-auto` - Enables scrolling
- `overscroll-contain` - Prevents iOS rubber-banding
- `pb-32` or `pb-safe-120` - Space for fixed bottom navigation

#### For Centered/Constrained Pages (like Preview, Modal)
```typescript
<div className="min-h-[100dvh] flex items-center justify-center">
  <div style={{
    maxHeight: 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 120px)',
    overflow: 'hidden',
  }}>
    {/* Constrained content */}
  </div>
</div>
```

**Key patterns:**
- Viewport-based `maxHeight` is OK here
- `overflow: hidden` is intentional for clipping
- Content shouldn't extend beyond bounds

### Common Pitfalls

❌ **Don't:**
- Mix `overflow: hidden` with scrollable content expectations
- Use `height: 100vh` on mobile (use `100dvh` for dynamic viewport)
- Apply `position: absolute` to children when using `height: auto` on parent
- Forget bottom padding for fixed navigation bars

✅ **Do:**
- Use `min-h-[100dvh]` + `overflow-y-auto` for scrolling pages
- Use `height: auto` to let content determine natural height
- Compare with working pages when debugging
- Test on iOS Safari for viewport issues
- Add bottom padding (`pb-24`, `pb-32`) for fixed bottom navigation

### Testing Checklist

When fixing layout issues, verify:
- [ ] Header scrolls with content (if it should)
- [ ] No dark bars/squares at bottom
- [ ] Content isn't clipped or cut off
- [ ] Scrolling works smoothly
- [ ] Bottom navigation doesn't overlap content
- [ ] Works on iOS Safari (dynamic viewport)
- [ ] Works on Android Chrome
- [ ] No white flash on rubber-band scroll (iOS)

### Related Files
- `components/journey/MapFrame.tsx` - Flexible container with `constrainHeight` prop
- `app/(app)/journey/page.tsx` - Scrolling page example
- `app/(app)/nutrition/page.tsx` - Working scrolling page reference
- `app/onboarding/preview/page.tsx` - Centered/constrained page example

### References
- [iOS Dynamic Viewport Units](https://developer.mozilla.org/en-US/docs/Web/CSS/length#relative_length_units_based_on_viewport)
- [CSS Containment](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment)
- [Safe Area Insets](https://developer.mozilla.org/en-US/docs/Web/CSS/env)
