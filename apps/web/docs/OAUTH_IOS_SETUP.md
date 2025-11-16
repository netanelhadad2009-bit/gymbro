# iOS OAuth Configuration Guide

This guide covers the necessary iOS configuration for native Google and Apple OAuth authentication.

## Overview

The app uses native SDKs for OAuth on iOS:
- **Google**: `@codetrix-studio/capacitor-google-auth`
- **Apple**: `@capacitor-community/apple-sign-in`

These provide native authentication sheets that stay within the app (no external browser redirect).

## ✅ Completed Steps

1. ✅ Installed native OAuth plugins
2. ✅ Created platform abstraction layer
3. ✅ Implemented native OAuth handlers
4. ✅ Updated SocialAuthButtons component
5. ✅ Synced Capacitor iOS

## 🔧 Required iOS Configuration (Manual Steps in Xcode)

### 1. Apple Sign In Capability

**In Xcode:**

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select the **App** target
3. Go to **Signing & Capabilities** tab
4. Click **+ Capability**
5. Add **Sign in with Apple**
6. Ensure **Bundle Identifier** is `com.gymbro.app`

### 2. Google OAuth Configuration

**Prerequisites:**
- Create iOS OAuth client in [Google Cloud Console](https://console.cloud.google.com/)
- Download `GoogleService-Info.plist`

**Steps:**

1. **Add GoogleService-Info.plist:**
   - Place the file at: `ios/App/App/GoogleService-Info.plist`
   - In Xcode, add it to the project (File → Add Files to "App")

2. **Add URL Type for Google:**
   - In Xcode, select the **App** target
   - Go to **Info** tab
   - Expand **URL Types**
   - Click **+** to add a new URL Type
   - **Identifier**: `com.googleusercontent.apps.YOUR_CLIENT_ID`
   - **URL Schemes**: Reversed client ID from GoogleService-Info.plist
     - Example: `com.googleusercontent.apps.123456789-abcdef`
     - Find this in GoogleService-Info.plist under `REVERSED_CLIENT_ID`

### 3. Info.plist Updates (Already Configured)

The following are already in `ios/App/App/Info.plist`:

```xml
<!-- URL Types for deep linking -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.gymbro.app</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>capacitor</string>
      <!-- Add reversed Google client ID here too -->
    </array>
  </dict>
</array>

<!-- Google app query schemes -->
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>googlegmail</string>
  <string>googlemail</string>
  <string>googleplus</string>
  <string>googledrive</string>
  <string>googlechromes</string>
  <string>com.googleusercontent.apps</string>
</array>
```

**Action Required:** Add your reversed Google client ID to the `CFBundleURLSchemes` array.

## 🔐 Supabase Configuration

### Required Redirect URLs

In **Supabase Dashboard → Authentication → URL Configuration**, add:

**For Web (still needed for web flow):**
- Production: `https://gymbro-app.co.il/auth/callback`
- Development: `http://localhost:3000/auth/callback`

**For Native:** No redirect URLs needed! Native flow uses `signInWithIdToken` directly.

### Provider Configuration

**Google OAuth:**
1. Enable Google provider in Supabase
2. Add your Google OAuth client credentials
3. Ensure iOS client ID is configured in Google Cloud Console
4. In Google Cloud Console, add authorized redirect URIs (for web flow):
   - `https://gymbro-app.co.il/auth/callback`
   - `http://localhost:3000/auth/callback`

**Apple Sign In:**
1. Enable Apple provider in Supabase
2. Configure Apple Service ID in [Apple Developer Console](https://developer.apple.com/)
3. Ensure Service ID matches Bundle Identifier: `com.gymbro.app`
4. Add return URLs in Apple Developer Console (for web flow):
   - `https://gymbro-app.co.il/auth/callback`
   - `http://localhost:3000/auth/callback`

## 🧪 Testing

### iOS Simulator

```bash
cd /Users/netanelhadad/Projects/gymbro/apps/web
CAP_DEV=1 DEV_SERVER_URL="http://localhost:3000" pnpm exec cap open ios
```

**Expected Behavior:**

**Google Sign In:**
1. Tap "התחברות באמצעות Google"
2. Native Google account picker sheet appears
3. Select account
4. Returns to app
5. Supabase session established
6. Success haptic feedback
7. Navigates to appropriate screen

**Apple Sign In:**
1. Tap "התחברות באמצעות Apple"
2. Native Apple authentication sheet appears
3. Authenticate with Face ID/Touch ID/password
4. Returns to app
5. Supabase session established
6. Success haptic feedback
7. Navigates to appropriate screen

**On Error:**
- Error haptic (triple vibration)
- Hebrew toast notification
- Buttons re-enable
- Detailed console logs

### Web Browser

```bash
pnpm dev
# Navigate to http://localhost:3000
```

**Expected Behavior:**
- OAuth buttons use standard redirect flow
- Redirects to Google/Apple OAuth pages
- Returns to /auth/callback
- Session established

## 📝 Console Logs

The implementation includes comprehensive logging at every step:

```
[OAuth] Starting Google sign-in
[OAuth] Using native Google SDK
[OAuth Native] Starting Google sign-in
[OAuth Native] Calling GoogleAuth.signIn()
[OAuth Native] Google sign-in successful, extracting ID token
[OAuth Native] ID token obtained, signing in to Supabase
[OAuth Native] Supabase session established: user@example.com
[SocialAuthButtons] Google sign-in successful, triggering success haptic
[SocialAuthButtons] Google OAuth completed successfully
```

## 🎨 Haptic Feedback

- **On Press**: Selection haptic (light tap)
- **On Success**: Success notification haptic
- **On Error**: Error notification haptic (triple vibration pattern)

## 🏗️ Architecture

### File Structure

```
lib/
├── platform/
│   └── isNative.ts           # Platform detection
├── auth/
│   ├── oauth.ts              # Unified entry points
│   ├── oauth.native.ts       # Native SDK implementations
│   └── oauth.web.ts          # Web redirect flow
└── components/
    └── SocialAuthButtons.tsx # OAuth button component
```

### Flow Diagram

```
User clicks button
       ↓
SocialAuthButtons detects platform
       ↓
   ┌──────────────┴──────────────┐
   │                             │
Native (iOS)                  Web
   │                             │
startGoogleSignIn()       signInWithOAuth()
   │                             │
GoogleAuth.signIn()          Redirect to
   │                        provider page
Native sheet appears            │
   │                        User auth on
User selects account        provider site
   │                             │
Returns ID token              Returns to
   │                        /auth/callback
signInWithIdToken()              │
   │                      Session from URL
   ↓                              ↓
      Supabase session established
```

## 🚨 Troubleshooting

### Google: "No ID token from native SDK"

**Cause**: GoogleService-Info.plist not properly configured

**Fix:**
1. Ensure GoogleService-Info.plist is in `ios/App/App/`
2. Verify file is added to Xcode project
3. Check reversed client ID is in URL Types
4. Clean build: Product → Clean Build Folder (Cmd+Shift+K)

### Apple: "No Apple identity token"

**Cause**: Sign In with Apple capability not added

**Fix:**
1. Open Xcode
2. Target → Signing & Capabilities
3. Add "Sign in with Apple" capability
4. Ensure Bundle ID matches Apple Developer config

### "Not native" error in simulator

**Cause**: Platform detection failing

**Fix:**
1. Ensure running in iOS Simulator (not web browser)
2. Check Capacitor is initialized
3. Verify `Capacitor.isNativePlatform()` returns true

### Session not persisting

**Cause**: Supabase client not properly configured

**Fix:**
1. Check `lib/supabase.ts` has PKCE flow enabled
2. Verify Capacitor Preferences storage is working
3. Check network connectivity

## 📚 Additional Resources

- [Google Sign-In for iOS](https://developers.google.com/identity/sign-in/ios)
- [Apple Sign In Documentation](https://developer.apple.com/documentation/sign_in_with_apple)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [@codetrix-studio/capacitor-google-auth](https://github.com/CodetrixStudio/CapacitorGoogleAuth)
- [@capacitor-community/apple-sign-in](https://github.com/capacitor-community/apple-sign-in)

## ✅ Checklist

Before testing, ensure:

- [ ] GoogleService-Info.plist added to Xcode project
- [ ] Reversed client ID added to URL Types
- [ ] Sign In with Apple capability added
- [ ] Bundle Identifier is `com.gymbro.app`
- [ ] Supabase providers enabled (Google & Apple)
- [ ] iOS clients configured in Google Cloud Console
- [ ] Apple Service ID configured in Apple Developer Console
- [ ] `pnpm cap sync ios` completed successfully
- [ ] Dev server running on port 3000
- [ ] Network connectivity available

## 🎯 Next Steps

1. **Open Xcode**: `cd apps/web && pnpm exec cap open ios`
2. **Add GoogleService-Info.plist** to project
3. **Configure URL Types** with reversed client ID
4. **Add Sign In with Apple capability**
5. **Run app** in simulator (Cmd+R)
6. **Test OAuth flows** for both Google and Apple
7. **Verify console logs** show successful authentication
8. **Test error scenarios** (cancel, no network, etc.)
