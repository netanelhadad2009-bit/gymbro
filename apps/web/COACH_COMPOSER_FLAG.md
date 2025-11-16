# Coach Composer Feature Flag

## Overview
The Coach screen message composer (input + send button) is **disabled by default** and only renders when explicitly enabled via environment variable.

## Flag Behavior
- **Default**: Composer is **HIDDEN** (not rendered)
- **Enable**: Set `NEXT_PUBLIC_COACH_COMPOSER_ENABLED=true` or `=1`
- **Disable**: Leave unset, or set to any other value

## Implementation Details

### Flag Helper
Location: `lib/flags/coach.ts`
```typescript
export function isCoachComposerEnabled(): boolean {
  const v = (process.env.NEXT_PUBLIC_COACH_COMPOSER_ENABLED || '').trim().toLowerCase();
  return v === 'true' || v === '1';
}
```

### Component Guards
1. **ChatScreen** (`components/coach/chat/ChatScreen.tsx`):
   - Checks flag on mount
   - Logs state: `console.debug('[Coach] composerEnabled =', composerEnabled)`
   - Conditionally renders composer + underlay
   - Adds `composer-enabled` class when active
   - Sets `pb-0` when disabled (no gap above nav)

2. **Composer** (`components/coach/chat/Composer.tsx`):
   - Early return `null` if `!isCoachComposerEnabled()`
   - Adds `data-role="composer"` attribute

### CSS Kill Switch
Location: `app/globals.css` (lines 432-452)

Targets: `[data-coach-screen]:not(.composer-enabled)`
Hides all composer-related elements with:
- `display: none !important`
- `visibility: hidden !important`
- `height: 0 !important`
- etc.

## To Enable Composer

1. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_COACH_COMPOSER_ENABLED=true
   ```

2. Restart dev server:
   ```bash
   pnpm dev
   ```

3. Check console for log:
   ```
   [Coach] composerEnabled = true
   ```

## Verification Checklist

When **disabled** (default):
- [ ] No input box visible on Coach screen
- [ ] No send button
- [ ] Messages scroll to bottom nav with zero gap
- [ ] Console shows: `[Coach] composerEnabled = false`
- [ ] No keyboard appears on screen tap

When **enabled**:
- [ ] Input box appears above bottom nav
- [ ] Send button visible
- [ ] Black underlay fills space below composer
- [ ] Console shows: `[Coach] composerEnabled = true`
- [ ] Keyboard opens when input focused

## Files Modified
- `lib/flags/coach.ts` - Flag helper (single source of truth)
- `components/coach/chat/ChatScreen.tsx` - Conditional render + logging
- `components/coach/chat/Composer.tsx` - Guard + data attributes
- `app/globals.css` - CSS kill switch
- `env.d.ts` - TypeScript definition
- `.env.example` - Documentation

## Notes
- No changes to BottomNav styling
- No database/API changes
- Coach screen only - other routes unaffected
- CSS ensures no remnants render even if logic fails
