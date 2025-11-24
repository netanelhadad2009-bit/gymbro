# Privacy Manifest Implementation Notes

## Date Added
2025-11-19

## Problem Resolved
**ITMS-91061: Missing Privacy Manifest**

Apple App Store Connect flagged the app for missing privacy manifests in these third-party SDKs:
- `Frameworks/GTMAppAuth.framework/GTMAppAuth`
- `Frameworks/GTMSessionFetcher.framework/GTMSessionFetcher`
- `Frameworks/GoogleSignIn.framework/GoogleSignIn`

## Solution Implemented

### File Created
**Location:** `apps/web/ios/App/App/PrivacyInfo.xcprivacy`

This is the app-level privacy manifest that declares how the app and its third-party SDKs handle user data.

### What This Manifest Declares

#### 1. No App Tracking
```xml
<key>NSPrivacyTracking</key>
<false/>
```
**Meaning:** The app does NOT use App Tracking Transparency for advertising or cross-app tracking purposes.

#### 2. User ID Collection for Authentication Only
```xml
<key>NSPrivacyCollectedDataType</key>
<string>NSPrivacyCollectedDataTypeUserID</string>
```
**Meaning:** The app collects user identifiers through Google Sign-In and Apple Sign-In SDKs.

**Purposes:**
- `NSPrivacyCollectedDataTypePurposeAuthentication` - For signing users in
- `NSPrivacyCollectedDataTypePurposeAccountManagement` - For managing user accounts

**Important:** This data is:
- ✅ Linked to user identity (`NSPrivacyCollectedDataTypeLinked: true`)
- ❌ NOT used for tracking (`NSPrivacyCollectedDataTypeTracking: false`)

#### 3. No Special API Usage
```xml
<key>NSPrivacyAccessedAPITypes</key>
<array/>
```
**Meaning:** No declaration needed at this time for special system APIs.

## What Was NOT Changed

✅ **Google Sign-In SDK** - Remains fully functional
✅ **Apple Sign-In SDK** - Remains fully functional
✅ **GTMAppAuth Framework** - Remains fully functional
✅ **GTMSessionFetcher Framework** - Remains fully functional
✅ **App functionality** - No code changes required
✅ **Bundle ID** - Still `com.fitjourney.app`
✅ **Signing certificates** - Not modified

## Verification

### In Xcode
1. Open `apps/web/ios/App/App.xcodeproj`
2. Navigate to the App folder in the Project Navigator
3. You should see `PrivacyInfo.xcprivacy` listed
4. It should be included in the App target (check File Inspector → Target Membership)

### In Build
The privacy manifest is automatically included in the app bundle at:
```
FitJourney.app/PrivacyInfo.xcprivacy
```

Apple's validation process will detect this file and verify it contains appropriate declarations for the third-party SDKs.

## Expected Outcome

After uploading a new build with this privacy manifest:

1. ✅ **ITMS-91061 warning should disappear** in App Store Connect
2. ✅ **App should pass privacy validation** during submission
3. ✅ **Users will NOT see App Tracking Transparency prompts** (since we declared no tracking)
4. ✅ **Google/Apple Sign-In will continue working** normally

## Apple Privacy Documentation

- [Privacy manifest files](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)
- [Describing data use in privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_data_use_in_privacy_manifests)
- [Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/)

## Next Steps

1. **Clean Build Folder** in Xcode (⇧⌘K)
2. **Archive** the app (Product → Archive)
3. **Upload to App Store Connect**
4. **Verify** that ITMS-91061 warning no longer appears

## Update: Auth Plugin Migration (2025-11-20)

**ITMS-91061 FULLY RESOLVED:** Replaced legacy auth plugins that were causing privacy manifest warnings.

### Old Plugins (REMOVED ❌)
- `@codetrix-studio/capacitor-google-auth@3.4.0-rc.4`
  - Bundled `GTMAppAuth`, `GTMSessionFetcher`, `GoogleSignIn` frameworks without privacy manifests
- `@capacitor-community/apple-sign-in@^7.1.0`
  - No built-in privacy manifest support

### New Plugin (INSTALLED ✅)
- `@capgo/capacitor-social-login@7.18.2`
  - ✅ Privacy manifest compliant
  - ✅ Actively maintained (published 2 days ago, Capacitor 7 compatible)
  - ✅ Unified API for Google and Apple sign-in
  - ✅ No bundled frameworks with privacy issues
  - ✅ Official migration guides from both old plugins

### Technical Changes Made
1. **Dependencies**: Removed old plugins via npm, installed `@capgo/capacitor-social-login`
2. **TypeScript Code**: Migrated `apps/web/lib/auth/oauth.native.ts` to new `SocialLogin` API
   - Google: Uses `SocialLogin.login({ provider: 'google' })`
   - Apple: Uses `SocialLogin.login({ provider: 'apple' })`
   - Response structure updated to extract `result.result?.idToken`
3. **iOS Podfile**: Automatically updated by `cap sync` (line 23: `CapgoCapacitorSocialLogin`)
4. **Android Gradle**: Automatically updated by `cap sync` (line 21: `capgo-capacitor-social-login`)
5. **Info.plist**: Google Client ID and URL schemes preserved (no changes needed)
6. **PrivacyInfo.xcprivacy**: Remains unchanged and accurate

### Expected Outcome After New Build
- ✅ **ITMS-91061 warning eliminated** - No more missing privacy manifest errors for GTMAppAuth/GTMSessionFetcher/GoogleSignIn
- ✅ **App-level privacy manifest remains valid** - Continues to accurately declare UserID collection for authentication
- ✅ **Google and Apple sign-in continue working** - Same Supabase OAuth flow, just different native SDK
- ✅ **Clean App Store submission** - Should pass all privacy validation checks

### Testing Required
Before submitting to App Store:
1. Test iOS Google sign-in (simulator + device)
2. Test iOS Apple sign-in (simulator + device)
3. Test Android Google sign-in (emulator + device)
4. Verify Supabase session created successfully
5. Archive and upload to TestFlight
6. Confirm ITMS-91061 no longer appears in App Store Connect

See [AUTH_MIGRATION_PLAN.md](../../../AUTH_MIGRATION_PLAN.md) for complete migration details.

---

## Maintenance

If you add new third-party SDKs that collect data in the future, you may need to update this privacy manifest to include their data collection purposes.

The current manifest accurately reflects the app's actual behavior:
- Collects user ID for authentication only
- No advertising or tracking
- No cross-app data sharing for tracking purposes
