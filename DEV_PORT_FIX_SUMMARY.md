# Dev Server Port Fix - Implementation Complete ✅

## Problem

Next.js dev server was auto-incrementing ports (3000 → 3001 → 3002) when port 3000 was busy, causing Capacitor iOS app to show blank screen because it expected the server on port 3000.

**Symptoms:**
```
⚠ Port 3000 is in use, trying 3001 instead.
⚠ Port 3001 is in use, trying 3002 instead.
✅ Environment validation passed
  ▲ Next.js 14.2.12
  - Local:        http://localhost:3003
```

Meanwhile, iOS app shows:
```
⚡️  Loading app at http://172.20.10.6:3000...
missing required error components, refreshing...
```

---

## Solution Overview

**Fixed by implementing a strict port-checking system:**

1. ✅ **Port availability check** runs before starting Next.js
2. ✅ **Fails loudly** with helpful error message if port 3000 is busy
3. ✅ **Never auto-increments** to other ports
4. ✅ **All dev scripts** updated to enforce port 3000
5. ✅ **Comprehensive documentation** for dev workflow

---

## Files Changed

### 1. Created: `/scripts/ensure-port-3000.mjs`

**Purpose:** Check port 3000 availability before starting Next.js

**What it does:**
- Attempts to bind to port 3000
- If available: ✅ Exits with code 0, Next.js starts
- If busy: ❌ Shows detailed error with:
  - PID and process name using the port
  - Multiple fix options (kill PID, killall node, use pnpm run kill:node)
  - Explanation of why port 3000 matters for mobile dev
  - Exits with code 1, preventing Next.js from starting

**Example error output:**
```
❌ PORT 3000 IS ALREADY IN USE

   Process using port 3000:
   - PID: 12345
   - Name: node

💡 HOW TO FIX:

   Option 1: Kill the process using port 3000
   $ kill 12345

   Option 2: Kill all Node.js processes
   $ killall -9 node       # ⚠️  This kills ALL Node processes!

   Option 3: Use the convenience script
   $ pnpm run kill:node    # Kills all Node processes

🔍 WHY THIS MATTERS:

   The Capacitor iOS app expects the Next.js dev server on port 3000.
   If Next.js auto-increments to 3001/3002/3003, the iOS app will show
   a blank screen because it cannot connect to the dev server.
```

---

### 2. Modified: `/apps/web/package.json`

**Changes to dev scripts:**

