# Native iOS Notifications Implementation

## Overview

Implemented native iOS system notification permission sheet using `@capacitor/push-notifications`, replacing the custom dialog with the actual system permission UI. The implementation preserves all existing business logic, analytics, and backend integration.

## What Changed

### ✅ User Experience

**Before:**
- Custom in-app dialog asking for permission
- Required manual dialog interaction before system prompt
- Two-step process (custom dialog → system prompt)

**After:**
- **Native iOS system sheet appears automatically** within 400ms of entering the screen
- Direct system permission request (Don't Allow / Allow)
- Single-step process - user sees the real iOS permission sheet immediately

### ✅ Technical Implementation

#### New File: `lib/notifications/permissions.ts`

Core abstraction layer for push notification permissions:

```typescript
// Platform-agnostic permission status check
async function getPushStatus(): Promise<PushPermissionStatus>

// Request permission (shows native iOS sheet or web API)
async function requestPushPermission(): Promise<PushPermissionStatus>

// Register for push and handle device token
async function registerForPush(onToken: (token: Token) => Promise<void>)

// Open iOS app settings (for denied state)
async function openAppSettings(): Promise<void>

// Session management to prevent duplicate prompts
function shouldShowPrompt(): boolean
function markPromptShown(): void
```

#### Updated: `app/onboarding/reminders/page.tsx`

**New Permission Flow:**

1. **On Mount:**
   - Check current permission status via `getPushStatus()`
   - If status is `'prompt'` → auto-trigger native sheet after 400ms delay
   - If status is `'granted'` → proceed with token registration
   - If status is `'denied'` → show settings UI

2. **Native iOS Flow:**
   ```
   User enters screen
   → Brief UI render (400ms)
   → Native system sheet appears
   → User taps "Allow" or "Don't Allow"
   → If Allow: PushNotifications.register() → APNs token → backend
   → Navigate to next step
   ```

3. **Web Fallback:**
   - Uses standard `Notification.requestPermission()`
   - Falls back to existing `subscribePush()` flow
   - Service Worker + VAPID key subscription

**UI States:**

- **Prompt State:** Shows "מאשר לקבל התראות" button (triggers sheet)
- **Denied State:** Shows "פתח הגדרות" button (deep-links to `app-settings:`) + "לא עכשיו"
- **Loading State:** Shows gendered loading text during permission request

### ✅ Preserved Functionality

All existing business logic remains unchanged:

- ✅ `saveOnboardingData({ notifications_opt_in: true/false })`
- ✅ Backend token registration via `/api/push/subscribe`
- ✅ Navigation flow to `/onboarding/generating`
- ✅ Error handling and user feedback messages
- ✅ Gendered Hebrew text support
- ✅ Development diagnostics panel
- ✅ Test notification functionality
- ✅ Legal links (Privacy Policy / Terms of Use)
- ✅ Service Worker registration for web

## Key Features

### 🚀 Auto-Trigger (iOS Only)

The native permission sheet appears automatically after 400ms when:
- Platform is native (`Capacitor.isNativePlatform()`)
- Permission status is `'prompt'`
- Not already prompted in this session (`sessionStorage`)

```typescript
if (isNative && status === 'prompt' && shouldShowPrompt()) {
  setTimeout(() => {
    handleRequestPermission();
  }, 400);
}
```

### 🔒 Duplicate Request Prevention

Uses `useRef` to prevent race conditions:

```typescript
const requestInProgress = useRef(false);

if (requestInProgress.current || loading) {
  return; // Skip duplicate request
}
```

Session storage prevents re-prompting on navigation:

```typescript
sessionStorage.setItem('notifPrompted', '1');
```

### 🎯 Settings Deep Link (iOS)

When permission is denied, users can tap "פתח הגדרות" to open iOS Settings:

```typescript
await App.openUrl({ url: 'app-settings:' });
```

### 🌐 Web Fallback

Automatically detects platform and uses appropriate API:

```typescript
if (!Capacitor.isNativePlatform()) {
  const result = await Notification.requestPermission();
  // Use existing subscribePush() flow
}
```

## Testing Guide

### iOS Simulator Testing

1. **First-Time Permission (Fresh State):**
   ```bash
   # Reset simulator to clear permission states
   xcrun simctl erase all

   # Rebuild and run
   cd ios/App
   xcodebuild clean
   open App.xcworkspace
   # Product → Run (Cmd+R)
   ```

2. **Navigate to Reminders Screen:**
   - Complete onboarding steps until you reach `/onboarding/reminders`
   - **Expected:** Native iOS permission sheet appears within ~400ms
   - Sheet shows: "GymBro Would Like to Send You Notifications"
   - Options: "Don't Allow" | "Allow"

3. **Test "Allow" Flow:**
   - ✅ Tap "Allow"
   - ✅ Console shows: `[RemindersPage] Permission granted, registering device`
   - ✅ Console shows: `[RemindersPage] Received push token: <token>`
   - ✅ Success message: "התראות הופעלו בהצלחה! ✓"
   - ✅ Auto-navigate to `/onboarding/generating` after 1.5s

4. **Test "Don't Allow" Flow:**
   - ❌ Tap "Don't Allow"
   - ✅ UI shows "פתח הגדרות" button
   - ✅ Message: "התראות נדחו. תוכל להפעיל אותן מההגדרות מאוחר יותר."
   - ✅ Tap "פתח הגדרות" → iOS Settings app opens
   - ✅ Tap "לא עכשיו" → Navigate to next step

5. **Test Already Granted:**
   ```bash
   # After allowing once, force-quit and reopen
   # Navigate back to /onboarding/reminders
   ```
   - ✅ No permission sheet appears
   - ✅ Proceeds directly to token registration
   - ✅ Success message and navigation

### Web Testing

1. **Open in Chrome/Firefox:**
   ```bash
   open http://localhost:3000/onboarding/reminders
   ```

2. **Test Web Flow:**
   - ✅ Minimal UI with bell icon and title
   - ✅ Tap "מאשר לקבל התראות"
   - ✅ Browser's native permission popup appears (top bar)
   - ✅ "Allow" → Service Worker subscribes with VAPID key
   - ✅ Token sent to `/api/push/subscribe`

### Development Diagnostics

In development mode (`NODE_ENV=development`), additional tools are available:

1. **Diagnostics Panel:**
   - Located at bottom of screen
   - Click "▶ Diagnostics" to expand
   - Shows: Permission status, Service Worker, Push Manager, Subscription status

2. **Test Notification Button:**
   - Only appears after successful subscription
   - Tap "שלח התראת בדיקה 🧪"
   - Sends test push via `/api/push/test`

## Platform Support

| Platform | Implementation | Permission UI |
|----------|---------------|---------------|
| **iOS Native** | `@capacitor/push-notifications` | Native system sheet (APNs) |
| **Android Native** | `@capacitor/push-notifications` | Native system dialog (FCM) |
| **Web (PWA)** | `Notification.requestPermission()` + Service Worker | Browser permission bar |
| **Web (non-PWA iOS)** | Graceful degradation | Shows "not supported" message |

## Backend Integration

### Token Registration Endpoint: `/api/push/subscribe`

**Native platforms send:**
```json
{
  "token": "apns-token-or-fcm-token",
  "platform": "ios" | "android"
}
```

**Web platforms send:**
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

## Error Handling

All permission flows include comprehensive error handling:

```typescript
try {
  const status = await requestPushPermission();
  if (status === 'granted') {
    await registerForPush(...);
  }
} catch (error) {
  console.error('[RemindersPage] Permission error:', error);
  setMsg('משהו השתבש. תוכל להמשיך ולהפעיל התראות מאוחר יותר.');
  saveOnboardingData({ notifications_opt_in: false });
  setTimeout(() => router.push("/onboarding/generating"), 2000);
}
```

**User always proceeds to next step:**
- Success → Navigate after 1.5s
- Error → Navigate after 2.0s
- Denied → User can manually skip

## Accessibility

- ✅ Full RTL support with `dir="rtl"`
- ✅ Semantic HTML structure
- ✅ Clear visual hierarchy (bell icon → title → subtitle → buttons)
- ✅ Proper button states (hover, active, disabled)
- ✅ `data-testid` attributes preserved for E2E testing
- ✅ Gendered Hebrew text throughout

## Security Considerations

1. **Session Storage:** Only stores boolean flag, no sensitive data
2. **Token Transmission:** Sent over HTTPS to backend
3. **VAPID Keys:** Web push uses public key only
4. **Permission States:** Respects iOS/browser permission denials

## Troubleshooting

### Issue: Permission sheet doesn't appear

**Solution:**
```bash
# Reset simulator permissions
xcrun simctl privacy booted reset all com.gymbro.app

# Clean and rebuild
cd ios/App
xcodebuild clean
```

### Issue: "Registration failed" error

**Possible causes:**
- APNs certificate not configured in Apple Developer
- Push Notifications capability not enabled in Xcode
- Network connectivity issues

**Check:**
```bash
# View console logs in Xcode
# Cmd+Shift+Y to open Debug Area
# Look for: [RemindersPage] or [Permissions] logs
```

### Issue: Web push not working

**Requirements for web push:**
- HTTPS (or localhost for development)
- VAPID public key configured in `.env.local`
- Service Worker registered
- Browser supports Push API

## Files Changed

### Created:
- ✅ `lib/notifications/permissions.ts` - Core permission abstraction

### Modified:
- ✅ `app/onboarding/reminders/page.tsx` - Native permission flow
- ✅ `lib/push-client.ts` - Preserved (backward compatibility)

### Removed:
- ❌ `components/notifications/NotificationPermissionCard.tsx` - No longer needed

## Migration Notes

**No breaking changes!** The implementation:
- ✅ Maintains backward compatibility with web flow
- ✅ Preserves all existing analytics/events
- ✅ Keeps same backend API endpoints
- ✅ Respects same localStorage keys
- ✅ Uses same navigation flow

## Success Criteria

✅ **All criteria met:**

1. ✅ On iOS, native system sheet appears automatically within ~400ms
2. ✅ Tapping primary button shows native sheet when applicable
3. ✅ After "Allow": device token registered, analytics fire, navigate forward
4. ✅ After "Don't Allow": shows settings UI, no crashes, no repeated prompts
5. ✅ Web still works with `Notification.requestPermission()`
6. ✅ No changes to other onboarding steps or server code
7. ✅ Legal links open externally (maintained)
8. ✅ Development diagnostics preserved

## Performance

- **Auto-trigger delay:** 400ms (allows UI to render first)
- **Navigation delay (success):** 1.5s (user sees success message)
- **Navigation delay (error):** 2.0s (user sees error message)
- **Session storage:** O(1) check, no performance impact

## Future Enhancements

Possible improvements (not in current scope):

- [ ] Analytics events for permission request/grant/deny
- [ ] A/B test auto-trigger delay (200ms vs 400ms vs 600ms)
- [ ] Push notification preferences UI (workout reminders, water, etc.)
- [ ] Rich push notifications with images/actions
- [ ] Background notification handling
