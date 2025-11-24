# Mobile Development Setup Guide

Complete guide for running FitJourney web + iOS/Android development together.

## 🎯 Quick Start

### Web Only Development

```bash
cd apps/web
pnpm dev
```

The dev server will start on `http://localhost:3000` (or `http://0.0.0.0:3000` for network access).

**Port 3000 is REQUIRED** - If it's already in use, you'll see an error with instructions to free it.

---

### iOS Simulator Development

**Terminal 1: Start Next.js dev server**
```bash
cd apps/web
pnpm dev
```

**Terminal 2: Open Xcode and run on simulator**
```bash
cd apps/web
pnpm run cap open ios
# Or from repo root:
pnpm run ios:run-sim
```

---

### iOS Physical Device (WiFi) Development

**Prerequisites:**
- Mac and iPhone on same WiFi network
- Know your Mac's local IP address (see below)

**Terminal 1: Start Next.js dev server**
```bash
cd apps/web
pnpm dev
```

**Terminal 2: Configure and open Xcode**
```bash
# Set your Mac's local IP (find it with: ifconfig | grep "inet ")
export DEV_SERVER_URL=http://192.168.1.100:3000  # Replace with your IP

cd apps/web
CAP_DEV=1 npx cap sync ios
pnpm run cap open ios
```

---

### iOS Physical Device (USB) Development

**Prerequisites:**
- iPhone connected via USB
- `iproxy` installed: `brew install libimobiledevice`

**Terminal 1: Start combined dev server + USB tunnel**
```bash
# From repo root:
pnpm run ios:usb
```

This automatically:
1. ✅ Checks port 3000 is available
2. ✅ Starts Next.js dev server on port 3000
3. ✅ Starts `iproxy 3000 3000` to tunnel to iPhone via USB

**Terminal 2: Open Xcode**
```bash
pnpm run ios:run-usb
```

---

## 🔧 Port 3000 Configuration

### Why Port 3000 is Fixed

The Capacitor iOS/Android app is configured to load the dev server from:
- **iOS Simulator:** `http://localhost:3000`
- **Physical Device (WiFi):** `http://<your-ip>:3000`
- **Physical Device (USB):** `http://localhost:3000` (via iproxy tunnel)

**If Next.js runs on a different port** (3001, 3002, etc.), the mobile app will show a blank screen with:
```
missing required error components, refreshing...
```

### Port 3000 is Already in Use - How to Fix

When you run `pnpm dev` and port 3000 is busy, you'll see:

```
❌ PORT 3000 IS ALREADY IN USE

   Process using port 3000:
   - PID: 12345
   - Name: node

💡 HOW TO FIX:

   Option 1: Kill the specific process
   $ kill 12345

   Option 2: Kill all Node.js processes
   $ killall -9 node       # ⚠️  This kills ALL Node processes!

   Option 3: Use the convenience script
   $ pnpm run kill:node    # Kills all Node processes
```

**Find what's using port 3000:**
```bash
lsof -i :3000
```

**Kill a specific process:**
```bash
kill <PID>
```

**Kill all Node processes (use with caution):**
```bash
pnpm run kill:node
# or
killall -9 node
```

---

## 📱 Capacitor Dev Configuration

### How It Works

The Capacitor config (`apps/web/capacitor.config.ts`) automatically detects dev mode:

```typescript
const isDev = process.env.CAP_DEV === "1";
const isSim = process.env.CAP_SIM === "1";

const devServerUrl = isSim
  ? "http://localhost:3000"  // iOS Simulator
  : process.env.DEV_SERVER_URL || "http://172.20.10.6:3000";  // Physical device
```

**Dev mode is enabled when:**
- `CAP_DEV=1` is set
- Automatically set by scripts: `ios:run-sim`, `ios:run-usb`, etc.

**Production mode:**
- Requires `MOBILE_PRODUCTION_URL` environment variable
- Points to deployed Next.js server (e.g., Vercel)

---

## 🌐 Finding Your Local IP Address

For physical device development over WiFi, you need your Mac's local IP:

**macOS:**
```bash
# Method 1: System Preferences
# System Preferences → Network → WiFi → Advanced → TCP/IP → IPv4 Address

# Method 2: Command line
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Common patterns:**
- `192.168.1.x` (home routers)
- `172.20.10.x` (mobile hotspot)
- `10.0.0.x` (some networks)

**Set the dev server URL:**
```bash
export DEV_SERVER_URL=http://192.168.1.100:3000
```

---

## 🚀 Development Workflow Examples

### Example 1: Quick iOS Simulator Testing

```bash
# Terminal 1
cd apps/web
pnpm dev

# Terminal 2
pnpm run ios:run-sim
# Opens Xcode, run on simulator
```

### Example 2: iOS Device via WiFi

```bash
# Find your IP
ifconfig | grep "inet " | grep -v 127.0.0.1
# Example output: inet 192.168.1.100

# Terminal 1
cd apps/web
pnpm dev

# Terminal 2
export DEV_SERVER_URL=http://192.168.1.100:3000
cd apps/web
CAP_DEV=1 npx cap sync ios
pnpm run cap open ios
# Run on device in Xcode
```

### Example 3: iOS Device via USB (Recommended for Stable Connection)

```bash
# Single command starts both dev server and USB tunnel:
pnpm run ios:usb

