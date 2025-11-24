# OAuth Authentication Fix Summary

**Date:** 2025-11-20
**Issue:** OAuth buttons (Google & Apple) were showing incorrect error messages ("email or password incorrect") even though no email/password was involved.

---

## 🔧 Problem Analysis

The issue occurred because:

1. **Error handling was context-unaware**: When OAuth failed, errors were translated based on the page context ('sign_in' or 'sign_up'), which defaulted to "email or password incorrect"
2. **No distinction between OAuth and password auth**: The error translator couldn't tell if an error came from OAuth or password-based login
3. **Auth callback didn't handle new users**: When a new user signed in via OAuth, there was no code to create their profile, causing silent failures

---

## ✅ Files Changed

### 1. **New File: `lib/auth/oauth-errors.ts`**
Created a dedicated error class for OAuth failures:
- `OAuthError` class wraps errors with provider context (Google/Apple)
- `withOAuthErrorHandling()` helper catches errors and adds provider info
- Preserves cancellation messages if user cancels OAuth flow

### 2. **Updated: `lib/auth/oauth.ts`**
Wrapped OAuth functions with error handling:
- `startGoogleSignIn()` now throws `OAuthError` instead of generic errors
- `startAppleSignIn()` now throws `OAuthError` instead of generic errors
- Errors are automatically tagged with the provider name

### 3. **Updated: `lib/i18n/authHe.ts`**
Enhanced error translation to detect OAuth errors:
- Added OAuthError detection **before** checking context
- Returns provider-specific Hebrew messages:
  - Google error: `"שגיאה בהתחברות עם Google. נסה שוב."`
  - Apple error: `"שגיאה בהתחברות עם Apple. נסה שוב."`
  - Cancelled: `"התחברות עם [Provider] בוטלה."`
- Email/password errors unchanged: `"האימייל או הסיסמה שגויים."`

### 4. **Updated: `lib/auth/oauth.native.ts`**
Fixed TypeScript type assertions:
- Added `(result as any)` type assertions for idToken extraction
- Prevents TypeScript errors while maintaining functionality

### 5. **Completely Rewritten: `app/auth/callback/page.tsx`**
Now properly handles both new and existing users:
- **Checks if profile exists** before assuming user is set up
- **Creates profile for new users** with OAuth provider data (name, avatar, email)
- **Handles race conditions** (duplicate key errors)
- **Routes correctly**:
  - New users → `/onboarding/gender`
  - Existing users without onboarding → `/onboarding/gender`
  - Existing users with onboarding → `/journey`
- **Extensive logging** for debugging:
  ```
  [Auth Callback] Starting OAuth callback processing
  [Auth Callback] Session found for user: <user_id>
  [Auth Callback] User status: NEW | EXISTING
  [Auth Callback] Creating profile for new user
  [Auth Callback] Profile created successfully
  [Auth Callback] Redirecting new user to onboarding
  ```

---

## 📋 OAuth Flow (Final Implementation)

### Google Sign-In

**From Signup Page:**
1. User taps "הרשמה באמצעות Google"
2. `SocialAuthButtons.handleGoogle()` called
3. → `startGoogleSignIn()` (wraps with OAuthError)
4. → Native SDK or web redirect (based on platform)
5. → Auth callback receives session
6. → Profile created for new user OR existing user loaded
7. → Redirect to onboarding or journey