**Before:**
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:local": "next dev -p 3000",
    "dev:web": "next dev -p 3000",
    "dev:fast": "TS_NODE_TRANSPILE_ONLY=1 NEXT_TELEMETRY_DISABLED=1 next dev -H 0.0.0.0 -p 3000",
    "log:workout": "cross-env LOG_PROMPT=1 USE_MOCK_WORKOUT=0 next dev -H 0.0.0.0 -p 3000",
    "log:nutrition": "cross-env LOG_PROMPT=1 USE_MOCK_NUTRITION=0 next dev -H 0.0.0.0 -p 3000",
    "mock:all": "cross-env USE_MOCK_WORKOUT=1 USE_MOCK_NUTRITION=1 next dev -H 0.0.0.0 -p 3000"
  }
}
```

**After:**
```json
{
  "scripts": {
    "dev": "node ../../scripts/ensure-port-3000.mjs && next dev -p 3000 -H 0.0.0.0",
    "dev:local": "node ../../scripts/ensure-port-3000.mjs && next dev -p 3000",
    "dev:web": "node ../../scripts/ensure-port-3000.mjs && next dev -p 3000",
    "dev:fast": "node ../../scripts/ensure-port-3000.mjs && TS_NODE_TRANSPILE_ONLY=1 NEXT_TELEMETRY_DISABLED=1 next dev -H 0.0.0.0 -p 3000",
    "log:workout": "node ../../scripts/ensure-port-3000.mjs && cross-env LOG_PROMPT=1 USE_MOCK_WORKOUT=0 next dev -H 0.0.0.0 -p 3000",
    "log:nutrition": "node ../../scripts/ensure-port-3000.mjs && cross-env LOG_PROMPT=1 USE_MOCK_NUTRITION=0 next dev -H 0.0.0.0 -p 3000",
    "mock:all": "node ../../scripts/ensure-port-3000.mjs && cross-env USE_MOCK_WORKOUT=1 USE_MOCK_NUTRITION=1 next dev -H 0.0.0.0 -p 3000"
  }
}
```

**Key changes:**
- ✅ All scripts now run `ensure-port-3000.mjs` first
- ✅ Explicit `-p 3000` flag on all Next.js commands
- ✅ Main `dev` script now includes `-H 0.0.0.0` for network access (mobile dev)
- ✅ Uses `&&` operator so Next.js only starts if port check succeeds

---

### 3. Modified: `/package.json` (root)

**Changes to root scripts:**

**Before:**
```json
{
  "scripts": {
    "dev:web": "pnpm -C apps/web dev --port 3000 --hostname localhost",
    "ios:usb:impl": "tools/dev/check-usb-env.sh && concurrently -k -n \"WEB,USB\" -c \"green,cyan\" \"pnpm -C apps/web dev --port 3000 --hostname localhost\" \"iproxy 3000 3000\""
  }
}
```

**After:**
```json
{
  "scripts": {
    "dev:web": "pnpm -C apps/web dev",
    "ios:usb:impl": "tools/dev/check-usb-env.sh && concurrently -k -n \"WEB,USB\" -c \"green,cyan\" \"pnpm -C apps/web dev\" \"iproxy 3000 3000\""
  }
}
```

**Why:**
- ❌ `--port` and `--hostname` are not valid pnpm flags
- ✅ Port 3000 is now enforced by the `apps/web/package.json` dev script
- ✅ Cleaner and more maintainable

---

### 4. Created: `/apps/web/lib/devConfig.ts`

**Purpose:** Single source of truth for dev server configuration

```typescript
/**
 * Development configuration constants
 * Shared between Next.js dev server and Capacitor mobile dev
 */

export const DEV_SERVER_PORT = 3000;
export const DEV_SERVER_HOST = '0.0.0.0';

export function getDevServerUrl(host: string = 'localhost'): string {
  return `http://${host}:${DEV_SERVER_PORT}`;
}
```

**Benefits:**
- ✅ TypeScript constant for port number
- ✅ Documented in code
- ✅ Can be imported by other modules
- ✅ Single place to change port if needed in the future

---

### 5. Created: `/docs/DEV_MOBILE_SETUP.md`

**Purpose:** Comprehensive guide for mobile development workflow

**Sections:**
1. **Quick Start** - Web only, iOS simulator, physical device (WiFi/USB)
2. **Port 3000 Configuration** - Why it's fixed, how to troubleshoot
3. **Capacitor Dev Configuration** - How dev mode works
4. **Finding Your Local IP** - For WiFi development
5. **Development Workflow Examples** - Step-by-step for common scenarios
6. **Troubleshooting** - Common issues and solutions
7. **Scripts Reference** - All available pnpm scripts
8. **Configuration Files** - Where port 3000 is defined
9. **Environment Variables** - CAP_DEV, DEV_SERVER_URL, etc.
10. **First Time Setup Checklist**

**Key features:**
- ✅ Clear step-by-step instructions
- ✅ Copy-paste ready commands
- ✅ Troubleshooting for blank screen issues
- ✅ Explains the port 3000 requirement

---

## How It Works Now

### 1. Starting Dev Server

**Command:**
```bash
cd apps/web
pnpm dev
```

**What happens:**

1. **Port check runs:**
   ```bash
   node ../../scripts/ensure-port-3000.mjs
   ```
   - If port 3000 is free: ✅ Proceeds to step 2
   - If port 3000 is busy: ❌ Shows error and exits (Next.js never starts)

2. **Next.js starts (only if port check passed):**
   ```bash
   next dev -p 3000 -H 0.0.0.0
   ```
   - `-p 3000`: Forces port 3000 (no auto-increment)
   - `-H 0.0.0.0`: Binds to all network interfaces (allows mobile device access)

**Success output:**
```
✅ Port 3000 is available
✅ Environment validation passed
  ▲ Next.js 14.2.12
  - Local:        http://localhost:3000
  - Network:      http://192.168.1.100:3000
