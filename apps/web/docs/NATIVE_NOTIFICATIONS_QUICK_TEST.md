# Native Notifications - Quick Test Guide

## 🚀 Quick Start Testing

### iOS Simulator (Primary Test)

**1. Clean Start:**
```bash
# Terminal 1: Start dev server
cd /Users/netanelhadad/Projects/gymbro/apps/web
pnpm dev

# Terminal 2: Sync to iOS
CAP_DEV=1 DEV_SERVER_URL="http://localhost:3000" pnpm exec cap sync ios

# Open Xcode
open ios/App/App.xcworkspace
```

**2. Run App (Cmd+R in Xcode)**

**3. Navigate Through Onboarding:**
- Complete all onboarding steps
- When you reach `/onboarding/reminders`:
  - ⏱️ Wait ~400ms
  - ✅ **Native iOS permission sheet should appear automatically**
  - Sheet shows: "GymBro Would Like to Send You Notifications"

**4. Test "Allow" Path:**
- Tap **"Allow"**
- ✅ See green success message: "התראות הופעלו בהצלחה! ✓"
- ✅ Console shows: `[RemindersPage] Received push token: <token>`
- ✅ Auto-navigate to `/onboarding/generating` after 1.5s

**5. Test "Don't Allow" Path:**
- Force-quit app
- Reset permissions:
  ```bash
  xcrun simctl privacy booted reset all com.gymbro.app
  ```
- Rerun app, navigate to reminders screen
- Tap **"Don't Allow"**
- ✅ See "פתח הגדרות" and "לא עכשיו" buttons
- ✅ Tap "פתח הגדרות" → iOS Settings app opens
- ✅ Tap "לא עכשיו" → Proceeds to next step

### Web Browser (Fallback Test)

**1. Open in Browser:**
```bash
open http://localhost:3000
```

**2. Navigate to:**
```
http://localhost:3000/onboarding/reminders
```

**3. Test Flow:**
- ✅ See minimal UI with bell icon
- ✅ Click "מאשר לקבל התראות"
- ✅ Browser permission popup appears (top of page)
- ✅ "Allow" → Success message → Navigate forward

## 📊 Expected Console Logs

### iOS Success Flow:
```
[RemindersPage] Auto-triggering native permission sheet
[Permissions] Requesting native push permissions
[Permissions] Permission result: granted
[RemindersPage] Permission granted, registering device
[Permissions] Registering for push notifications
[Permissions] Push token received: <apns-token>
[RemindersPage] Received push token: <token>
[RemindersPage] Token registered with backend
```

### iOS Denied Flow:
```
[RemindersPage] Auto-triggering native permission sheet
[Permissions] Requesting native push permissions
[Permissions] Permission result: denied
[RemindersPage] Permission denied by user
```

### Web Success Flow:
```
[RemindersPage] Requesting push permission
[RemindersPage] Permission granted, registering device
[Push] Permission result: granted
[Push] Creating new subscription...
[Push] Subscription created
```

## 🔧 Debugging Tools

### Development Panel (Bottom of Screen)

Click **"▶ Diagnostics"** to see:
- Permission status
- Service Worker status
- Push Manager availability
- Current subscription
- Device info (iOS version, PWA mode)

### Test Notification (Dev Only)

After successful subscription:
- Button appears: "שלח התראת בדיקה 🧪"
- Tap to send test push notification
- Check device/browser for notification

## ❌ Common Issues

### Issue: Sheet doesn't appear
**Fix:**
```bash
# Clean Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*

# Rebuild
cd ios/App && xcodebuild clean
```

### Issue: "Registration failed"
**Causes:**
- Network connection
- APNs configuration
- Push Notifications capability not enabled

**Check Xcode:**
1. Project → Signing & Capabilities
2. Verify "Push Notifications" capability is present
3. Check console for detailed error logs

### Issue: Auto-trigger happens too fast
**Temporary fix (for testing):**
Edit line ~70 in `app/onboarding/reminders/page.tsx`:
```typescript
}, 400); // Change to 1000 or 1500 for slower trigger
```

## ✅ Success Checklist

- [ ] Native sheet appears automatically on iOS
- [ ] "Allow" path registers token and navigates
- [ ] "Don't Allow" shows settings UI
- [ ] Settings button opens iOS Settings app
- [ ] "לא עכשיו" skips and navigates
- [ ] Web fallback works in browser
- [ ] Diagnostics panel shows correct status
- [ ] No crashes or runtime errors
- [ ] Console logs show token registration

## 🎯 Key Files to Review

If you need to modify behavior:

1. **Permission Logic:**
   - `lib/notifications/permissions.ts`

2. **UI & Flow:**
   - `app/onboarding/reminders/page.tsx`

3. **Backend Integration:**
   - `/api/push/subscribe` endpoint (receives token)

## 📱 Testing on Physical Device

**Requirements:**
- Apple Developer account
- Push Notifications entitlement
- Physical iPhone (simulator can't receive real push)

**Steps:**
1. Update dev server URL:
   ```bash
   # Find your local IP
   ifconfig | grep "inet "

   # Sync with network IP
   CAP_DEV=1 DEV_SERVER_URL="http://192.168.x.x:3000" pnpm exec cap sync ios
   ```

2. Run on device via Xcode
3. Test same flows as simulator
4. Verify actual push notification delivery

## 🚨 Important Notes

- **Do not spam permission requests** - iOS permanently blocks after ~3 denials
- **Session storage** prevents duplicate prompts within same session
- **Force-quit app** to reset session for testing
- **Reset simulator** to clear all permission states
- **Check Xcode console** for detailed logs, not just browser console

## 📞 Need Help?

Check the full documentation:
- `docs/NATIVE_NOTIFICATIONS_SETUP.md` - Complete implementation details
- `docs/GOOGLE_OAUTH_FIX.md` - OAuth troubleshooting (similar debugging approach)
