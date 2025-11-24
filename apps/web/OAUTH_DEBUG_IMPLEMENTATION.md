# OAuth Debugging Implementation Summary

## Overview
Added comprehensive logging and error visibility throughout the OAuth flow to diagnose why Google and Apple OAuth are failing on iOS TestFlight but working on web.

## Files Modified

### 1. `/lib/auth/oauth.native.ts` (Lines 41-133, 140-229)

**Changes for Google Sign-In (`signInWithGoogleNative`):**
- Added platform detection logging with `isNative()` and `Capacitor.getPlatform()`
- Logs each step of the OAuth flow:
  - Step 1: Plugin initialization
  - Step 2: Native SDK login call with all options
  - Step 3: Supabase token exchange
- Comprehensive error logging including:
  - Error type, message, name, status, code
  - Full error object as JSON
  - Stack trace (first 5 lines)
- Logs raw result structure from `SocialLogin.login()`
- Logs ID token length when obtained
- Logs full Supabase error details if `signInWithIdToken()` fails

**Changes for Apple Sign-In (`signInWithAppleNative`):**
- Same comprehensive logging as Google
- Tracks identity token instead of ID token
- Same step-by-step flow logging

**Example Console Output You'll See:**
```
[OAuth Native] ========================================
[OAuth Native] Starting Google sign-in
[OAuth Native] Platform check: { isNative: true, platform: 'ios' }
[OAuth Native] ========================================
[OAuth Native] Step 1: Ensuring SocialLogin plugin is initialized...
[OAuth Native] ✅ Plugin initialized
[OAuth Native] Step 2: Calling SocialLogin.login() for Google...
[OAuth Native] Login options: {
  provider: 'google',
  scopes: ['email', 'profile'],
  forceRefreshToken: true,
  webClientId: '122734915921-3kmos5...'
}
```

### 2. `/lib/auth/oauth.web.ts` (Lines 8-95)

**Changes for Both Google and Apple Web OAuth:**
- Logs environment details before OAuth call:
  - `window.location.origin`
  - Computed `redirectTo` URL
  - `process.env.NEXT_PUBLIC_SITE_URL` value
  - Current full URL
- Logs the redirect URL returned by Supabase
- Comprehensive error logging with status codes and full error objects

**Example Console Output You'll See:**
```
[OAuth Web] ========================================
[OAuth Web] Starting Google OAuth redirect flow
[OAuth Web] Environment: {
  windowOrigin: 'https://your-domain.com',
  redirectTo: 'https://your-domain.com/auth/callback',
  NEXT_PUBLIC_SITE_URL: '(not set)',
  currentURL: 'https://your-domain.com/signup'
}
[OAuth Web] ========================================
```

### 3. `/components/SocialAuthButtons.tsx` (Lines 49-87, 111-149)

**Changes:**
- Enhanced error logging in catch blocks:
  - Error type, constructor name
  - Error message, name, status, code
  - Full error object as JSON
  - Complete stack trace
- **TEMPORARY DEBUG FEATURE:** Toast now shows BOTH:
  - Hebrew translated error message
  - Raw error message from exception
- Toast duration increased to 10 seconds for debugging
- Fallback alert shows raw error if toast fails

**Example Toast Message:**
```
Title: שגיאה בהתחברות עם Google

Description:
שגיאה בהתחברות עם Google. נסה שוב.

[DEBUG] No Google ID token returned from native SDK
```

### 4. `/app/auth/callback/page.tsx` (Lines 18-41)

**Changes:**
- Added URL and query parameter logging at the start of callback:
  - Full callback URL
  - All query parameters as object
  - Specific OAuth-related parameters:
    - `error`
    - `error_description`
    - `error_code`
    - `provider`
    - `code` (presence check)
    - `access_token` (presence check)
- Logs session retrieval step

**Example Console Output You'll See:**
```
[Auth Callback] ========================================
[Auth Callback] Starting OAuth callback processing
[Auth Callback] ========================================
[Auth Callback] Current URL: https://your-domain.com/auth/callback?code=xxx&provider=google
[Auth Callback] Query parameters: { code: 'abc123', provider: 'google' }
[Auth Callback] Specific params: {
  error: '(none)',
  error_description: '(none)',
  error_code: '(none)',
  provider: 'google',
  code: 'present',
  access_token: '(none)'
}
[Auth Callback] Step 1: Getting session from Supabase...
```

## How to Debug on iOS TestFlight

### 1. **Connect Device to Xcode**
1. Open Xcode
2. Connect your iPhone
3. Go to `Window > Devices and Simulators`
4. Select your device
5. Click "Open Console" button at the bottom

### 2. **Run the App from TestFlight**
1. Open your app from TestFlight
2. Go to signup or login page
3. Tap "המשך באמצעות Google" or "המשך באמצעות Apple"

### 3. **Watch the Console Logs**

**For Google (fails immediately):**
Look for logs in this order:
```
[SocialAuthButtons] Google button clicked
[OAuth] Starting Google sign-in
[OAuth] Using native Google SDK
[OAuth Native] ========================================
[OAuth Native] Starting Google sign-in
[OAuth Native] Platform check: { isNative: true, platform: 'ios' }
```

Then look for where it fails - could be:
- Plugin initialization failure
- `SocialLogin.login()` throws error
- No ID token in response
- Supabase `signInWithIdToken()` error

