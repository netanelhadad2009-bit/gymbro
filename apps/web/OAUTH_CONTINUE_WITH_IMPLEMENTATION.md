# OAuth "Continue with Google/Apple" Implementation

## Summary
Implemented unified OAuth flow that seamlessly handles both sign-in and sign-up for Google and Apple OAuth providers. The buttons now say "המשך באמצעות" (Continue with) on both signup and login pages, and the backend automatically handles whether the user is new or returning.

## Files Changed

### 1. `/components/SocialAuthButtons.tsx`
**Changes:**
- Updated button label from context-dependent "הרשמה באמצעות" / "התחברות באמצעות" to unified "המשך באמצעות"
- Added comment explaining that OAuth handles both flows automatically
- No changes to error handling - already correctly uses `translateAuthError` with provider context

**Lines changed:** 25-26

### 2. `/app/auth/callback/page.tsx`
**Changes:**
- Added comprehensive logging with emojis for easy tracking
- Enhanced flow documentation with clear sections for NEW_USER and EXISTING_USER
- Added provider detection from user metadata
- Improved error logging with detailed object output
- Fixed TypeScript error handling (catch error: any)
- Made it crystal clear that existing users are NOT errors - they're valid returning users

**Key improvements:**
- Logs user type (NEW_USER vs EXISTING_USER) clearly
- Logs OAuth provider (Google, Apple, etc.)
- Handles race conditions gracefully (duplicate profile creation)
- Never throws errors for existing users - routes them based on onboarding status
- Comprehensive logging boundaries with separator lines

**Lines changed:** 10-150

### 3. Existing files NOT changed (already correct)
- `/lib/auth/oauth.ts` - Already wraps OAuth calls with error handling
- `/lib/auth/oauth-errors.ts` - Already provides OAuthError class with provider context
- `/lib/i18n/authHe.ts` - Already detects OAuth errors and provides Hebrew messages
- `/app/login/LoginClient.tsx` - Already uses SocialAuthButtons with variant="login"
- `/app/signup/SignupClient.tsx` - Already uses SocialAuthButtons with variant="signup"

## How the Flow Works

### 🆕 New User via Google (Sign-up)

1. **User clicks "המשך באמצעות Google" on signup page**
   - `SocialAuthButtons.tsx` calls `startGoogleSignIn()`
   - Triggers haptic feedback

2. **OAuth flow starts**
   - `lib/auth/oauth.ts` → `withOAuthErrorHandling('google', ...)`
   - Detects platform (native iOS vs web)
   - Calls native SDK or web redirect

3. **User authenticates with Google**
   - Google returns ID token
   - Supabase creates new auth.users row
   - Redirects to `/auth/callback`

4. **Callback page processes**
   ```
   [Auth Callback] ========================================
   [Auth Callback] ✅ Session found for user: { userId, email, provider: 'google' }
   [Auth Callback] User status: { type: 'NEW_USER', hasProfile: false }
   [Auth Callback] 🆕 NEW USER - Creating profile
   [Auth Callback] ✅ Profile created successfully
   [Auth Callback] 🎯 Redirecting new user to onboarding
   ```

5. **User redirected to `/onboarding/gender`**
   - Starts onboarding flow
   - No errors shown

### 👤 Existing User via Google (Sign-in from signup page)

1. **User clicks "המשך באמצעות Google" on signup page**
   - Same flow as above

2. **OAuth flow starts**
   - Same as above

3. **User authenticates with Google**
   - Google returns ID token
   - Supabase finds existing auth.users row
   - Creates new session
   - Redirects to `/auth/callback`

4. **Callback page processes**
   ```
   [Auth Callback] ========================================
   [Auth Callback] ✅ Session found for user: { userId, email, provider: 'google' }
   [Auth Callback] User status: { type: 'EXISTING_USER', hasProfile: true }
   [Auth Callback] 👤 EXISTING USER - Checking onboarding status
   [Auth Callback] ✅ Onboarding complete → redirecting to /journey
   ```

5. **User redirected based on onboarding status**
   - If `has_completed_onboarding = true` → `/journey`
   - If `has_completed_onboarding = false` → `/onboarding/gender`
   - **No error shown** - this is a successful login!

### ❌ Canceled Google Login

1. **User clicks "המשך באמצעות Google"**
   - OAuth flow starts

2. **User cancels on Google consent screen**
   - Native SDK or web redirect returns cancellation error

3. **Error handling in `SocialAuthButtons.tsx`**
   - `withOAuthErrorHandling` catches error
   - Detects "cancel" in error message
   - Throws `OAuthError('google', 'התחברות בוטלה.')`

4. **Error translation**
   - `translateAuthError` detects OAuthError
   - Returns: "התחברות עם Google בוטלה."

5. **User sees toast**
   - Title: "שגיאה בהתחברות עם Google"
   - Description: "התחברות עם Google בוטלה."
   - Error haptic feedback (triple vibration)
   - Buttons re-enabled

### 🌐 Network Error

1. **User clicks "המשך באמצעות Google"**
   - OAuth flow starts
   - Network connection fails

2. **Error handling**
   - `withOAuthErrorHandling` catches network error
   - Throws `OAuthError('google', 'OAuth error with google', originalError)`

3. **Error translation**
   - `translateAuthError` detects OAuthError
   - Returns: "שגיאה בהתחברות עם Google. נסה שוב."

4. **User sees toast**
   - Hebrew error message displayed
   - Error haptic feedback
   - Buttons re-enabled

## Key Technical Details

