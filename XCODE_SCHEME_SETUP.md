# Xcode Scheme Setup for iOS Simulator Development

This guide explains how to configure Xcode to use `CAP_DEV=1` environment variable for Simulator builds, ensuring the app loads the dev server at `http://localhost:3000`.

## Setting Up CAP_DEV=1 in Xcode

### Option 1: Using Xcode UI (Recommended for Simulator)

1. **Open the project in Xcode**:
   ```bash
   pnpm ios:open
   ```

2. **Edit the scheme**:
   - In Xcode menu: `Product` → `Scheme` → `Edit Scheme...`
   - Or press `⌘ + <` (Command + Less Than)

3. **Add environment variable**:
   - Select `Run` in the left sidebar
   - Go to the `Arguments` tab
   - Under `Environment Variables`, click the `+` button
   - Add:
     - **Name**: `CAP_DEV`
     - **Value**: `1`
   - ✅ Make sure the checkbox next to it is **checked**

4. **Close and save**:
   - Click `Close`
   - The scheme is now configured for dev mode

### Option 2: Using Scripts (Current Setup)

The project already uses `pnpm ios:run-sim` which sets `CAP_DEV=1` during the `cap sync` step:

```bash
pnpm ios:run-sim
```

This script:
- Sets `CAP_DEV=1` and `CAP_SIM=1` during sync
- Generates the correct `capacitor.config.json` with dev server URL
- Opens Xcode ready to run

**You can use either Option 1 OR Option 2** - they achieve the same result.

## Verifying the Setup

### 1. Check Xcode Console on App Launch

After running the app in Simulator, check the Xcode console output:

**Expected (Dev Mode - Simulator)**:
```
🧪 Capacitor Dev URL: http://localhost:3000 (iOS Simulator)
[MobileBoot] origin: http://localhost:3000
[MobileBoot] /api/health status: 200
[MobileBoot] health json: { ok: true, ts: 1234567890 }
```

**Expected (Production Mode)**:
```
📦 Capacitor: Using bundled web assets (production mode)
```

### 2. Check Generated Config

Verify the generated config file has the dev server URL:

```bash
cat apps/web/ios/App/App/capacitor.config.json
```

**Expected output (Dev Mode)**:
```json
{
  "appId": "com.gymbro.app",
  "appName": "GymBro",
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
```

### 3. Test the Health Endpoint

Before running the app, verify the dev server is reachable:

```bash
# In Simulator Safari, visit:
http://localhost:3000/api/health

# Or from Terminal:
curl http://localhost:3000/api/health
```

**Expected response**:
```json
{"ok":true,"ts":1234567890}
```

## Troubleshooting

### MobileBoot Shows Error Overlay

**Symptoms**: App shows "Cannot reach dev server" overlay

**Solutions**:
1. **Verify dev server is running**:
   ```bash
   pnpm -C apps/web dev --port 3000 --hostname localhost
   ```

2. **Test in Simulator Safari**:
   - Open Safari in iOS Simulator
   - Navigate to `http://localhost:3000/api/health`
   - Should show `{"ok":true,"ts":...}`

3. **Check Xcode console** for logs:
   ```
   [MobileBoot] origin: http://localhost:3000
   [MobileBoot] health failed: [error message]
   ```

4. **Restart the Simulator**:
   - `Device` → `Erase All Content and Settings`
   - Rebuild and run

### App Shows Black/Blank Screen

**Symptoms**: No loading spinner, no error overlay, just black screen

**This should NOT happen with the new MobileBoot** - it has a 3.5s timeout and always shows either:
- Loading state (if checking)
- Error overlay (if failed)
- App content (if succeeded)

If you still see a black screen:
1. **Check Xcode console** for crash logs or errors
2. **Verify MobileBoot is imported** in layout.tsx
3. **Clean build**:
   ```bash
   # In Xcode: Product → Clean Build Folder (⌘ + Shift + K)
   pnpm ios:sync
   ```

### Environment Variable Not Working

**Symptoms**: App still loads bundled assets instead of dev server

**Check**:
1. **Verify CAP_DEV is set** in Xcode scheme (see Option 1 above)
2. **Re-sync with CAP_DEV=1**:
   ```bash
   CAP_DEV=1 pnpm ios:sync
   ```
   Or use the script:
   ```bash
   pnpm ios:run-sim
   ```

