# Mobile Build Guide - FitJourney

## 🔍 Understanding the Architecture

**FitJourney is a server-dependent Next.js app that requires a running Next.js server for mobile builds.**

### Why the App Cannot Run From Bundled Assets

The app uses server-side features that require a Node.js backend:
- **Middleware** (`middleware.ts`) - Handles auth, redirects, session management
- **API Routes** (`/api/*`) - AI chat, nutrition tracking, workout logging, etc.
- **Server Components** - Dynamic data fetching and rendering
- **Server Actions** - Form submissions and data mutations

This means **Capacitor mobile apps must connect to a live Next.js server** - either:
1. **Development:** Your local dev server (`localhost:3000`)
2. **Production:** A deployed Next.js instance (Vercel, Railway, etc.)

---

## 📱 Development Workflow

### iOS Simulator (Recommended for Dev)

**Prerequisites:**
- Next.js dev server running on port 3000

**Steps:**

1. **Terminal 1 - Start Next.js dev server:**
   ```bash
   pnpm dev:web
   # Or from monorepo root:
   pnpm -C apps/web dev
   ```

2. **Terminal 2 - Sync and open iOS simulator:**
   ```bash
   # From monorepo root:
   pnpm ios:run-sim
   ```

   This will:
   - Set `CAP_DEV=1` and `CAP_SIM=1`
   - Configure Capacitor to connect to `http://localhost:3000`
   - Sync assets and open Xcode

3. **In Xcode:**
   - Select an iOS Simulator (e.g., iPhone 15 Pro)
   - Press ▶️ Run

**How it works:**
- iOS Simulator can access Mac's `localhost` directly
- No tunneling or network IP needed
- Hot reload works perfectly

---

### iOS Physical Device (USB)

**Prerequisites:**
- `iproxy` installed (`brew install libimobiledevice`)
- iPhone connected via USB
- Trust relationship established

**Steps:**

1. **Terminal 1 - Start dev server + USB tunnel:**
   ```bash
   # From monorepo root:
   pnpm ios:usb
   ```

   This starts both:
   - Next.js dev server on `localhost:3000`
   - USB tunnel: `iproxy 3000 3000`

2. **Terminal 2 - Sync and open Xcode:**
   ```bash
   # From monorepo root:
   pnpm ios:run-usb
   ```

3. **In Xcode:**
   - Select your iPhone (🔌 icon)
   - Press ▶️ Run

**How it works:**
- `iproxy` tunnels iPhone's port 3000 to Mac's port 3000 over USB
- iPhone accesses `localhost:3000` which routes through USB tunnel
- More stable than WiFi, no network IP needed

---

### Android Emulator/Device

**Prerequisites:**
- Android Studio installed
- Android emulator created OR physical device connected
- Next.js dev server running

**Steps:**

1. **Terminal 1 - Start Next.js dev server:**
   ```bash
   pnpm dev:web
   ```

2. **Terminal 2 - Sync and open Android Studio:**
   ```bash
   # From monorepo root:
   pnpm android:run
   ```

   Or manually:
   ```bash
   cd apps/web
   CAP_DEV=1 npx cap sync android
   npx cap open android
   ```

3. **In Android Studio:**
   - Select your emulator/device
   - Press ▶️ Run

**Important:**
- For **emulator:** Uses `http://172.20.10.6:3000` (your local network IP)
- For **physical device:** Update `DEV_SERVER_URL` environment variable to your machine's IP
- Make sure your dev server is accessible on `0.0.0.0` (use `-H 0.0.0.0` flag)

**Update local IP if needed:**
```bash
# Find your local IP:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Set it before syncing:
DEV_SERVER_URL=http://YOUR_IP:3000 CAP_DEV=1 npx cap sync android
```

---

## 🚀 Production Builds (App Store / TestFlight / Play Store)

### Step 1: Deploy Next.js to Production

You **must** deploy your Next.js app to a production server first.

**Option A: Vercel (Recommended)**

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy from web app directory
cd apps/web
vercel --prod
```

After deployment, Vercel will give you a URL like:
```
https://fitjourney.vercel.app
```

**Option B: Other Platforms**
- Railway: `railway up`
- Render: Connect GitHub repo
- AWS / DigitalOcean: Follow platform-specific Next.js deployment guides

### Step 2: Set Production URL

```bash
# Set the production URL environment variable
export MOBILE_PRODUCTION_URL=https://your-app.vercel.app
```

**Make it permanent (add to `.zshrc` or `.bashrc`):**
```bash
echo 'export MOBILE_PRODUCTION_URL=https://your-app.vercel.app' >> ~/.zshrc
source ~/.zshrc
```

### Step 3: Sync to Mobile Platforms

```bash
# Sync iOS (from monorepo root or apps/web)
npx cap sync ios

# Sync Android
npx cap sync android
```

You should see:
```
🚀 Capacitor Production Mode
   Server: https://your-app.vercel.app