### Error Handling Flow
```
User Action
    ↓
startGoogleSignIn() / startAppleSignIn()
    ↓
withOAuthErrorHandling('google' | 'apple', async () => {
    if (isNative()) → Native SDK
    else → Web redirect
})
    ↓
    ├─ Success → Redirect to /auth/callback
    └─ Error → throw OAuthError(provider, message, originalError)
              ↓
              translateAuthError(err)
              ↓
              Detect OAuthError.name === 'OAuthError'
              ↓
              Return Hebrew message: "שגיאה בהתחברות עם ${provider}"
```

### Profile Creation Logic
```typescript
// In /app/auth/callback/page.tsx

const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .maybeSingle();

if (!profile) {
  // NEW USER - Create profile
  await supabase.from('profiles').insert({
    id: user.id,
    email: user.email,
    full_name: metadata.full_name || metadata.name,
    avatar_url: metadata.avatar_url || metadata.picture,
    provider: metadata.provider || provider,
  });

  router.replace("/onboarding/gender");
} else {
  // EXISTING USER - Check onboarding
  if (profile.has_completed_onboarding) {
    router.replace("/journey");
  } else {
    router.replace("/onboarding/gender");
  }
}
```

### Race Condition Handling
```typescript
if (insertError.code === '23505') {
  // Duplicate key error - profile already exists
  // This can happen if two requests create profile simultaneously
  console.warn('[Auth Callback] Profile already exists (race condition)');
  // Continue normally - don't fail the auth flow
}
```

## Test Checklist for iPhone

### ✅ Test 1: New User via Google (from signup page)
1. Open app
2. Tap "הרשם" to go to signup page
3. Tap "המשך באמצעות Google"
4. Sign in with NEW Google account (not registered before)
5. **Expected:**
   - Google consent screen appears
   - After consent, redirects back to app
   - Creates profile automatically
   - Lands on `/onboarding/gender`
   - No error toasts shown
6. **Check console logs:**
   ```
   [Auth Callback] User status: { type: 'NEW_USER', hasProfile: false }
   [Auth Callback] 🆕 NEW USER - Creating profile
   [Auth Callback] ✅ Profile created successfully
   ```

### ✅ Test 2: Existing User via Google (from signup page)
1. Use account from Test 1 (already registered)
2. Log out of app
3. Tap "הרשם" to go to signup page
4. Tap "המשך באמצעות Google"
5. Sign in with SAME Google account from Test 1
6. **Expected:**
   - Google consent screen appears (or auto-signs in)
   - After consent, redirects back to app
   - No error toasts shown
   - If onboarding incomplete → `/onboarding/gender`
   - If onboarding complete → `/journey`
7. **Check console logs:**
   ```
   [Auth Callback] User status: { type: 'EXISTING_USER', hasProfile: true }
   [Auth Callback] 👤 EXISTING USER - Checking onboarding status
   ```

### ✅ Test 3: Existing User via Google (from login page)
1. Log out
2. Tap "התחבר" to go to login page
3. Tap "המשך באמצעות Google"
4. **Expected:**
   - Same behavior as Test 2
   - Button says "המשך באמצעות Google" (not "התחברות")
   - No errors shown

### ✅ Test 4: Canceled Google Login
1. Tap "המשך באמצעות Google"
2. On Google consent screen, tap "Cancel" or back button
3. **Expected:**
   - Returns to app
   - Shows toast: "שגיאה בהתחברות עם Google - התחברות עם Google בוטלה."
   - Triple vibration error haptic
   - Buttons re-enabled (can try again)
   - No crash

### ✅ Test 5: Apple Sign-in (New User)
1. Tap "המשך באמצעות Apple"
2. Sign in with Apple ID
3. **Expected:**
   - Same flow as Google
   - Creates profile
   - Redirects to onboarding
   - No errors

### ✅ Test 6: Network Error
1. Disable WiFi and cellular data
2. Tap "המשך באמצעות Google"
3. **Expected:**
   - Shows error toast with network error message
   - Buttons re-enabled
   - No crash

### ✅ Test 7: Button Labels Check
1. Go to signup page
2. **Expected:** Button says "המשך באמצעות Google" (not "הרשמה")
3. Go to login page
4. **Expected:** Button says "המשך באמצעות Google" (not "התחברות")
5. Both pages use identical wording

### ✅ Test 8: Console Logging
1. Open Safari Web Inspector → Connect to device
2. Run any OAuth flow
3. **Expected:** Comprehensive logs with:
   - ========================================
   - User status (NEW_USER / EXISTING_USER)
   - Provider (google, apple)
   - Profile creation status
   - Redirect destination
   - Clear emojis (🆕, 👤, ✅, ❌, ⚠️, 🎯)

## Benefits of This Implementation

### 1. **Unified UX**
- No confusion between "sign up" and "sign in" for OAuth
- Same button works for both new and returning users
- Consistent wording across all auth pages

### 2. **Error Handling**
- Provider-specific Hebrew error messages
- Never treats existing users as errors
- Graceful handling of race conditions
- Clear distinction between user cancellation and technical errors

### 3. **Developer Experience**
- Comprehensive logging with clear visual markers
- Easy to debug OAuth flow issues
- Type-safe error handling
- Clear code comments explaining logic

### 4. **Production Ready**
- Handles edge cases (race conditions, network errors)
- No breaking changes to existing code
- Backward compatible with existing OAuth setup
- Works on both native (iOS) and web platforms

## Next Steps

After testing on your iPhone, you may want to:

1. **Analytics tracking:**
   - Track OAuth provider used (Google vs Apple)
   - Track new vs returning user metrics
   - Track cancellation rates

2. **Error recovery:**
   - Add "Try again" button in error toasts
   - Add fallback to email/password if OAuth fails repeatedly

3. **Onboarding optimization:**
   - Pre-fill onboarding fields from OAuth metadata
   - Skip certain onboarding steps for OAuth users

4. **Profile enrichment:**
   - Fetch additional user data from OAuth providers
   - Update avatar from OAuth provider on each login
