# iOS Dev Mode Quick Start Guide

This guide shows you how to run the iOS app in **live dev mode**, where it connects to your Next.js dev server at `http://localhost:3000` for instant hot reload.

## The Fastest Way (Recommended)

### Step 1: Start the Dev Server
In Terminal 1, run:
```bash
pnpm -C apps/web dev --port 3000 --hostname localhost
```

Keep this running. You should see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
✓ Ready in 2.3s
```

### Step 2: Launch iOS Simulator in Dev Mode
In Terminal 2, run:
```bash
pnpm ios:run-sim
```

This will:
- ✅ Set `CAP_DEV=1` and `CAP_SIM=1` environment variables
- ✅ Sync Capacitor with dev server URL (`http://localhost:3000`)
- ✅ Open Xcode with the iOS project

### Step 3: Run in Xcode
1. Select an iOS Simulator (e.g., iPhone 15 Pro)
2. Press ▶️ **Run**
3. Wait for the app to launch

### Step 4: Verify Dev Mode is Working

**Expected Xcode Console Output**:
```
🔧 Capacitor dev URL: http://localhost:3000
[MobileBoot] origin: http://localhost:3000
[MobileBoot] /api/health status: 200
[MobileBoot] health json: { ok: true, ts: 1234567890 }
```

**Expected Behavior**:
- ✅ App loads immediately (no white/blank screen)
- ✅ Shows your live Next.js UI
- ✅ Hot reload works when you edit code
- ✅ URL in app is `http://localhost:3000` (NOT `capacitor://`)

---

## Alternative: Dev Reset (If You Were Stuck in Bundled Mode)

If you were previously in bundled mode (seeing `capacitor://localhost`) and need to switch back to dev mode:

```bash
pnpm ios:dev-reset
```

This command:
- Forces a fresh sync with `CAP_DEV=1`
- Regenerates the Capacitor config
- Opens Xcode ready for dev mode

Then follow Step 3 above (Run in Xcode).

---

## Troubleshooting

### Problem: White/Blank Screen

**Symptoms**: App shows nothing, just a white or black screen.

**Solution**:
1. Check that the dev server is running:
   ```bash
   curl http://localhost:3000/api/health
   # Should return: {"ok":true,"ts":1234567890}
   ```

2. If not running, start it:
   ```bash
   pnpm -C apps/web dev --port 3000 --hostname localhost
   ```

3. Re-run the app in Xcode

### Problem: Error Overlay Appears

**Symptoms**: App shows "Cannot reach dev server" overlay with Retry button.

**This is expected if the dev server isn't running!**

**Solution**:
1. Start the dev server (see above)
2. Click **Retry** in the app
3. Or restart the app in Xcode

### Problem: App Shows `capacitor://localhost` URL

**Symptoms**: Xcode console shows "Using bundled web assets" instead of dev URL.

**Cause**: `CAP_DEV=1` wasn't set during sync.

**Solution**:
```bash
pnpm ios:dev-reset
```

Then verify the generated config:
```bash
cat apps/web/ios/App/App/capacitor.config.json
```

Should contain:
```json
{
  "server": {
    "url": "http://localhost:3000",
    "cleartext": true
  }
}
```

### Problem: Port 3000 Already in Use

**Symptoms**: Dev server fails to start with "EADDRINUSE" error.

**Solution**:
```bash
# Find what's using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use a different port (update capacitor.config.ts accordingly)
pnpm -C apps/web dev --port 5173 --hostname localhost
```

---

## Understanding the Workflow

### What `pnpm ios:run-sim` Does

1. **Sets environment variables**:
   - `CAP_DEV=1` → Tells Capacitor to use dev server URL
   - `CAP_SIM=1` → Indicates this is a simulator build (for logging)

2. **Runs `cap sync ios`**:
   - Reads `capacitor.config.ts` with `CAP_DEV=1`
   - Generates `capacitor.config.json` with `server.url: "http://localhost:3000"`
   - Copies web assets
   - Updates iOS native dependencies