```

**Failure output (port busy):**
```
❌ PORT 3000 IS ALREADY IN USE

   Process using port 3000:
   - PID: 45678
   - Name: node

💡 HOW TO FIX:
   [detailed instructions shown above]
```

---

### 2. iOS Development Flow

**iOS Simulator:**

Terminal 1:
```bash
cd apps/web
pnpm dev
# ✅ Port 3000 is available
# ▲ Next.js 14.2.12 - Local: http://localhost:3000
```

Terminal 2:
```bash
pnpm run ios:run-sim
# Syncs with CAP_DEV=1 CAP_SIM=1
# Opens Xcode
# Capacitor loads: http://localhost:3000
```

**iOS Physical Device (WiFi):**

Terminal 1:
```bash
cd apps/web
pnpm dev
# Server available at http://192.168.1.100:3000
```

Terminal 2:
```bash
export DEV_SERVER_URL=http://192.168.1.100:3000
pnpm run ios:run-sim  # or manually sync and open
# Capacitor loads: http://192.168.1.100:3000
```

**iOS Physical Device (USB):**

Terminal 1:
```bash
pnpm run ios:usb
# Starts both:
# - Next.js dev server on port 3000
# - iproxy tunnel: localhost:3000 → iPhone:3000
```

Terminal 2:
```bash
pnpm run ios:run-usb
# Syncs with CAP_DEV=1
# Opens Xcode
# Capacitor loads: http://localhost:3000 (via USB tunnel)
```

---

### 3. Capacitor Configuration

**From `apps/web/capacitor.config.ts`:**

```typescript
const isDev = process.env.CAP_DEV === "1";
const isSim = process.env.CAP_SIM === "1";

const devServerUrl = isSim
  ? "http://localhost:3000"  // ← Always port 3000 for simulator
  : process.env.DEV_SERVER_URL || "http://172.20.10.6:3000";  // ← Always port 3000 for device

const config: CapacitorConfig = {
  appId: "com.fitjourney.app",
  appName: "FitJourney",
  webDir: "public",
  server: isDev
    ? {
        url: devServerUrl,  // ← Dev: connects to local Next.js
        cleartext: true,
      }
    : {
        url: productionServerUrl,  // ← Prod: connects to Vercel
        cleartext: false,
      },
};
```

**Key points:**
- ✅ Port 3000 hardcoded in both simulator and device URLs
- ✅ Can override device URL with `DEV_SERVER_URL` env var
- ✅ Dev mode enabled by `CAP_DEV=1`
- ✅ Simulator mode enabled by `CAP_SIM=1`

---

## What Happens If Port 3000 Is Taken

**Scenario:** Another Next.js server or process is using port 3000

**Old behavior (BROKEN):**
```
⚠ Port 3000 is in use, trying 3001 instead.
⚠ Port 3001 is in use, trying 3002 instead.
✅ - Local: http://localhost:3002
# iOS app tries to load: http://172.20.10.6:3000
# Result: Blank screen, no connection
```

**New behavior (FIXED):**
```
❌ PORT 3000 IS ALREADY IN USE

   Process using port 3000:
   - PID: 12345
   - Name: node

💡 HOW TO FIX:

   Option 1: Kill the process using port 3000
   $ kill 12345

   Option 2: Kill all Node.js processes
   $ killall -9 node

   Option 3: Use the convenience script
   $ pnpm run kill:node

🔍 WHY THIS MATTERS:

   The Capacitor iOS app expects the Next.js dev server on port 3000.
   If Next.js auto-increments to 3001/3002/3003, the iOS app will show
   a blank screen because it cannot connect to the dev server.

# Script exits with code 1, Next.js never starts
# Developer sees clear instructions to fix the issue
```

**Developer workflow:**
1. See error message
2. Run `kill 12345` (or `pnpm run kill:node`)
3. Run `pnpm dev` again
4. ✅ Port 3000 is now available, server starts correctly

---

## Developer Experience Improvements

### Before (BAD ❌)

```bash
$ cd apps/web && pnpm dev
⚠ Port 3000 is in use, trying 3001 instead.
⚠ Port 3001 is in use, trying 3002 instead.
✅ - Local: http://localhost:3003

