# GymBro Development Guide

This guide covers local development workflows for the GymBro app.

## 🧪 Running on iOS Simulator

The iOS Simulator provides the fastest development experience - no USB cable, no device pairing, no iproxy tunnel needed.

### Quick Start

**1. Start your Next.js dev server:**
```bash
pnpm -C apps/web dev
```

This starts the dev server at `http://localhost:3000`.

**2. In a new terminal, sync and open Xcode:**
```bash
pnpm ios:run-sim
```

This will:
- Sync Capacitor with `CAP_DEV=1 CAP_SIM=1`
- Configure the app to load `http://localhost:3000`
- Open the iOS project in Xcode

**3. In Xcode:**
- Select an iOS Simulator (e.g., iPhone 15 Pro)
- Press ▶️ Run

The app will launch in the simulator and load your local dev server instantly.

### How It Works

The iOS Simulator can access `localhost` on your Mac directly:
- No USB cable required
- No iproxy tunnel needed
- Direct connection: Simulator → Mac's `localhost:3000`
- Hot reload works perfectly

### Environment Variables

- `CAP_DEV=1` - Enables development mode
- `CAP_SIM=1` - Indicates simulator build (for logging)

### Troubleshooting

**Black screen or loading error:**
1. Make sure dev server is running: `pnpm -C apps/web dev`
2. Check the Xcode console for the log message:
   ```
   🧪 Capacitor Dev URL: http://localhost:3000 (iOS Simulator)
   ```
3. If the dev server isn't reachable, the MobileBoot overlay will show with instructions

**Xcode build errors:**
1. Clean build folder: `Product → Clean Build Folder`
2. Re-sync Capacitor: `pnpm ios:run-sim`
3. Restart Xcode

**Simulator not loading:**
1. Check that port 3000 isn't blocked by firewall
2. Try a different simulator (iPhone 15 vs iPhone 14)
3. Reset simulator: `Device → Erase All Content and Settings`

## 📱 Running on Physical iPhone (USB)

For testing on a real device over USB, see [README_DEV_USB.md](README_DEV_USB.md).

### Quick Start (USB Device)

**1. One-time setup:**
```bash
pnpm bootstrap:ios-usb
```

**2. Start dev server + USB tunnel:**
```bash
pnpm ios:usb
```

**3. Sync and open Xcode:**
```bash
pnpm ios:run-usb
```

**4. In Xcode:**
- Select your iPhone (🔌 icon)
- Press ▶️ Run

## 🔍 Diagnostics

### Check Simulator Setup
```bash
# Verify dev server is running
curl http://localhost:3000/api/health

# Check available simulators
xcrun simctl list devices
```

### Check USB Device Setup
```bash
# Quick check
pnpm doctor:usb

# Full diagnostic
pnpm doctor:ios
```

## 📊 Available Commands

### Development
| Command | Description |
|---------|-------------|
| `pnpm ios:run-sim` | Sync + open Xcode for Simulator |
| `pnpm ios:run-usb` | Sync + open Xcode for USB device |
| `pnpm ios:sync` | Sync Capacitor (respects CAP_DEV) |
| `pnpm ios:open` | Open Xcode project |

### Diagnostics
| Command | Description |
|---------|-------------|
| `pnpm doctor:usb` | Check USB environment |
| `pnpm doctor:ios` | Full diagnostic report |
| `pnpm doctor:whereami` | Show repo root |

### Setup
| Command | Description |
|---------|-------------|
| `pnpm bootstrap:ios-usb` | Install USB dev tools (iproxy, etc.) |

## 🎯 Development Modes

### Simulator Mode (Recommended for Daily Dev)
```bash
# Terminal 1
pnpm -C apps/web dev

# Terminal 2
pnpm ios:run-sim
```
- ✅ No cables
- ✅ No tunneling
- ✅ Fastest iteration
- ✅ Hot reload

### USB Device Mode (For Device-Specific Testing)
```bash
# Terminal 1
pnpm ios:usb

# Terminal 2
pnpm ios:run-usb
```
- ✅ Real device testing
- ✅ Camera, sensors, etc.
- ✅ True performance
- ⚠️ Requires cable + pairing

### Production Mode
```bash
pnpm -C apps/web build
pnpm ios:sync
# Open Xcode and archive
```
- ✅ Bundled assets
- ✅ No dev server
- ✅ App Store ready

## 🏗️ Architecture

### Development Setup
```
Simulator Dev:
┌─────────────┐
│ iOS Sim     │
│ localhost   │ ──────► http://localhost:3000
└─────────────┘         (Direct Mac access)

USB Device Dev:
┌─────────────┐         ┌─────────────┐
│ iPhone      │         │ Mac         │
│ localhost   │ ◄──USB──► iproxy      │ ──► http://localhost:3000
└─────────────┘         └─────────────┘
                        (USB tunnel)
```

### Capacitor Configuration
- `CAP_DEV=1` → Loads `http://localhost:3000`
- `CAP_SIM=1` → Indicates simulator (for logging)
- No env vars → Production (bundled assets)

### Failsafe Overlay
If the dev server is unreachable, the app shows a helpful overlay instead of a black screen:
- Detects connectivity issues
- Shows clear instructions
- Provides retry button

## 🔧 Advanced

### Using a Different Port
If port 3000 is in use:

1. Start dev server on different port:
   ```bash
   pnpm -C apps/web dev -- --port 5173
   ```

2. Update [capacitor.config.ts](apps/web/capacitor.config.ts):
   ```typescript
   url: 'http://localhost:5173',
   ```

3. Re-sync:
   ```bash
   pnpm ios:sync
   ```

### Debugging in Safari Web Inspector
1. On Mac: Safari → Settings → Advanced → Show Develop menu
2. Run app in Simulator
3. Safari → Develop → Simulator → GymBro
4. Web Inspector opens with console, network, etc.

### Clean Reset
```bash
# Clean Capacitor
rm -rf apps/web/ios/App/App/public
rm -rf apps/web/ios/App/App/capacitor.config.json

# Clean Xcode
pnpm -C apps/web run ios:clean

# Re-sync
pnpm ios:run-sim
```

## 📚 More Resources

- [USB Development Guide](README_DEV_USB.md) - Detailed USB setup
- [Capacitor Docs](https://capacitorjs.com/docs/ios) - Official iOS guide
- [Next.js Docs](https://nextjs.org/docs) - Next.js documentation

## 💡 Tips

**Fastest Iteration:**
1. Use Simulator for UI/logic development
2. Keep dev server running
3. Make changes → Auto reload
4. Test on device only when needed

**Common Workflow:**
1. `pnpm -C apps/web dev` (keep running)
2. `pnpm ios:run-sim` (once)
3. Edit code → Hot reload in simulator
4. Test specific features on real device as needed

**Performance:**
- Simulator: ~1s reload
- USB Device: ~2-3s reload
- Both support hot reload

Happy coding! 🎉
