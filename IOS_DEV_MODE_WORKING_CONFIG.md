# iOS Dev Mode - Working Configuration ✅

**Last Updated**: 2025-10-23
**Status**: Verified and Working

This document captures the confirmed working configuration for iOS development mode, where the app connects live to the Next.js dev server.

---

## 📋 Verified Configuration

### 1. Health Endpoint ✅
**File**: `apps/web/app/api/health/route.ts`

```typescript
// apps/web/app/api/health/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() }, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
```

**Verified**: Returns `{ ok: true, ts: timestamp }` with no-cache headers

---

### 2. Capacitor Configuration ✅
**File**: `apps/web/capacitor.config.ts`

```typescript
// apps/web/capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const isDev = process.env.CAP_DEV === "1";

const config: CapacitorConfig = {
  appId: "com.gymbro.app",
  appName: "GymBro",
  webDir: "public",
  server: isDev
    ? {
        url: "http://localhost:3000",
        cleartext: true,
      }
    : undefined,
  ios: {
    backgroundColor: "#0B0D0E",
    contentInset: "always",
    allowsLinkPreview: false,
  },
};

export default config;
```

**Verified**:
- Uses `http://localhost:3000` when `CAP_DEV=1`
- Sets `server: undefined` in production
- Includes `cleartext: true` for HTTP

---

### 3. MobileBoot Component ✅
**File**: `apps/web/app/mobile-boot.tsx`

```typescript
"use client";
import React, { useEffect, useState } from "react";

function isCapacitor() {
  return typeof window !== "undefined" && !!(window as any).Capacitor;
}

function isBundledCapacitor() {
  return typeof window !== "undefined" && location.protocol === "capacitor:";
}

export default function MobileBoot({ children }: { children: React.ReactNode }) {
  // Default: if not Capacitor, show UI immediately (web).
  const [isReady, setIsReady] = useState(!isCapacitor());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we're on capacitor's bundled path, DO NOT health-check; just show the UI.
    if (isBundledCapacitor()) {
      console.log("[MobileBoot] Bundled mode (capacitor://) → showing UI");
      setIsReady(true);
      return;
    }

    // If not in Capacitor at all (plain web), we're already ready.
    if (!isCapacitor()) return;

    // Dev server mode (http://localhost:3000) — perform a fast health check.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    (async () => {
      try {
        console.log("[MobileBoot] origin:", window.location.origin);
        const res = await fetch("/api/health", {
          headers: { "cache-control": "no-cache" },
          signal: controller.signal,
        });
        console.log("[MobileBoot] /api/health status:", res.status);
        if (!res.ok) throw new Error(`health ${res.status}`);
        const json = await res.json().catch(() => ({}));
        console.log("[MobileBoot] health json:", json);
        setError(null);
        setIsReady(true);
      } catch (e: any) {
        console.error("[MobileBoot] health failed:", e?.message || e);
        setError(
          "Cannot reach dev server at " +
            window.location.origin +
            ". Make sure Next.js is running on port 3000."
        );
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  if (isReady) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black text-white">
      <div className="mx-6 max-w-sm text-center space-y-4">
        <h1 className="text-xl font-semibold">Loading…</h1>
        <p className="text-sm opacity-80">
          {error ?? "Checking connection to the dev server…"}
        </p>
        <button
          className="mt-2 rounded-md bg-white/10 px-4 py-2"
          onClick={() => {
            console.log("[MobileBoot] retry clicked");
            try {
              localStorage.clear();
              sessionStorage.clear();
            } catch {}
            window.location.replace(window.location.origin + "/");
          }}
        >
          Retry
        </button>
        <div className="text-xs opacity-60">
          Tip: In Terminal run <code>pnpm -C apps/web dev --port 3000 --hostname localhost</code>
        </div>
      </div>
    </div>
  );
}
```

**Verified**:
- Detects bundled mode (`capacitor://`) → immediate UI
- Detects web mode → immediate UI
- Detects dev mode (`http://`) → health check with 3.5s timeout
- Shows helpful error overlay on failure
- Provides retry button that clears caches

---

