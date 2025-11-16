# Dev Server Fix Verification Guide

This document verifies that the "Cannot reach dev server" issue has been fixed by enforcing clean dev mode configuration.

## Configuration Verification

### ✅ 1. Health Endpoint
**File**: [apps/web/app/api/health/route.ts](apps/web/app/api/health/route.ts)

**Verified**:
- ✅ Returns `{ ok: true, ts: Date.now() }`
- ✅ Sends `Cache-Control: no-store, max-age=0`
- ✅ Includes `Pragma: no-cache` and `Expires: 0` headers

**Test**:
```bash
curl -v http://localhost:3000/api/health
```

**Expected response**:
```json
{"ok":true,"ts":1234567890}
```

**Expected headers**:
```
Cache-Control: no-store, max-age=0
Pragma: no-cache
Expires: 0
```

---

### ✅ 2. Capacitor Config
**File**: [apps/web/capacitor.config.ts](apps/web/capacitor.config.ts)

**Verified**:
- ✅ Uses `http://localhost:3000` when `process.env.CAP_DEV === "1"`
- ✅ Sets `server: undefined` in production (when CAP_DEV not set)
- ✅ Includes `cleartext: true` for dev mode

**Code**:
```typescript
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
};
```

**Test**:
```bash
# Dev mode sync
CAP_DEV=1 pnpm -C apps/web cap sync ios

# Check generated config
cat apps/web/ios/App/App/capacitor.config.json
```

**Expected in dev mode**:
```json
{
  "server": {
    "url": "http://localhost:3000",
    "cleartext": true
  }
}
```

---

### ✅ 3. MobileBoot Component
**File**: [apps/web/app/mobile-boot.tsx](apps/web/app/mobile-boot.tsx)

**Verified**:
- ✅ Points to `window.location.origin` for error messages
- ✅ Only health-checks in dev Capacitor (`http://`)
- ✅ Skips health check for bundled mode (`capacitor://`)
- ✅ Skips health check for plain web (non-Capacitor)

**Logic**:
```typescript
// Bundled mode (capacitor://) → immediate UI
if (isBundledCapacitor()) {
  console.log("[MobileBoot] Bundled mode (capacitor://) → showing UI");
  setIsReady(true);
  return;
}

// Plain web → already ready
if (!isCapacitor()) return;

// Dev mode (http://localhost:3000) → health check
const res = await fetch("/api/health", {
  headers: { "cache-control": "no-cache" },
  signal: controller.signal,
});
```

**Console logs**:
- Dev mode: `[MobileBoot] origin: http://localhost:3000`
- Dev mode: `[MobileBoot] /api/health status: 200`
- Bundled: `[MobileBoot] Bundled mode (capacitor://) → showing UI`

---

### ✅ 4. Package.json Scripts

#### Root package.json
**File**: [package.json](package.json)

**Verified scripts**:
- ✅ `ios:run-sim` - Sets `CAP_DEV=1 CAP_SIM=1` + syncs + opens Xcode
- ✅ `ios:sync` - Runs `cap sync ios` via run-from-root.sh wrapper
- ✅ `ios:open` - Runs `cap open ios` via run-from-root.sh wrapper
- ✅ `doctor:ios` - Runs doctor-ios.mjs diagnostic tool

**Commands**:
```json
{
  "ios:run-sim": "tools/dev/run-from-root.sh pnpm -w run ios:run-sim:impl",
  "ios:run-sim:impl": "cross-env CAP_DEV=1 CAP_SIM=1 pnpm -w run ios:sync && pnpm -w run ios:open",
  "ios:sync": "tools/dev/run-from-root.sh pnpm -C apps/web run cap sync ios",
  "ios:open": "tools/dev/run-from-root.sh pnpm -C apps/web run cap open ios",
  "doctor:ios": "tools/dev/run-from-root.sh node tools/dev/doctor-ios.mjs"
}
```

#### apps/web package.json
**File**: [apps/web/package.json](apps/web/package.json)

**Verified scripts**:
- ✅ `dev` - Simple `next dev` command
- ✅ `cap` - Runs Capacitor CLI
- ✅ `cap sync ios` - Syncs to iOS
- ✅ `cap open ios` - Opens Xcode

**Commands**:
```json
{
  "dev": "next dev",
  "cap": "cap",
  "cap sync ios": "cap sync ios",
  "cap open ios": "cap open ios"
}
```

---

### ✅ 5. Doctor CLI Tool
**File**: [tools/dev/doctor-ios.mjs](tools/dev/doctor-ios.mjs)