**For Apple (fails after FaceID):**
Look for logs showing:
```
[OAuth Native] ✅ Apple sign-in successful
[OAuth Native] ✅ Identity token obtained (length: XXX)
[OAuth Native] Step 3: Exchanging identity token with Supabase...
[OAuth Native] ❌ Supabase signInWithIdToken error
[OAuth Native] Error details: { message: '...', status: XXX, code: '...' }
```

### 4. **Check the Error Toast on Device**
The toast will show both:
- Hebrew translated message
- **[DEBUG]** Raw error message

Take a screenshot or note down the `[DEBUG]` part - this is the real error!

## What to Look For

### Common Issues and Their Signatures

**1. Google Web Client ID Mismatch:**
```
[OAuth Native] ❌ Supabase signInWithIdToken error
Error message: "Invalid provider token"
```

**2. Plugin Not Installed/Configured:**
```
[OAuth Native] ❌ Google sign-in failed
Error message: "SocialLogin plugin not available"
```

**3. iOS Bundle ID Mismatch:**
```
[OAuth Native] ❌ Google sign-in failed
Error message: "DEVELOPER_ERROR"
```

**4. Supabase Provider Not Enabled:**
```
[OAuth Native] ❌ Supabase signInWithIdToken error
Error code: "invalid_provider"
```

**5. Token Exchange Failure:**
```
[OAuth Native] ❌ Supabase signInWithIdToken error
Error message: "Invalid token"
Error status: 400
```

**6. Network/CORS Issues:**
```
[OAuth Native] ❌ Supabase signInWithIdToken error
Error message: "Failed to fetch" or "Network request failed"
```

### For Web (Desktop) - Redirect Issues

Check these logs:
```
[OAuth Web] Environment: {
  windowOrigin: 'http://localhost:3000',  // ⚠️ Should be HTTPS in production!
  redirectTo: 'http://localhost:3000/auth/callback',  // ⚠️ Must match Supabase config!
  NEXT_PUBLIC_SITE_URL: '(not set)',  // ⚠️ Should be set for production!
}
```

## Quick Diagnosis Guide

### Google Never Opens (iOS)

1. Check if logs reach `[OAuth Native] Step 2: Calling SocialLogin.login()...`
   - **NO**: Plugin initialization failed - check Capacitor setup
   - **YES**: Continue to step 2

2. Check if you see `[OAuth Native] ✅ Google sign-in successful`
   - **NO**: Native SDK failed - check Google Console setup, iOS bundle ID
   - **YES**: Continue to step 3

3. Check if you see `[OAuth Native] ✅ ID token obtained`
   - **NO**: Token missing in response - log shows full response JSON
   - **YES**: Continue to step 4

4. Check `[OAuth Native] ❌ Supabase signInWithIdToken error`
   - Look at `Error details` object for specific issue
   - Common: "Invalid provider token" = wrong web client ID

### Apple Opens But Fails After FaceID (iOS)

1. Check if logs show `[OAuth Native] ✅ Apple sign-in successful`
   - **NO**: User cancelled or Apple SDK failed
   - **YES**: Continue to step 2

2. Check if you see `[OAuth Native] ✅ Identity token obtained`
   - **NO**: Token missing - rare, check Apple Developer setup
   - **YES**: Continue to step 3

3. Look at `[OAuth Native] ❌ Supabase signInWithIdToken error`
   - Check `Error details.message` for specific issue
   - Common issues:
     - "Invalid token" = Apple provider not configured in Supabase
     - "Invalid provider" = Apple not enabled in Supabase dashboard

### Callback Page Issues

If you reach the callback page, check:
```
[Auth Callback] Query parameters: { error: '...', error_description: '...' }
```

If `error` is present, that's a Supabase OAuth error:
- `access_denied` = User cancelled or provider rejected
- `server_error` = Supabase configuration issue
- `invalid_request` = Redirect URL mismatch

## Temporary Debug Features to Remove Later

1. **SocialAuthButtons.tsx lines 70-71:** Remove `[DEBUG]` section from toast description
2. **SocialAuthButtons.tsx line 77:** Change `duration` back to default (5000 or remove)
3. **SocialAuthButtons.tsx lines 133-134:** Remove `[DEBUG]` section from toast description
4. **SocialAuthButtons.tsx line 139:** Change `duration` back to default

## Production Checklist

Before removing debug logs:

1. ✅ Verify `NEXT_PUBLIC_SITE_URL` is set in production environment
2. ✅ Verify OAuth redirectTo URLs match Supabase dashboard configuration
3. ✅ Verify Google Web Client ID matches Google Console
4. ✅ Verify Apple Service ID matches Apple Developer setup
5. ✅ Verify iOS bundle ID matches Google Console and Apple Developer
6. ✅ Test both new user and existing user flows
7. ✅ Verify existing users aren't treated as errors (check callback logs)

## Next Steps

1. Run the app on iOS TestFlight
2. Try Google OAuth - note where it fails in the logs
3. Try Apple OAuth - note where it fails in the logs
4. Check the `[DEBUG]` message in the error toast
5. Report back with:
   - The exact error message from `[DEBUG]`
   - The last successful log line before the error
   - The full error details object from console
   - Screenshots of the error toast

This will allow us to pinpoint the exact configuration issue causing the OAuth failures.
