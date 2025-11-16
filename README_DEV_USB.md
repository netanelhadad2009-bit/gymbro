# iOS USB Development Setup

**IMPORTANT: This is the ONLY supported dev mode for real devices. Wi-Fi IP-based dev has been removed to prevent black screens.**

This guide explains how to run the GymBro iOS app in development mode over USB, allowing hot reload and debugging with your iPhone connected via cable.

## Why USB-Only Development?

The app **always loads `http://localhost:3000` in dev mode** - no IP addresses, no Wi-Fi detection. This eliminates:
- Black screen issues from wrong IP addresses
- Network configuration headaches
- Wi-Fi connectivity problems

## Quick Start (USB Dev)

### One-time Setup
```bash
pnpm bootstrap:ios-usb
```

This installs and configures `iproxy`, `libimobiledevice`, and starts the required services.

### Daily Workflow
**Terminal 1** - Start dev server + USB tunnel:
```bash
pnpm ios:usb
```

**Terminal 2** - Sync and open Xcode:
```bash
pnpm ios:run-usb
```

Then in Xcode: select your device (🔌 icon) → ▶️ Run

### Verify Environment
```bash
pnpm doctor:usb      # checks iproxy + device
pnpm doctor:whereami # prints repo root
```

### Test the Tunnel
When `pnpm ios:usb` is running, open Safari on your iPhone and navigate to:
```
http://localhost:3000
```

If Safari can't open it:
- Ensure Terminal 1 is running
- Reconnect USB cable and "Trust This Computer"
- Run `pnpm doctor:usb` to diagnose

## How It Works

The USB development setup:
1. Runs Next.js dev server on your Mac at `localhost:3000`
2. Uses `iproxy` to tunnel port 3000 from iPhone → Mac via USB
3. iOS app WebView loads `http://localhost:3000` on the device
4. That localhost request tunnels through the USB cable to your Mac's dev server

## Prerequisites

### 1. Install Required Tools

First-time setup only. Install libimobiledevice and usbmuxd on your Mac:

```bash
brew install libimobiledevice usbmuxd
```

This installs `iproxy`, which creates the USB tunnel.

### 2. Connect Your iPhone

1. Connect your iPhone to your Mac via USB cable
2. If prompted on iPhone, tap **"Trust This Computer"**
3. Enter your iPhone passcode if requested

Verify connection:
```bash
idevice_id -l
```
You should see your device's UDID listed.

## Development Workflow

### Quick Start (Recommended)

From the project root, run these commands:

**Terminal 1** - Start Next.js dev server + USB tunnel:
```bash
pnpm ios:usb
```

This runs:
- Next.js dev server at `localhost:3000` (binds to localhost only)
- `iproxy 3000 3000` (USB port forwarding)

You should see both processes running:
```
[DEV] ▲ Next.js 14.2.12
[DEV] - Local:        http://localhost:3000
[USB] waiting for connection
```

**Terminal 2** - Sync with CAP_DEV=1 and open Xcode:
```bash
pnpm ios:run-usb
```

This runs with `CAP_DEV=1` environment variable:
- `CAP_DEV=1 cap sync ios` - syncs with dev URL config
- `cap open ios` - launches Xcode

**In Xcode**:
1. Select your iPhone from the device dropdown (look for cable icon 🔌)
2. Press ▶️ **Run**
3. The app will install and launch on your iPhone

The app's WebView will load `http://localhost:3000` via USB tunnel. Hot reload works perfectly.

### Manual Steps (If You Need More Control)

If you prefer to run commands separately:

1. **Start Next.js dev server**:
   ```bash
   pnpm --filter @gymbro/web dev:web
   ```

2. **Start USB tunnel** (in another terminal):
   ```bash
   iproxy 3000 3000
   ```
   Leave this running. You should see:
   ```
   waiting for connection
   ```

3. **Sync Capacitor**:
   ```bash
   cd apps/web
   npx cap sync ios
   ```

4. **Open Xcode**:
   ```bash
   npx cap open ios
   ```

5. **Build and Run**:
   - In Xcode, select your iPhone (connected via cable)
   - Press ▶️ Run
   - App installs and loads `http://localhost:3000` via USB tunnel

## Verify the Tunnel Works

Before running in Xcode, test the tunnel:

1. Ensure `iproxy 3000 3000` is running
2. On your iPhone, open **Safari**
3. Navigate to `http://localhost:3000`
4. You should see your Next.js dev server

If this works, the app will work too.

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm bootstrap:ios-usb` | **One-time setup**: Installs iproxy, libimobiledevice, starts services |
| `pnpm doctor:usb` | Verifies USB environment, checks for device connection |
| `pnpm doctor:whereami` | Prints the repo root directory path |
| `pnpm ios:usb` | Starts Next.js dev server + iproxy tunnel (with preflight checks) |
| `pnpm ios:run-usb` | **WITH CAP_DEV=1**: Syncs and opens Xcode in dev mode |
| `pnpm ios:sync` | Syncs web build to iOS (uses current CAP_DEV setting) |
| `pnpm ios:open` | Opens Xcode project |

## Run from Anywhere

**NEW**: You can now run USB iOS dev commands from **any directory** - not just the repo root!

```bash
# Works from anywhere inside the repo
cd ~/Projects
pnpm ios:usb

