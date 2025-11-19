# FitJourney iOS Production Build Guide

## Overview
This guide documents the steps required to create a production-ready iOS build for App Store submission.

**Last Updated:** 2025-11-19
**App Version:** 1.0 (Build 1)
**Bundle ID:** com.gymbro.app

---

## Prerequisites

### 1. Environment Variables (Vercel)
Ensure ALL required environment variables are set in Vercel Dashboard:

#### Server-Only (NEVER expose to client):
```
SUPABASE_SERVICE_ROLE_KEY=<your_service_key>
OPENAI_API_KEY=<your_openai_key>
VAPID_PRIVATE_KEY=<your_vapid_private_key>
VAPID_SUBJECT=mailto:support@fitjourney.app
CRON_SECRET=<base64_secret_from_.env.local>
```

#### Client-Safe (NEXT_PUBLIC_*):
```
NEXT_PUBLIC_SUPABASE_URL=https://ivzltlqsjrikffssyvbr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your_vapid_public_key>
```

### 2. Local .env.local
Verify `.env.local` contains all required variables including `CRON_SECRET`.

---

## Production Build Steps

### Step 1: Clean Previous Builds
```bash
cd /Users/netanelhadad/Projects/gymbro/apps/web

# Remove previous builds
rm -rf .next
rm -rf ios/App/build
rm -rf ios/App/DerivedData
```

### Step 2: Build Next.js for Production
```bash
# Ensure you're in apps/web directory
cd /Users/netanelhadad/Projects/gymbro/apps/web

# Build production bundle
pnpm build

# Verify build succeeded
ls -la .next/
```

### Step 3: Sync Capacitor (PRODUCTION MODE)
```bash
# CRITICAL: Unset development environment variables
unset CAP_DEV
unset DEV_SERVER_URL

# Sync to iOS
npx cap sync ios

# Verify capacitor.config.json does NOT have "server" key
cat ios/App/App/capacitor.config.json | grep -A 3 '"server"'
# Should return NOTHING for production build
```

**Expected capacitor.config.json (Production):**
```json
{
  "appId": "com.gymbro.app",
  "appName": "FitJourney",
  "webDir": "out",
  "bundledWebRuntime": false
}
```

❌ **If you see this in capacitor.config.json (WRONG for production):**
```json
{
  "appId": "com.gymbro.app",
  "appName": "FitJourney",
  "server": {
    "url": "http://172.20.10.6:3000",
    "cleartext": true
  }
}
```

**Fix:** Manually remove the `"server"` key from `ios/App/App/capacitor.config.json`

### Step 4: Verify Info.plist (Production Settings)
```bash
# Check for development-only settings
cat ios/App/App/Info.plist | grep -E "NSAllowsArbitraryLoads|localhost|127.0.0.1|172.20"

# Should return ONLY:
# <key>NSAllowsArbitraryLoads</key>
# <false/>
```

**Critical:** Info.plist must NOT contain:
- `NSAllowsArbitraryLoads = true` ❌
- `NSAllowsLocalNetworking = true` ❌
- `NSExceptionDomains` for localhost/dev IPs ❌
- `WKAppBoundDomains` with localhost ❌

### Step 5: Open Xcode and Archive
```bash
# Open iOS project in Xcode
npx cap open ios

# OR manually:
# open ios/App/App.xcworkspace
```

**In Xcode:**

1. **Select Target:** "App" (not "AppTests" or "AppUITests")
2. **Select Destination:** "Any iOS Device (arm64)"
3. **Scheme:** Ensure "Release" configuration
4. **Product → Clean Build Folder** (⌘+⇧+K)
5. **Product → Archive** (⌘+B then Archive)
6. **Wait for archive to complete**
7. **Organizer window opens automatically**
8. **Validate App** → Check for issues
9. **Distribute App** → App Store Connect
10. **Upload**

---

## Post-Build Verification

### 1. Verify Archive Build Settings
In Xcode Organizer:
- **Build:** 1
- **Version:** 1.0
- **Bundle ID:** com.gymbro.app
- **Team:** Your Apple Developer Team
- **Provisioning Profile:** App Store

### 2. Test on Physical Device (Optional but Recommended)
```bash
# Run on connected iPhone
npx cap run ios --target="<device_id>"

# Verify:
# - App launches successfully
# - Authentication works
# - Camera permission prompts appear
# - No console errors about missing assets
```

### 3. TestFlight Upload Verification
After upload to App Store Connect:
- Go to https://appstoreconnect.apple.com
- Select "FitJourney" app
- Navigate to "TestFlight" tab
- Wait for "Processing" to complete (10-30 minutes)
- Check for any warnings or compliance issues

---

## Common Issues & Solutions

### Issue 1: Archive Fails with "No Such Module 'Capacitor'"
**Solution:**
```bash
cd ios/App
pod install
pod update
```

### Issue 2: capacitor.config.json Still Has "server" Key
**Solution:**
```bash
# Manually remove server block from:
# ios/App/App/capacitor.config.json

# Then re-sync:
npx cap sync ios
```

### Issue 3: Build Succeeds but App Shows White Screen
**Cause:** Next.js build not synced properly

**Solution:**
```bash
# Rebuild Next.js
pnpm build

# Force copy to iOS
npx cap copy ios

# Re-open in Xcode
npx cap open ios
```

### Issue 4: Apple Rejects for "Arbitrary Loads"
**Cause:** Info.plist still has development settings

**Solution:**
- Verify Info.plist has `NSAllowsArbitraryLoads = false`
- Remove all `NSExceptionDomains` entries
- Re-archive and resubmit

---

## Development vs Production Comparison

| Setting | Development | Production |
|---------|-------------|------------|
| CAP_DEV | Set to local IP | **Unset** |
| capacitor.config.json | Contains `"server"` block | **NO** `"server"` key |
| NSAllowsArbitraryLoads | `true` | **`false`** |
| NSExceptionDomains | localhost, 127.0.0.1, etc. | **Empty or removed** |
| WKAppBoundDomains | localhost | **Removed** |
| Build Configuration | Debug | **Release** |

---

## Checklist Before Archive

- [ ] All environment variables set in Vercel
- [ ] CRON_SECRET added to .env.local and Vercel
- [ ] `pnpm build` succeeds
- [ ] `CAP_DEV` is unset
- [ ] `npx cap sync ios` run in production mode
- [ ] capacitor.config.json has NO "server" key
- [ ] Info.plist has `NSAllowsArbitraryLoads = false`
- [ ] Info.plist has NO localhost exception domains
- [ ] WKAppBoundDomains removed or updated
- [ ] Xcode scheme set to "Release"
- [ ] Archive destination is "Any iOS Device (arm64)"

---

## Next Steps After Upload

1. **Internal Testing (1-2 days)**
   - Add internal testers in TestFlight
   - Test authentication flow
   - Test camera/photo permissions
   - Test nutrition scanning
   - Test AI features

2. **App Store Submission**
   - Complete App Store listing (screenshots, description, keywords)
   - Set pricing (Free)
   - Configure age rating
   - Add privacy policy URL
   - Submit for review

3. **App Review (24-48 hours typical)**
   - Monitor App Store Connect for review status
   - Respond to any reviewer questions promptly

---

## Support

For issues during build:
- Check Capacitor docs: https://capacitorjs.com/docs/ios
- Check Next.js static export: https://nextjs.org/docs/app/building-your-application/deploying/static-exports
- Review SECURITY_FINAL_AUDIT.md for security checklist

**End of Production Build Guide**