# Developer doesn't notice port changed
# Opens iOS app in simulator
# iOS app shows blank screen
# Developer spends 30 minutes debugging
# Finally realizes port mismatch
```

### After (GOOD ✅)

```bash
$ cd apps/web && pnpm dev
❌ PORT 3000 IS ALREADY IN USE
   Process: PID 12345 (node)

💡 HOW TO FIX:
   $ kill 12345

# Clear error message immediately
# Developer kills old process
$ kill 12345

# Try again
$ pnpm dev
✅ Port 3000 is available
▲ Next.js 14.2.12 - Local: http://localhost:3000

# Opens iOS app
# Works perfectly
# Total time: 30 seconds
```

---

## Testing Checklist

- [x] **Port check script works**
  - [x] Detects when port 3000 is available
  - [x] Detects when port 3000 is busy
  - [x] Shows PID and process name
  - [x] Provides clear fix instructions

- [x] **Dev scripts updated**
  - [x] `pnpm dev` runs port check first
  - [x] Next.js starts with `-p 3000 -H 0.0.0.0`
  - [x] All variant scripts (dev:fast, log:workout, etc.) updated

- [x] **Root scripts fixed**
  - [x] `dev:web` no longer uses invalid `--port` flag
  - [x] `ios:usb:impl` updated to use correct script

- [x] **Capacitor config correct**
  - [x] Dev mode uses port 3000 for all cases
  - [x] Simulator: `http://localhost:3000`
  - [x] Device: `http://<ip>:3000` or `DEV_SERVER_URL`

- [x] **Documentation complete**
  - [x] DEV_MOBILE_SETUP.md created
  - [x] Quick start guides for all scenarios
  - [x] Troubleshooting section
  - [x] Scripts reference

---

## Migration Notes

**For existing developers:**

1. **Pull latest changes** (this includes port-check script)

2. **Kill any running dev servers:**
   ```bash
   pnpm run kill:node
   ```

3. **Start fresh:**
   ```bash
   cd apps/web
   pnpm dev
   ```

4. **If you see port busy error:**
   - Follow the on-screen instructions to kill the blocking process
   - This is now expected behavior (not a bug!)

5. **Update your workflow:**
   - Always use `pnpm dev` (not `next dev` directly)
   - If using custom scripts, ensure they call `pnpm dev` or include the port check

---

## Configuration Reference

**Port 3000 is defined in:**

1. **scripts/ensure-port-3000.mjs**
   ```javascript
   const TARGET_PORT = 3000;
   ```

2. **apps/web/package.json**
   ```json
   "dev": "node ../../scripts/ensure-port-3000.mjs && next dev -p 3000 -H 0.0.0.0"
   ```

3. **apps/web/capacitor.config.ts**
   ```typescript
   const devServerUrl = isSim
     ? "http://localhost:3000"
     : process.env.DEV_SERVER_URL || "http://172.20.10.6:3000";
   ```

4. **apps/web/lib/devConfig.ts**
   ```typescript
   export const DEV_SERVER_PORT = 3000;
   ```

**To change the port (future):**
1. Update all 4 locations above
2. Search codebase for `:3000` to find any other references
3. Test all dev scenarios (web, simulator, device)

---

## Summary

### Problem
- Next.js auto-incremented ports when 3000 was busy
- iOS app expected port 3000, showed blank screen on mismatch
- No clear error message for developers

### Solution
- ✅ Port check script ensures port 3000 is available
- ✅ Fails loudly with helpful error if port is busy
- ✅ Never auto-increments to other ports
- ✅ All dev scripts updated for consistency
- ✅ Comprehensive documentation added

### Files Changed
- ✅ Created: `scripts/ensure-port-3000.mjs`
- ✅ Created: `apps/web/lib/devConfig.ts`
- ✅ Created: `docs/DEV_MOBILE_SETUP.md`
- ✅ Modified: `apps/web/package.json`
- ✅ Modified: `package.json` (root)

### Result
- ✅ Reliable dev experience
- ✅ No more blank screen mystery
- ✅ Clear error messages
- ✅ Easy troubleshooting
- ✅ Better documentation

**Status:** ✅ Ready for development!
