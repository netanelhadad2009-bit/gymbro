# 🚨 FIX: Infinite Loading Screen ("Loading GymBro..." / "Preparing your journey...")

## Problem Symptoms
- App stuck on "Loading GymBro..."
- App stuck on "Preparing your journey..."
- iOS Simulator shows black screen with spinner
- Multiple dev servers running causing conflicts
- Capacitor using bundled assets instead of dev URL

## Quick Fix Script (Copy & Run)

```bash
#!/bin/bash
# 1. Kill ALL node processes and free port
killall -9 node 2>/dev/null || true
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
sleep 2

# 2. Clear caches
cd ~/Projects/gymbro/apps/web
rm -rf .next
rm -rf node_modules/.cache

# 3. Start ONE clean dev server
pnpm dev --port 3000 --hostname 127.0.0.1 > /tmp/gymbro-dev.log 2>&1 &
echo "🚀 Dev server started, PID: $!"
sleep 3

# 4. Force iOS to use dev URL
cat > ios/App/App/capacitor.config.json <<'EOF'
{
  "appId": "com.gymbro.app",
  "appName": "GymBro",
  "server": {
    "url": "http://127.0.0.1:3000",
    "cleartext": true
  },
  "ios": {
    "backgroundColor": "#0B0D0E",
    "contentInset": "always",
    "allowsLinkPreview": false
  }
}
EOF

# 5. Sync iOS
pnpm exec cap sync ios

# 6. Force dev URL again (cap sync overwrites it)
cat > ios/App/App/capacitor.config.json <<'EOF'
{
  "appId": "com.gymbro.app",
  "appName": "GymBro",
  "server": {
    "url": "http://127.0.0.1:3000",
    "cleartext": true
  }
}
EOF

echo "✅ Fixed! Now rebuild in Xcode"
```

## Root Causes & Solutions

### 1. **mobile-boot.tsx Issues**
**Problem:** Component tries to redirect but gets stuck
**Solution:** Fixed in `apps/web/app/mobile-boot.tsx`:
- Must accept `children` prop and render them
- Only show loading during auth check
- Don't stay in "redirecting" state forever

**Correct Implementation:**
```tsx
export default function MobileBoot({ children }: { children: React.ReactNode }) {
  // ... auth check logic ...

  // Show loading only while checking
  if (status === "checking" || shouldRedirect) {
    return <LoadingScreen />;
  }

  // Render children once ready
  return <>{children}</>;
}
```

### 2. **Multiple Dev Servers Running**
**Problem:** Multiple `pnpm dev` processes conflict on port 3000
**Solution:** Kill ALL before starting ONE:
```bash
killall -9 node
lsof -ti :3000 | xargs kill -9
```

### 3. **Capacitor Using Bundled Assets**
**Problem:** iOS app loads from `capacitor://localhost` instead of dev server
**Solution:** Two steps required:

#### Step A: Set CAP_DEV=1 in Xcode
1. Open Xcode → Select 'App' target
2. Product → Scheme → Edit Scheme...
3. Run → Arguments → Environment Variables
4. Add: `CAP_DEV=1` (Value: 1, ✓ Enabled)
5. Clean Build Folder (Cmd+Shift+K)

#### Step B: Force config.json
```bash
# This file gets overwritten by cap sync, so force it AFTER sync
cat > ios/App/App/capacitor.config.json <<EOF
{
  "server": { "url": "http://127.0.0.1:3000", "cleartext": true }
}
EOF
```

### 4. **Middleware Blocking Auth**
**Problem:** Middleware redirects before auth loads
**Fixed in:** `apps/web/middleware.ts`
- Added try-catch error handling
- Let requests through if auth check fails
- Allow `/mobile-boot` path

## Verification Checklist

### ✅ Dev Server Health
```bash
curl -s http://127.0.0.1:3000/api/health | jq
# Should return: {"ok":true,"ts":...}
```

### ✅ Only ONE Dev Server
```bash
lsof -i :3000
# Should show only ONE node process
```

### ✅ iOS Using Dev URL
In Xcode console look for:
```
🧪 Capacitor Dev URL: http://127.0.0.1:3000
```
NOT:
```
📦 Capacitor: Using bundled web assets
```

### ✅ Mobile Boot Logs
In Xcode console:
```
[MobileBoot] Starting auth check...
[MobileBoot] Session: true Current path: /journey
```

## Prevention Tips

1. **Always kill old servers before starting new ones:**
   ```bash
   killall -9 node && pnpm dev
   ```

2. **Use the dev script with fixed hostname:**
   ```bash
   pnpm dev --port 3000 --hostname 127.0.0.1
   ```

3. **Keep CAP_DEV=1 permanently in Xcode**

4. **Check for duplicate processes regularly:**
   ```bash
   ps aux | grep "pnpm dev" | grep -v grep
   ```

## If Still Stuck

1. **Complete Reset:**
   ```bash
   cd ~/Projects/gymbro/apps/web
   killall -9 node
   rm -rf .next node_modules/.cache ios/App/App/public
   pnpm install
   pnpm dev --port 3000 --hostname 127.0.0.1
   ```

2. **Check Supabase Connection:**
   - Verify `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL`
   - Check network connectivity

3. **Force Reload in Simulator:**
   - Quit iOS Simulator completely
   - Delete app from simulator
   - Clean Build Folder in Xcode (Cmd+Shift+K)
   - Run fresh (Cmd+R)

## Emergency Contact
If none of the above works, the issue might be:
- Supabase service down
- Network/firewall blocking localhost:3000
- Corrupted node_modules (run `pnpm install --force`)

---
Last Updated: 2024-10-28
Tested on: iOS 17.5 Simulator, Next.js 14.2.12, Capacitor 6.2.0