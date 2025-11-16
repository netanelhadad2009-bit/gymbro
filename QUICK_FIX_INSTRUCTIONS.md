# 📱 Quick Fix - Connect iPhone via USB

## The Issue
You're using iPhone Hotspot, which prevents the iPhone from accessing your Mac's dev server over the network.

## The Solution: USB Connection

### Step 1: Connect USB Cable
1. **Connect your iPhone to Mac with USB cable**
2. Trust the computer when prompted on iPhone
3. Make sure iPhone appears in Xcode device list

### Step 2: Current Configuration ✅
- Server is running on `http://localhost:3000`
- Capacitor is configured to use `localhost`
- Everything is ready!

### Step 3: Build and Run
1. Open Xcode:
   ```bash
   pnpm exec cap open ios
   ```

2. In Xcode:
   - Select your iPhone from device list (should show cable icon 🔌)
   - Click the Play button ▶️ to build and run

### Step 4: Success!
The app will now load properly because:
- iPhone accesses `localhost` through the USB connection
- No network routing issues
- Faster than Wi-Fi!

## Verification

The app should now show your GymBro interface instead of a black screen.

## Debugging (Optional)

If you want to debug:
1. On iPhone: Settings → Safari → Advanced → Web Inspector = ON
2. On Mac: Safari → Develop → [Your iPhone] → [App Name]
3. You'll see the console and can debug!

## Important Notes

✅ **Current Status:**
- Server: Running on localhost ✅
- Config: Set to localhost ✅
- iOS Project: Synced ✅

⚠️ **When on Regular Wi-Fi (Not Hotspot):**
If you switch to regular Wi-Fi later, update `capacitor.config.ts`:
```typescript
function getDevUrl(): string {
  // Comment this for USB:
  // return 'http://localhost:3000';

  // Uncomment for Wi-Fi:
  const localIP = process.env.LAN_IP || getLocalIP();
  return `http://${localIP}:3000`;
}
```

Then run `pnpm exec cap sync ios`

---

**Your app should work now!** Just make sure your iPhone is connected via USB cable and build from Xcode.