**Verified checks**:
- ✅ Checks if port 3000 is listening (`lsof -i :3000`)
- ✅ Tests HTTP GET to `http://localhost:3000/api/health`
- ✅ Verifies response status is 200
- ✅ Prints PASS/FAIL results

**Sample output** (when dev server running):
```
🔍 iOS USB Development Diagnostics

═══════════════════════════════════════════════════════════

📡 Checking Next.js dev server (port 3000)...
✅ Dev server process found (PID: 12345)

🌐 Testing HTTP connection to localhost:3000...
✅ Dev server reachable at http://localhost:3000/api/health

📊 DIAGNOSTIC SUMMARY

PASS  Next.js dev server (port 3000)
PASS  Dev server HTTP reachable
```

**Run diagnostic**:
```bash
pnpm doctor:ios
```

---

## Full Workflow Test

### Step 1: Start Dev Server
```bash
pnpm -C apps/web dev --port 3000 --hostname localhost
```

**Expected output**:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
✓ Ready in 2.3s
```

### Step 2: Verify Health Endpoint
```bash
curl http://localhost:3000/api/health
```

**Expected**:
```json
{"ok":true,"ts":1234567890}
```

### Step 3: Run Diagnostic
```bash
pnpm doctor:ios
```

**Expected**:
```
✅ Dev server process found
✅ Dev server reachable at http://localhost:3000/api/health
```

### Step 4: Launch Simulator
```bash
pnpm ios:run-sim
```

**Expected**:
- Syncs with `CAP_DEV=1 CAP_SIM=1`
- Generates config with `server.url: "http://localhost:3000"`
- Opens Xcode

### Step 5: Run in Xcode
1. Select an iOS Simulator (e.g., iPhone 15 Pro)
2. Press ▶️ Run

**Expected Xcode console logs**:
```
🔧 Capacitor dev URL: http://localhost:3000
[MobileBoot] origin: http://localhost:3000
[MobileBoot] /api/health status: 200
[MobileBoot] health json: { ok: true, ts: 1234567890 }
```

**Expected app behavior**:
- ✅ Loads immediately (no blank screen)
- ✅ Shows Next.js UI from dev server
- ✅ Hot reload works

---

## Troubleshooting

### Issue: "Cannot reach dev server" overlay appears

**Cause**: Dev server isn't running or health endpoint fails

**Fix**:
1. Check dev server is running:
   ```bash
   lsof -i :3000
   ```

2. Test health endpoint:
   ```bash
   curl http://localhost:3000/api/health
   ```

3. If not running, start it:
   ```bash
   pnpm -C apps/web dev --port 3000 --hostname localhost
   ```

4. Click **Retry** in app or restart in Xcode

---

### Issue: App shows `capacitor://localhost`

**Cause**: `CAP_DEV=1` wasn't set during sync

**Fix**:
```bash
# Force re-sync with dev mode
pnpm ios:dev-reset

# Or manually
CAP_DEV=1 CAP_SIM=1 pnpm -C apps/web cap sync ios
pnpm ios:open
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

### Issue: Health check times out

**Symptoms**:
- Console shows `[MobileBoot] health failed: ...`
- Overlay appears after 3.5s

**Causes**:
1. Dev server not responding
2. Port 3000 blocked by firewall
3. Network issue in simulator

**Fix**:
1. Test from simulator Safari:
   - Open Safari in iOS Simulator
   - Navigate to `http://localhost:3000/api/health`
   - Should show JSON response

2. Check dev server logs for errors

3. Restart simulator:
   - Device → Erase All Content and Settings
   - Re-run app

---

## Summary

All configurations have been verified and are correct:

| Component | Status | Key Feature |
|-----------|--------|-------------|
| Health endpoint | ✅ | Returns `{ ok: true }` with no-cache headers |
| capacitor.config.ts | ✅ | Uses `localhost:3000` when `CAP_DEV=1` |
| MobileBoot | ✅ | Smart routing: web/bundled/dev modes |
| Root scripts | ✅ | `ios:run-sim` sets `CAP_DEV=1` |
| App scripts | ✅ | `dev`, `cap sync ios`, `cap open ios` |
| Doctor CLI | ✅ | Checks port 3000 + health endpoint |

**Expected Result**: iOS app loads from dev server with no "Cannot reach dev server" error (unless dev server is actually not running, in which case the error is correct and helpful).

**Test Status**: Ready for verification