```

### Step 4: Build for Distribution

**iOS (TestFlight / App Store):**

1. Open Xcode:
   ```bash
   npx cap open ios
   ```

2. In Xcode:
   - Select "Any iOS Device" as target
   - Product → Archive
   - Distribute App → App Store Connect
   - Upload to TestFlight

**Android (Play Store):**

1. Open Android Studio:
   ```bash
   npx cap open android
   ```

2. In Android Studio:
   - Build → Generate Signed Bundle / APK
   - Select "Android App Bundle"
   - Sign with your keystore
   - Upload `.aab` file to Google Play Console

---

## 🔧 Troubleshooting

### "Loading GymBro..." Infinite Loop

**Cause:** Capacitor is trying to use bundled assets but they don't exist.

**Solutions:**

1. **For Development:**
   ```bash
   # Make sure you're using dev mode
   CAP_DEV=1 CAP_SIM=1 npx cap sync ios  # iOS Simulator
   CAP_DEV=1 npx cap sync ios            # iOS Device
   CAP_DEV=1 npx cap sync android        # Android
   ```

2. **For Production:**
   ```bash
   # Make sure production URL is set
   echo $MOBILE_PRODUCTION_URL  # Should print your URL

   # If empty, set it:
   export MOBILE_PRODUCTION_URL=https://your-app.vercel.app

   # Then sync:
   npx cap sync ios
   npx cap sync android
   ```

### Production Sync Error

```
❌ CAPACITOR CONFIGURATION ERROR:
   Production mobile builds require a deployed Next.js server.
```

**Solution:**
1. Deploy to Vercel/production (see Step 1 above)
2. Set `MOBILE_PRODUCTION_URL` (see Step 2 above)
3. Re-run sync

### Dev Mode: Blank Screen or Connection Error

**For iOS Simulator:**
- Make sure dev server is running: `curl http://localhost:3000/api/health`
- Check Xcode console for connection errors

**For iOS USB Device:**
- Verify `iproxy` is running: `lsof -i :3000`
- Check iPhone trust relationship
- Restart iproxy: `killall iproxy && iproxy 3000 3000`

**For Android:**
- Update local IP: `DEV_SERVER_URL=http://YOUR_IP:3000 CAP_DEV=1 npx cap sync android`
- Make sure dev server binds to `0.0.0.0`: `pnpm dev:fast`
- Check firewall isn't blocking port 3000

### Production Build Not Loading After Deployment

**Check:**
1. Production URL is accessible: `curl https://your-app.vercel.app/api/health`
2. Environment variables are set in Vercel/deployment platform
3. App was synced AFTER deployment: `npx cap sync ios android`

---

## 📋 Quick Reference

### Development Commands

```bash
# iOS Simulator
pnpm ios:run-sim                  # Sync + open Xcode

# iOS USB Device
pnpm ios:usb                      # Start dev server + iproxy
pnpm ios:run-usb                  # Sync + open Xcode

# Android
pnpm android:run                  # Sync + open Android Studio

# Manual sync
CAP_DEV=1 CAP_SIM=1 npx cap sync ios      # iOS Simulator
CAP_DEV=1 npx cap sync ios                # iOS Device
CAP_DEV=1 npx cap sync android            # Android
```

### Production Commands

```bash
# Deploy to Vercel
cd apps/web && vercel --prod

# Set production URL
export MOBILE_PRODUCTION_URL=https://your-app.vercel.app

# Sync to platforms
npx cap sync ios
npx cap sync android

# Open for archiving
npx cap open ios        # For TestFlight/App Store
npx cap open android    # For Play Store
```

### Cleanup Commands

```bash
# iOS clean
pnpm -C apps/web ios:clean
# Or: xcrun simctl shutdown all && rm -rf ios/App/build

# Android clean
pnpm -C apps/web android:clean
# Or: rm -rf android/app/build android/.gradle

# Node modules clean
pnpm kill:node
rm -rf node_modules apps/web/node_modules
pnpm install
```

---

## 🎯 Summary

**The infinite loading screen was caused by:**
1. ✅ Your app requires a Next.js server (middleware, API routes, server components)
2. ✅ The `public` folder only contains a loading screen, not the full app
3. ✅ Production builds were trying to use bundled assets that don't exist
4. ✅ Development builds work but require `CAP_DEV=1` to connect to local server

**The fix:**
1. ✅ Updated `capacitor.config.ts` to require a production server URL
2. ✅ Added validation to prevent broken builds
3. ✅ Separated dev mode (localhost) from production mode (deployed URL)
4. ✅ Added helper scripts for iOS and Android development

**Next steps:**
1. For development: Use `pnpm ios:run-sim` or `pnpm android:run`
2. For production: Deploy to Vercel, set `MOBILE_PRODUCTION_URL`, then sync