### 4. Package.json Scripts ✅

#### Root `package.json`

```json
{
  "scripts": {
    "ios:run-sim": "tools/dev/run-from-root.sh pnpm -w run ios:run-sim:impl",
    "ios:run-sim:impl": "cross-env CAP_DEV=1 CAP_SIM=1 pnpm -w run ios:sync && pnpm -w run ios:open",
    "ios:dev-reset": "tools/dev/run-from-root.sh pnpm -w run ios:dev-reset:impl",
    "ios:dev-reset:impl": "cross-env CAP_DEV=1 CAP_SIM=1 pnpm -C apps/web cap sync ios && pnpm -w run ios:open",
    "ios:sync": "tools/dev/run-from-root.sh pnpm -C apps/web run cap sync ios",
    "ios:open": "tools/dev/run-from-root.sh pnpm -C apps/web run cap open ios",
    "doctor:ios": "tools/dev/run-from-root.sh node tools/dev/doctor-ios.mjs"
  }
}
```

#### `apps/web/package.json`

```json
{
  "scripts": {
    "dev": "next dev",
    "cap": "cap",
    "cap sync ios": "cap sync ios",
    "cap open ios": "cap open ios"
  }
}
```

---

### 5. Info.plist (ATS Settings) ✅
**File**: `apps/web/ios/App/App/Info.plist`

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key><true/>
  <key>NSAllowsArbitraryLoadsForMedia</key><true/>
  <key>NSAllowsArbitraryLoadsInWebContent</key><true/>
  <key>NSAllowsLocalNetworking</key><true/>
  <key>NSExceptionDomains</key>
  <dict>
    <key>localhost</key>
    <dict>
      <key>NSIncludesSubdomains</key><true/>
      <key>NSTemporaryExceptionAllowsInsecureHTTPLoads</key><true/>
    </dict>
    <key>127.0.0.1</key>
    <dict>
      <key>NSTemporaryExceptionAllowsInsecureHTTPLoads</key><true/>
    </dict>
  </dict>
</dict>
<key>WKAppBoundDomains</key>
<array>
  <string>localhost</string>
</array>
```

**Verified**: Allows HTTP connections to localhost for development

---

## 🚀 Working Development Workflow

### Daily Workflow (Verified Working)

#### Step 1: Start Dev Server
```bash
pnpm -C apps/web dev --port 3000 --hostname localhost
```

**Expected output**:
```
▲ Next.js 14.2.12
- Local:        http://localhost:3000
✓ Ready in 1699ms
```

**Keep this terminal open during development!**

#### Step 2: Verify Dev Server
```bash
curl http://localhost:3000/api/health
```

**Expected**:
```json
{"ok":true,"ts":1761158953191}
```

#### Step 3: Launch iOS Simulator
```bash
pnpm ios:run-sim
```

This command:
1. Sets `CAP_DEV=1 CAP_SIM=1`
2. Runs `cap sync ios`
3. Opens Xcode

#### Step 4: Run in Xcode
1. Select an iOS Simulator (e.g., iPhone 15 Pro)
2. Press ▶️ Run

---

## ✅ Expected Console Logs (Verified)

### When Dev Server is Running

```
🔧 Capacitor dev URL: http://localhost:3000
⚡️  Loading app at http://localhost:3000...
✅ BridgeViewController: webView configured successfully
✅ SceneDelegate: Window created with BridgeViewController
[MobileBoot] origin: http://localhost:3000
[MobileBoot] /api/health status: 200
[MobileBoot] health json: { ok: true, ts: 1761158953191 }
```

**Result**: App loads successfully, shows Next.js UI, hot reload works ✅

### When Dev Server is NOT Running

```
🔧 Capacitor dev URL: http://localhost:3000
⚡️  Loading app at http://localhost:3000...
⚡️  WebView failed provisional navigation
⚡️  Error: לא ניתן להתחבר לשרת. (Cannot connect to server)
[MobileBoot] origin: http://localhost:3000
[MobileBoot] health failed: [error message]
```

**Result**: Error overlay appears with Retry button (no blank screen) ✅

---

## 🔍 Diagnostic Tools

### Quick Health Check
```bash
# Check if dev server is running
lsof -i :3000