3. **Check capacitor.config.json** was updated (see "Verifying the Setup" above)

## Development Workflow

### Recommended: Quick Iteration with Simulator

**Terminal 1** - Start dev server (keep running):
```bash
pnpm -C apps/web dev --port 3000 --hostname localhost
```

**Terminal 2** - One-time setup:
```bash
pnpm ios:run-sim
```

**In Xcode**:
1. Select an iOS Simulator (e.g., iPhone 15 Pro)
2. Press ▶️ Run
3. Make code changes → Hot reload works automatically

### Alternative: Manual Xcode Scheme Setup

If you prefer to open Xcode manually:
1. Set `CAP_DEV=1` in scheme (Option 1 above) - **one-time setup**
2. Run `pnpm ios:sync` whenever you change Capacitor config
3. Press ▶️ Run in Xcode

## Key Differences: Simulator vs USB Device

| Feature | Simulator | USB Device |
|---------|-----------|------------|
| **Access to localhost** | Direct ✅ | Via iproxy tunnel |
| **Setup** | `CAP_DEV=1` in scheme | `pnpm ios:usb` (tunnel) |
| **Scripts** | `pnpm ios:run-sim` | `pnpm ios:run-usb` |
| **Console Log** | `🧪 Capacitor Dev URL: http://localhost:3000 (iOS Simulator)` | `🔧 Capacitor dev URL: http://localhost:3000` |
| **Speed** | Fastest (~1s reload) | Slower (~2-3s reload) |

## Bundled Mode (Production/Testing Without Dev Server)

If you want to test the app **without** running a dev server (using bundled assets):

### 1. Build the Web App
```bash
pnpm -C apps/web build
```

### 2. Copy & Sync to iOS
```bash
pnpm -C apps/web cap copy ios
pnpm -C apps/web cap sync ios
```

This places the built web assets into `ios/App/App/public`.

### 3. Remove CAP_DEV=1 from Xcode Scheme
- In Xcode: `Product` → `Scheme` → `Edit Scheme...`
- Under `Run` → `Arguments` → `Environment Variables`
- **Uncheck or remove** the `CAP_DEV=1` variable
- Close

### 4. Run in Xcode
- Select a Simulator
- Press ▶️ Run
- The app will load from `capacitor://localhost` (bundled assets)

**Expected console log**:
```
📦 Capacitor: Using bundled web assets (production mode)
[MobileBoot] Bundled mode (capacitor://) → showing UI
```

**Note**: MobileBoot will **immediately** show the UI in bundled mode - no health check, no delay.

### When to Use Bundled Mode

- Testing production builds locally
- When dev server is unavailable
- Testing offline behavior
- Verifying bundled asset integrity

### Switching Back to Dev Mode

1. Set `CAP_DEV=1` back in Xcode scheme (see "Setting Up CAP_DEV=1" above)
2. Run `pnpm ios:run-sim` to re-sync with dev config
3. Start dev server: `pnpm -C apps/web dev`

## Summary

- **For Simulator (Dev Mode)**: Set `CAP_DEV=1` in Xcode scheme OR use `pnpm ios:run-sim`
- **For USB Device (Dev Mode)**: Use `pnpm ios:usb` + `pnpm ios:run-usb` (sets CAP_DEV automatically)
- **For Bundled Mode (Production)**: Build web app, copy to iOS, remove `CAP_DEV=1` from scheme
- **Verify**: Check Xcode console for the dev URL log or bundled mode log on launch
- **Test**: MobileBoot should show loading → app content (or error overlay if server unreachable in dev mode)

### MobileBoot Behavior by Mode

| Mode | Protocol | MobileBoot Behavior | Console Log |
|------|----------|---------------------|-------------|
| **Web (Browser)** | `http://` | Immediate UI (no check) | None |
| **Dev (Simulator/USB)** | `http://localhost:3000` | Health check → UI or error | `[MobileBoot] origin: http://localhost:3000` |
| **Bundled (Production)** | `capacitor://` | Immediate UI (no check) | `[MobileBoot] Bundled mode (capacitor://) → showing UI` |

Happy coding! 🎉