# In another terminal:
pnpm run ios:run-usb
# Run on device in Xcode
```

---

## 🐛 Troubleshooting

### Issue: "Port 3000 is in use"

**Solution:** Kill the process using port 3000
```bash
lsof -i :3000
kill <PID>
# or
pnpm run kill:node
```

### Issue: iOS App Shows Blank Screen

**Symptoms:**
- White/black screen
- Console shows: `missing required error components, refreshing...`
- Xcode logs: `⚡️  Loading app at http://172.20.10.6:3000...`

**Causes:**
1. Dev server not running
2. Dev server on wrong port (3001, 3002, etc.)
3. Wrong IP address for physical device

**Solutions:**
1. Make sure dev server is running on port 3000:
   ```bash
   lsof -i :3000  # Should show Next.js
   ```

2. Check Xcode console for the URL it's trying to load

3. For physical devices, verify IP is correct:
   ```bash
   # Your Mac's IP
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # Set it explicitly
   export DEV_SERVER_URL=http://YOUR_IP:3000
   CAP_DEV=1 npx cap sync ios
   ```

### Issue: Next.js Auto-Increments to Port 3001

This should **no longer happen** with the new setup. The dev script now:
1. Checks port 3000 availability
2. Fails with a clear error if port 3000 is busy
3. Never auto-increments to 3001/3002/3003

If you see this, the port-check script is not running. Make sure you're using:
```bash
pnpm dev  # Not: next dev
```

### Issue: Android Device Can't Connect

**Solution:** Make sure the dev server binds to `0.0.0.0` (all network interfaces):
```bash
# apps/web/package.json already includes -H 0.0.0.0 flag
pnpm dev
```

Then set your IP in Android config and sync:
```bash
export DEV_SERVER_URL=http://192.168.1.100:3000
CAP_DEV=1 npx cap sync android
npx cap open android
```

---

## 📋 Scripts Reference

### From Repo Root

| Script | Description |
|--------|-------------|
| `pnpm dev:web` | Start Next.js dev server (checks port 3000) |
| `pnpm run ios:usb` | Dev server + USB tunnel for iPhone |
| `pnpm run ios:run-usb` | Sync Capacitor and open Xcode (USB mode) |
| `pnpm run ios:run-sim` | Sync Capacitor and open Xcode (Simulator mode) |
| `pnpm run kill:node` | Kill all Node processes |

### From apps/web

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start Next.js dev server (port 3000, all interfaces) |
| `pnpm dev:local` | Start Next.js dev server (port 3000, localhost only) |
| `pnpm dev:web` | Same as `pnpm dev` |
| `pnpm run cap open ios` | Open Xcode |
| `pnpm run cap sync ios` | Sync web → iOS native |

---

## ⚙️ Configuration Files

### Port Configuration

**Single source of truth:** Port 3000 is configured in:

1. **apps/web/lib/devConfig.ts** - TypeScript constant
   ```typescript
   export const DEV_SERVER_PORT = 3000;
   ```

2. **apps/web/package.json** - All dev scripts use `-p 3000`
   ```json
   "dev": "node ../../scripts/ensure-port-3000.mjs && next dev -p 3000 -H 0.0.0.0"
   ```

3. **apps/web/capacitor.config.ts** - Dev server URLs
   ```typescript
   const devServerUrl = isSim
     ? "http://localhost:3000"
     : process.env.DEV_SERVER_URL || "http://172.20.10.6:3000";
   ```

4. **scripts/ensure-port-3000.mjs** - Port availability checker
   ```javascript
   const TARGET_PORT = 3000;
   ```

**To change the port:**
1. Update all 4 locations above
2. Restart all dev servers
3. Re-sync Capacitor: `CAP_DEV=1 npx cap sync ios`

---

## 🔐 Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `CAP_DEV` | Enable Capacitor dev mode | `CAP_DEV=1` |
| `CAP_SIM` | Target iOS Simulator | `CAP_SIM=1` |
| `DEV_SERVER_URL` | Override dev server URL for physical devices | `DEV_SERVER_URL=http://192.168.1.100:3000` |
| `MOBILE_PRODUCTION_URL` | Production server URL for App Store builds | `MOBILE_PRODUCTION_URL=https://fitjourney.vercel.app` |

---

## 📚 Additional Resources

- **Capacitor Documentation:** https://capacitorjs.com/docs
- **Next.js Development:** https://nextjs.org/docs/getting-started
- **iproxy (USB Development):** https://github.com/libimobiledevice/libusbmuxd

---

## ✅ Checklist: First Time Setup

- [ ] Install dependencies: `pnpm install`
- [ ] For USB development: `brew install libimobiledevice`
- [ ] Find your Mac's local IP: `ifconfig | grep "inet "`
- [ ] Test web dev: `cd apps/web && pnpm dev`
- [ ] Test iOS sim: `pnpm run ios:run-sim`
- [ ] Test iOS USB: `pnpm run ios:usb` (separate terminal)
- [ ] Set up environment variables if needed
- [ ] Bookmark this document!

---

**Happy coding! 🚀**
