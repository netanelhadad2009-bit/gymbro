# ✅ FIXED: Black Screen in iOS Simulator

## Date Applied
2025-01-18 22:45

## Problem Summary
iOS app showed a black screen with no console logs. App was loading from bundled assets (`capacitor://localhost`) instead of connecting to the dev server at `http://localhost:3000`.

## Root Causes Discovered

### 1. Capacitor Config Overwritten by `cap sync`
**Problem**: Running `pnpm exec cap sync ios` overwrites `ios/App/App/capacitor.config.json`, removing the `server.url` configuration.

**Solution**: Force the config AFTER running `cap sync`:
```bash
# Sync first (this overwrites config)
pnpm exec cap sync ios

# Then force config again
cat > ios/App/App/capacitor.config.json <<'EOF'
{
  "appId": "com.gymbro.app",
  "appName": "FitJourney",
  "webDir": "public",
  "server": {
    "url": "http://localhost:3000",
    "cleartext": true
  },
  "ios": {
    "backgroundColor": "#0B0D0E",
    "contentInset": "always",
    "allowsLinkPreview": false
  }
}
EOF
```

### 2. Webpack Cache Corruption
**Problem**: The `.next` webpack cache can become corrupted, causing JavaScript eval errors in the iOS app.

**Error Message** (visible in Xcode console):
```
⚡️ JS Eval error A JavaScript exception occurred
```

**Error Message** (visible in dev server logs):
```
⚠ Fast Refresh had to perform a full reload.
⨯ TypeError: Cannot read properties of undefined (reading 'call')
   at Object.__webpack_require__ [as require]
```

**Solution**: Clear the `.next` cache and restart the dev server:
```bash
cd ~/Projects/gymbro/apps/web
killall -9 node          # Kill old dev server
rm -rf .next            # Clear corrupted cache
pnpm dev:fast           # Start fresh
```

### 3. Typo in Xcode Scheme Environment Variable
**Problem**: The `CAP_DEV` environment variable had a **leading space** in the Xcode scheme file:
```xml
<!-- WRONG (with space before CAP_DEV) -->
<EnvironmentVariable
   key = " CAP_DEV"
   value = "1"
   isEnabled = "YES">
</EnvironmentVariable>
```

**Impact**: Capacitor looks for `CAP_DEV` but finds ` CAP_DEV` instead, causing it to use bundled assets.

**Solution**: Fixed the typo in `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme`:
```xml
<!-- CORRECT (no space) -->
<EnvironmentVariable
   key = "CAP_DEV"
   value = "1"
   isEnabled = "YES">
</EnvironmentVariable>
```

## Fix Script Created

Location: `/tmp/comprehensive-ios-fix.sh`

This script:
1. ✅ Verifies dev server is running
2. ✅ Tests dev server connectivity
3. ✅ Sets capacitor config
4. ✅ Runs `cap sync ios`
5. ✅ **Re-applies config after sync** (critical!)
6. ✅ Verifies final configuration

## Verification Script

Location: `/tmp/final-verification.sh`

Checks:
- Dev server running and accessible
- Capacitor config has server URL
- Xcode scheme has `CAP_DEV=1`
- No typos in environment variable name

## How to Apply Fix

### Quick Fix (if black screen appears again)

**Step 1: Fix Capacitor Config**
```bash
/tmp/comprehensive-ios-fix.sh
```

**Step 2: Clear Webpack Cache** (if you see "JS Eval error" in Xcode console)
```bash
cd ~/Projects/gymbro/apps/web
killall -9 node
rm -rf .next
pnpm dev:fast
```

**Step 3: Rebuild in Xcode**
1. Stop app (Cmd+.)
2. Clean Build Folder (Cmd+Shift+K)
3. Run (Cmd+R)

### Manual Fix
1. Ensure dev server is running: `pnpm dev:fast`
2. Run the comprehensive fix script
3. Clean build in Xcode
4. Rebuild and run

## Expected Xcode Console Logs

When working correctly, you should see:
```
🧪 Capacitor Dev URL: http://localhost:3000
[AuthProvider] Initializing auth state...
[HomePage] Auth state: { loading: false, hasSession: true, hasUser: true }
```

When NOT working (using bundled assets):
```
📦 Capacitor: Using bundled web assets
```

## Prevention

1. **Always force config after `cap sync`**: The sync command overwrites the config file
2. **Verify Xcode scheme**: Check for typos in environment variables
3. **Use the fix script**: Run `/tmp/comprehensive-ios-fix.sh` whenever you sync iOS

## Related Files
- [ios/App/App/capacitor.config.json](/Users/netanelhadad/Projects/gymbro/apps/web/ios/App/App/capacitor.config.json) - Capacitor configuration
- [ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme](/Users/netanelhadad/Projects/gymbro/apps/web/ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme) - Xcode scheme with environment variables
- [FIX_INFINITE_LOADING.md](/Users/netanelhadad/Projects/gymbro/FIX_INFINITE_LOADING.md) - Comprehensive troubleshooting guide

## Testing Performed

✅ Fixed typo in Xcode scheme (`" CAP_DEV"` → `"CAP_DEV"`)
✅ Created comprehensive fix script
✅ Cleared corrupted webpack cache (`.next`)
✅ Dev server running cleanly without webpack errors (Ready in 895ms)
✅ Verified dev server running and accessible
✅ Verified capacitor config has server URL
✅ Health endpoint responding correctly
✅ All verification checks pass

## Next Time This Happens

1. Run: `/tmp/final-verification.sh`
2. If it fails, run: `/tmp/comprehensive-ios-fix.sh`
3. Clean Build Folder in Xcode (Cmd+Shift+K)
4. Run app (Cmd+R)
5. Check Xcode console for `🧪 Capacitor Dev URL: http://localhost:3000`