# Or from a subdirectory
cd ~/Projects/gymbro/apps/web/src
pnpm ios:run-usb

# Or from the root (as before)
cd ~/Projects/gymbro
pnpm ios:usb
```

Under the hood, the scripts auto-locate the gymbro monorepo root and `cd` there before running.

### How it works

All iOS dev scripts are wrapped with `tools/dev/run-from-root.sh`:
- Searches upward from your current directory for the repo root
- Detects the root by finding `package.json` with `"name": "gymbro"` or monorepo structure
- Changes to the repo root automatically
- Executes the actual command

### Troubleshooting

**If you see**: `"Could not locate repo root"`
- Make sure you are inside the gymbro repository (not outside it)
- Tip: `cd ~/Projects/gymbro` then re-run your command

**Check where the repo root is**:
```bash
pnpm doctor:whereami
```

This prints the absolute path to the repo root.

## How It Works

### Environment Variable: CAP_DEV=1

The `CAP_DEV=1` environment variable is **critical** - it switches Capacitor config to dev mode:

```typescript
// capacitor.config.ts
const isDev = process.env.CAP_DEV === '1';

// Only add server config in dev mode
...(isDev && {
  server: {
    url: 'http://localhost:3000',
    cleartext: true,
    allowNavigation: ['localhost', '127.0.0.1'],
  },
}),

ios: {
  scheme: isDev ? 'http' : 'capacitor',  // http in dev, capacitor in prod
}
```

**What happens:**
- `CAP_DEV=1` → App loads `http://localhost:3000` on device
- `iproxy` forwards device's localhost:3000 → Mac's localhost:3000 via USB
- Next.js dev server on Mac serves content
- No `CAP_DEV` → App uses bundled assets (production mode)

**ALL IP-based dev URL logic has been removed.** Dev mode ONLY uses localhost via USB tunnel.

### iOS App Transport Security

The iOS app is configured in `Info.plist` to allow localhost HTTP:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key><true/>
  <key>NSAllowsLocalNetworking</key><true/>
</dict>

<key>WKAppBoundDomains</key>
<array>
  <string>localhost</string>
</array>
```

This allows:
- HTTP traffic to localhost (for USB dev)
- WKAppBoundDomains restricts WebView to localhost only
- Production builds still use bundled assets via `capacitor://` scheme

### Runtime Logging

When the app launches, check Xcode console for:
```
🔧 Capacitor dev URL: http://localhost:3000
```

Or in production:
```
📦 Capacitor: Using bundled web assets (production mode)
```

This confirms which mode the app is running in.

## Troubleshooting

### Common Pitfalls

**Device not detected (`pnpm doctor:usb` shows "No iOS device detected")**

1. **Use original Apple cable** - Third-party cables may not support data transfer
2. **Unlock your iPhone** - Device must be unlocked to establish trust
3. **Tap "Trust This Computer"** - Watch for the popup on your device
4. **Pair the device manually**:
   ```bash
   idevicepair pair
   ```
5. **Verify again**:
   ```bash
   pnpm doctor:usb
   ```

**Still not working?**
- Try a different USB port (prefer USB-A or direct USB-C ports over hubs)
- Restart the usbmuxd service:
  ```bash
  brew services restart usbmuxd
  ```
- Check if device appears in Finder sidebar (macOS) - if not, cable/port issue
- Reboot your iPhone and try again

**iproxy command not found**

Run the bootstrap script:
```bash
pnpm bootstrap:ios-usb
```

If on Apple Silicon and still not working after bootstrap:
```bash
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
pnpm doctor:usb
```

### App shows white/black screen or error overlay

**If you see the dev error overlay:**
The app detected it can't reach localhost:3000. This is expected if:
- `iproxy` is not running
- Next.js dev server is not running
- You didn't run `pnpm ios:usb`

**Steps to fix:**

1. **Kill any stale processes**:
   ```bash
   pkill iproxy
   pkill -f "next dev"
   ```

2. **Restart dev environment**:
   ```bash
   pnpm ios:usb
   ```
   Wait for both processes to start:
   ```
   [DEV] Ready in 2.3s
   [USB] waiting for connection
   ```

3. **Re-sync with CAP_DEV=1**:
   ```bash
   pnpm ios:run-usb
   ```
   In Xcode console, verify you see:
   ```
   🔧 Capacitor dev URL: http://localhost:3000
   ```

4. **Test tunnel on device**:
   - On iPhone Safari, navigate to `http://localhost:3000`
   - Should show your Next.js app
   - If Safari can't load it, the tunnel is broken

5. **Check capacitor.config.json was synced correctly**:
   ```bash
   cat apps/web/ios/App/App/capacitor.config.json
   ```
   Should contain:
   ```json
   {
     "server": {
       "url": "http://localhost:3000"
     }
   }
   ```
   If it doesn't, you forgot `CAP_DEV=1` during sync.