3. **Opens Xcode**:
   - Launches Xcode with the iOS project
   - Ready for you to press Run

### How the App Connects to Dev Server

```
┌─────────────────┐
│ iOS Simulator   │
│                 │
│   App loads     │
│   http://       │──────►  http://localhost:3000
│   localhost:    │         (Your Mac's dev server)
│   3000          │
└─────────────────┘
        ▲
        │
        │ Direct connection
        │ (Simulator can access Mac's localhost)
```

**For USB devices**, the flow is different (requires `iproxy` tunnel). See [README_DEV_USB.md](README_DEV_USB.md).

---

## Daily Development Workflow

### Once You're Set Up

**Morning/First time**:
1. Start dev server: `pnpm -C apps/web dev`
2. Run `pnpm ios:run-sim` (one time)
3. In Xcode: Press ▶️ Run

**During development**:
- Make code changes in your editor
- Save files
- App automatically hot reloads (no rebuild needed!)

**If you close Xcode**:
- Just reopen and press ▶️ Run
- No need to re-run `pnpm ios:run-sim` unless you change Capacitor config

**Next day**:
- Start dev server again: `pnpm -C apps/web dev`
- Open Xcode and press ▶️ Run
- (No sync needed if config hasn't changed)

---

## Key Files

| File | Purpose | Dev Mode Value |
|------|---------|----------------|
| [capacitor.config.ts](apps/web/capacitor.config.ts) | Source config with `CAP_DEV` logic | `server.url: "http://localhost:3000"` when `CAP_DEV=1` |
| [capacitor.config.json](apps/web/ios/App/App/capacitor.config.json) | Generated iOS config | Contains dev server URL after sync |
| [mobile-boot.tsx](apps/web/app/mobile-boot.tsx) | Connection guard | Checks `/api/health` before showing UI |
| [api/health/route.ts](apps/web/app/api/health/route.ts) | Health check endpoint | Returns `{ ok: true, ts: ... }` |

---

## Available Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `pnpm ios:run-sim` | **Main dev mode launcher** | Every time you start a new dev session |
| `pnpm ios:dev-reset` | Force re-sync + open Xcode | When stuck in bundled mode or config is wrong |
| `pnpm ios:sync` | Sync without env vars | When manually setting CAP_DEV in Xcode scheme |
| `pnpm ios:open` | Just open Xcode | When you only need to open Xcode |
| `pnpm -C apps/web dev` | Start Next.js dev server | Always run this before launching the app |

---

## Comparison: Dev Mode vs Bundled Mode

| Aspect | Dev Mode | Bundled Mode |
|--------|----------|--------------|
| **URL** | `http://localhost:3000` | `capacitor://localhost` |
| **Setup** | `CAP_DEV=1` + running dev server | Build + cap copy |
| **Speed** | Instant hot reload (~1s) | Must rebuild for changes |
| **Use Case** | Daily development | Production testing, App Store builds |
| **Requirements** | Dev server running | Built web assets in `ios/App/App/public` |
| **MobileBoot** | Health check (3.5s timeout) | Immediate (skips check) |

---

## Summary

✅ **You are now in dev mode!**

The iOS app should:
- Load from `http://localhost:3000` (NOT `capacitor://`)
- Show your live Next.js UI immediately
- Hot reload when you make code changes
- Show an error overlay (not a blank screen) if dev server isn't running

### Quick Reference

**Start dev mode**:
```bash
# Terminal 1
pnpm -C apps/web dev

# Terminal 2
pnpm ios:run-sim

# Xcode: Press Run
```

**Verify it's working**:
- Check Xcode console for: `🔧 Capacitor dev URL: http://localhost:3000`
- App loads immediately (no blank screen)
- Hot reload works

**If something goes wrong**:
```bash
pnpm ios:dev-reset
```

Happy coding! 🎉