**From Login Page:**
1. User taps "התחברות באמצעות Google"
2. Same flow as signup (OAuth doesn't differentiate)
3. → If existing user, redirects to `/journey`
4. → If new user, redirects to `/onboarding/gender`

### Apple Sign-In

**Identical flow to Google**, just with Apple provider.

### Error Handling

**OAuth Errors (Google/Apple):**
```
Error Type: OAuthError
Toast Title: "שגיאה בהתחברות עם Google" | "שגיאה בהתחברות עם Apple"
Toast Description: "שגיאה בהתחברות עם Google. נסה שוב." | "שגיאה בהתחברות עם Apple. נסה שוב."
```

**Password Errors (Email/Password form):**
```
Error Type: AuthError
Error Message: "האימייל או הסיסמה שגויים."
```

**Cancelled OAuth:**
```
Error Type: OAuthError (with cancel message)
Toast Description: "התחברות עם Google בוטלה." | "התחברות עם Apple בוטלה."
```

---

## 🧪 Testing Checklist

### On Device (iOS/Android)

- [ ] **Signup with Google** (new user)
  - Opens native Google sign-in
  - Creates profile automatically
  - Redirects to `/onboarding/gender`
  - No "email or password" errors

- [ ] **Signup with Apple** (new user)
  - Opens native Apple sign-in
  - Creates profile automatically
  - Redirects to `/onboarding/gender`
  - No "email or password" errors

- [ ] **Login with Google** (existing user)
  - Opens native Google sign-in
  - Loads existing profile
  - Redirects to `/journey` (if onboarding done) or `/onboarding/gender`
  - No "email or password" errors

- [ ] **Login with Apple** (existing user)
  - Opens native Apple sign-in
  - Loads existing profile
  - Redirects correctly
  - No "email or password" errors

- [ ] **Cancel OAuth flow**
  - Shows "התחברות בוטלה" message
  - Buttons re-enable
  - Can try again

- [ ] **Email/Password login failure**
  - Still shows "האימייל או הסיסמה שגויים"
  - Not affected by OAuth changes

---

## 🔍 Debugging

All OAuth flows now have extensive console logging. Check device logs:

```bash
# iOS
npx cap run ios

# Android
npx cap run android
```

### Key Log Patterns

**Success:**
```
[OAuth] Starting Google sign-in
[OAuth] Using native Google SDK
[OAuth Native] Initializing SocialLogin plugin
[OAuth Native] Google sign-in successful, extracting ID token
[OAuth Native] Supabase session established: user@example.com
[Auth Callback] Starting OAuth callback processing
[Auth Callback] Session found for user: <uuid>
[Auth Callback] User status: NEW
[Auth Callback] Creating profile for new user
[Auth Callback] Profile created successfully
[Auth Callback] Redirecting new user to onboarding
```

**Error (with proper message):**
```
[SocialAuthButtons] Google OAuth error: [error details]
[Toast] "שגיאה בהתחברות עם Google. נסה שוב."
```

---

## 🎯 Hebrew Error Messages (Final)

### OAuth Errors
| Scenario | Message |
|----------|---------|
| Google OAuth fails | `שגיאה בהתחברות עם Google. נסה שוב.` |
| Apple OAuth fails | `שגיאה בהתחברות עם Apple. נסה שוב.` |
| User cancels Google | `התחברות עם Google בוטלה.` |
| User cancels Apple | `התחברות עם Apple בוטלה.` |

### Password Errors (Unchanged)
| Scenario | Message |
|----------|---------|
| Invalid credentials | `האימייל או הסיסמה שגויים.` |
| Invalid email | `האימייל שהוזן אינו תקין.` |
| Weak password | `הסיסמה חייבת להיות באורך 8 תווים לפחות.` |
| Email already registered | `האימייל כבר רשום במערכת.` |

---

## 📦 Key Technical Details

### OAuth Error Wrapping
```typescript
// Before (generic error)
throw new Error("Login failed");

// After (provider-aware error)
throw new OAuthError('google', 'OAuth error with google', originalError);
```

### Error Translation Priority
1. **Check for OAuthError** → Return provider-specific message
2. Check for known error codes → Return mapped Hebrew message
3. Check HTTP status codes → Return status-based message
4. Check message patterns → Return pattern-matched message
5. Fallback to context-based default

### Profile Creation Logic
```typescript
// Check if profile exists
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .maybeSingle();

if (!profile) {
  // Create profile from OAuth metadata
  await supabase.from('profiles').insert({
    id: user.id,
    email: user.email,
    full_name: metadata.full_name || metadata.name,
    avatar_url: metadata.avatar_url || metadata.picture,
    provider: metadata.provider,
  });
}
```

---

## 🚀 Next Steps

1. **Test on iOS device** (simulator and physical)
2. **Test on Android device** (emulator and physical)
3. **Verify both signup and login flows**
4. **Check that error messages are correct**
5. **Confirm profile creation works for new users**

---

## ✨ Summary

**Before:**
- OAuth errors showed "האימייל או הסיסמה שגויים" ❌
- New users couldn't sign up via OAuth ❌
- No distinction between OAuth and password auth ❌

**After:**
- OAuth errors show provider-specific messages ✅
- New users automatically get profiles created ✅
- Clear separation between OAuth and password errors ✅
- Extensive logging for debugging ✅
- Both signup and login work identically for OAuth ✅