### "Could not connect to server" error

1. **Verify port 3000 is free**:
   ```bash
   lsof -i :3000
   ```
   If something else is using it, kill it or use a different port.

2. **Try a different port** (e.g., 5173):
   - Update `apps/web/package.json`:
     ```json
     "dev:web": "next dev -p 5173"
     ```
   - Update root `package.json`:
     ```json
     "ios:usb": "CAP_DEV=1 concurrently ... \"iproxy 5173 5173\""
     ```
   - Update `capacitor.config.ts`:
     ```typescript
     url: 'http://localhost:5173'
     ```

### Device not connecting via iproxy

1. **Restart usbmuxd**:
   ```bash
   brew services restart usbmuxd
   ```

2. **Replug your iPhone**:
   - Unplug USB cable
   - Plug back in
   - Re-trust computer if prompted

3. **Check device is detected**:
   ```bash
   idevice_id -l
   ```
   Should list your device UDID. If not, reinstall libimobiledevice:
   ```bash
   brew reinstall libimobiledevice
   ```

### Xcode build fails or app crashes

1. **Clean derived data**:
   ```bash
   pnpm --filter @gymbro/web ios:clean
   ```

2. **Re-sync Capacitor**:
   ```bash
   pnpm ios:sync
   ```

3. **Restart Xcode** and rebuild.

### Changes not hot-reloading

1. Ensure Next.js dev server is running in watch mode
2. Check browser console in Safari Web Inspector (see below)
3. Try manual refresh in app (pull down to refresh, or force-quit and reopen)

### VPN/Firewall blocking iproxy

- Disable VPN temporarily
- Check macOS Firewall settings - allow incoming connections for `iproxy` and `usbmuxd`

## Debugging

### Safari Web Inspector

To debug the WebView on your device:

1. **On iPhone**: Settings → Safari → Advanced → Enable **Web Inspector**
2. **On Mac**: Safari → Settings → Advanced → Check **"Show Develop menu in menu bar"**
3. With app running on device, open Safari on Mac
4. Menu: **Develop** → [Your iPhone Name] → **GymBro**
5. Safari Web Inspector opens, showing console, network, etc.

## Production Builds

**IMPORTANT**: These USB dev settings only activate when `CAP_DEV=1`.

For production builds, the app uses the bundled static files from `webDir: 'public'` and the `capacitor://` scheme (no external server).

To build for production:
```bash
pnpm --filter @gymbro/web build
pnpm ios:sync
# Open Xcode and archive for App Store
```

## Production Builds

**IMPORTANT**: Production builds do NOT use `CAP_DEV=1`:

```bash
# Build the Next.js app
pnpm --filter @gymbro/web build

# Sync to iOS WITHOUT CAP_DEV
pnpm ios:sync

# Open Xcode and archive for App Store
pnpm ios:open
```

Without `CAP_DEV=1`, the app:
- Uses bundled static files from `webDir: 'public'`
- Loads via `capacitor://` scheme (not HTTP)
- No dev server URL configured

## Simulator vs Device

- **Simulator**: Can load `localhost:3000` directly (no USB tunnel needed, but CAP_DEV=1 still required)
- **Device**: Must use USB tunnel with `iproxy 3000 3000` + `CAP_DEV=1`
- **Production**: Both use bundled assets (no dev server)

## Summary

**TL;DR for USB-only development**:

1. **First time**: `brew install libimobiledevice usbmuxd`
2. **Connect iPhone** via USB, trust computer
3. **Terminal 1**: `pnpm ios:usb` (dev server + iproxy)
4. **Terminal 2**: `pnpm ios:run-usb` (sync with CAP_DEV=1 + open Xcode)
5. **Xcode**: Select device (🔌), press Run
6. **Verify**: Check Xcode console shows `🔧 Capacitor dev URL: http://localhost:3000`

**What changed to fix black screens:**
- ✅ Removed ALL Wi-Fi IP-based dev URL logic
- ✅ Dev mode ONLY uses `http://localhost:3000` via USB tunnel
- ✅ Added `CAP_DEV=1` environment variable for dev/prod switching
- ✅ Added runtime URL logging in AppDelegate
- ✅ Added dev server connection check with error overlay
- ✅ Added `WKAppBoundDomains` for localhost restriction
- ✅ Production builds unchanged (bundled assets only)

**Key files modified**:
- [capacitor.config.ts](apps/web/capacitor.config.ts) - Localhost-only, removed IP logic
- [Info.plist](apps/web/ios/App/App/Info.plist) - ATS + WKAppBoundDomains
- [AppDelegate.swift](apps/web/ios/App/App/AppDelegate.swift) - Runtime URL logging
- [MobileBoot.tsx](apps/web/components/MobileBoot.tsx) - Connection check overlay
- [package.json](package.json) - Fixed `ios:run-usb` with CAP_DEV=1

**Test the setup**:
```bash
# On iPhone Safari, after running pnpm ios:usb:
http://localhost:3000
# Should load your Next.js app
```

Happy coding! 🎉