# Test health endpoint
curl http://localhost:3000/api/health

# Full diagnostic
pnpm doctor:ios
```

### Doctor Output (When Working)
```
📡 Checking Next.js dev server (port 3000)...
✅ Dev server process found (PID: 12345)

🌐 Testing HTTP connection to localhost:3000...
✅ Dev server reachable at http://localhost:3000/api/health

📊 DIAGNOSTIC SUMMARY
PASS  Next.js dev server (port 3000)
PASS  Dev server HTTP reachable
```

---

## 🎯 Key Behaviors (Verified)

| Scenario | Protocol | MobileBoot Action | Result |
|----------|----------|-------------------|--------|
| **Web browser** | `http://` or `https://` | Immediate UI | Shows app instantly |
| **Bundled iOS** | `capacitor://localhost` | Immediate UI | Shows app instantly |
| **Dev iOS (server on)** | `http://localhost:3000` | Health check → UI | Loads in <4s, hot reload works |
| **Dev iOS (server off)** | `http://localhost:3000` | Health check → Error | Error overlay with Retry button |

---

## 📝 Common Issues & Solutions

### Issue: "Cannot reach dev server" overlay

**Cause**: Dev server not running

**Solution**:
```bash
# Start dev server
pnpm -C apps/web dev --port 3000 --hostname localhost

# In simulator, click Retry button
# Or restart app in Xcode
```

---

### Issue: App shows `capacitor://localhost`

**Cause**: `CAP_DEV=1` wasn't set during sync

**Solution**:
```bash
pnpm ios:dev-reset
```

**Verify**:
```bash
cat apps/web/ios/App/App/capacitor.config.json | grep "server"
```

Should show:
```json
"server": {
  "url": "http://localhost:3000",
  "cleartext": true
}
```

---

### Issue: Port 3000 in use

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Restart dev server
pnpm -C apps/web dev --port 3000 --hostname localhost
```

---

## 📚 Reference Documentation

- **[DEV_MODE_QUICKSTART.md](DEV_MODE_QUICKSTART.md)** - Quick daily workflow
- **[DEV_SERVER_FIX_VERIFICATION.md](DEV_SERVER_FIX_VERIFICATION.md)** - Detailed verification guide
- **[README_DEV.md](README_DEV.md)** - Simulator development guide
- **[README_DEV_USB.md](README_DEV_USB.md)** - USB device development guide
- **[XCODE_SCHEME_SETUP.md](XCODE_SCHEME_SETUP.md)** - Xcode configuration

---

## ✅ Verification Checklist

Before considering dev mode broken, verify:

- [ ] Dev server is running on port 3000
- [ ] Health endpoint responds: `curl http://localhost:3000/api/health`
- [ ] `CAP_DEV=1` was set during last sync
- [ ] Generated config has server URL: `cat apps/web/ios/App/App/capacitor.config.json`
- [ ] Info.plist allows localhost connections
- [ ] Xcode console shows "Capacitor dev URL: http://localhost:3000"

If all above are ✅ and app still doesn't work, check:
- [ ] Simulator can access localhost (test in Safari: http://localhost:3000)
- [ ] No firewall blocking port 3000
- [ ] No VPN interfering with localhost

---

## 🎉 Summary

This configuration is **verified working** as of 2025-10-23.

**Key Success Criteria**:
- ✅ Dev server running → App loads immediately
- ✅ Dev server stopped → Error overlay (not blank screen)
- ✅ Retry button works (clears cache, reloads)
- ✅ Hot reload functions correctly
- ✅ MobileBoot handles all modes (web/bundled/dev)
- ✅ Clear console logs for debugging

**Last Test Results**:
- Health endpoint: ✅ `{"ok":true,"ts":1761158953191}`
- Xcode logs: ✅ "Capacitor dev URL: http://localhost:3000"
- App behavior: ✅ Error overlay when server off → loads when server on

---

**Saved by**: Claude
**Date**: 2025-10-23
**Status**: Production Ready ✅
