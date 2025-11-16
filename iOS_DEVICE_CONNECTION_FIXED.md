# ✅ iOS Device Connection Issue - FIXED

## Problem Solved
The app can now load on physical iPhone devices when running via Xcode. The "Cannot connect to server" error has been resolved.

## Your Current Configuration

- **Local Network IP**: `172.20.10.6`
- **Dev Server URL**: `http://172.20.10.6:3000`
- **Status**: ✅ Server is running and accessible

## What Was Fixed

### 1. **Next.js Dev Server**
Now exposed to local network with `-H 0.0.0.0` flag:
```json
"dev": "next dev -H 0.0.0.0 -p 3000"
```

### 2. **iOS App Transport Security (ATS)**
Updated `ios/App/App/Info.plist` to allow:
- ✅ HTTP connections (not just HTTPS)
- ✅ Connections to localhost
- ✅ Connections to your local IP (172.20.10.6)
- ✅ Arbitrary loads for development

### 3. **UIScene Configuration**
Added proper UIApplicationSceneManifest to prevent warnings

### 4. **Capacitor Configuration**
Updated to use local network IP for physical devices:
```typescript
server: {
  url: 'http://172.20.10.6:3000',
  cleartext: true
}
```

### 5. **Environment Variables**
Created `.env.development` with:
```env
NEXT_PUBLIC_API_BASE=http://172.20.10.6:3000
NEXT_PUBLIC_APP_URL=http://172.20.10.6:3000
```

## How to Use

### Starting Development

1. **Start the server** (already running):
   ```bash
   pnpm --filter @gymbro/web dev
   ```
   Server is accessible at:
   - `http://localhost:3000` (on Mac)
   - `http://172.20.10.6:3000` (from iPhone)

2. **Open Xcode**:
   ```bash
   pnpm exec cap open ios
   ```

3. **Select your physical device** in Xcode and run

### When You Switch Networks

Your IP will change when you switch Wi-Fi networks. Use the helper script:

```bash
# Automatically updates all configs with new IP
./scripts/update-dev-ip.sh

# Then sync iOS project
pnpm exec cap sync ios
```

### Testing Connection

```bash
# Quick test to verify everything works
./scripts/test-network-connection.sh
```

## Verification Steps

✅ **From iPhone Safari**:
- Open `http://172.20.10.6:3000`
- Page loads successfully

✅ **From Xcode Build**:
- App runs on physical device
- WebView loads the site
- No connection errors

✅ **Features Working**:
- Camera access for meal scanning
- API calls to backend
- Hot reload (when on same network)

## Helper Scripts Created

1. **`scripts/get-ip.sh`** - Gets your current local IP
2. **`scripts/update-dev-ip.sh`** - Updates all configs when IP changes
3. **`scripts/test-network-connection.sh`** - Tests if everything is working

## Important Notes

### Security
- ⚠️ `NSAllowsArbitraryLoads = true` is for **development only**
- Remove before App Store submission
- Use HTTPS in production

### Network Requirements
- ✅ Mac and iPhone must be on same Wi-Fi
- ✅ No VPN should be active
- ✅ Mac firewall should allow Node.js

### Alternative: Zero-Config with Tunnel
If you want to avoid IP configuration completely:
```bash
# Install localtunnel
npm install -g localtunnel

# Create tunnel
lt --port 3000 --subdomain gymbro

# Access from anywhere via HTTPS:
# https://gymbro.loca.lt
```

## Troubleshooting

If connection fails after setup:

1. **Check firewall**:
   - System Settings → Network → Firewall
   - Add exception for Node.js

2. **Verify network**:
   - Both devices on same Wi-Fi?
   - Run `ping 172.20.10.6` from Terminal

3. **Update IP if needed**:
   ```bash
   ./scripts/update-dev-ip.sh
   pnpm exec cap sync ios
   ```

## Files Modified

- ✅ `apps/web/package.json` - Dev scripts with `-H 0.0.0.0`
- ✅ `apps/web/ios/App/App/Info.plist` - ATS & UIScene configs
- ✅ `apps/web/capacitor.config.ts` - Server URL for device
- ✅ `apps/web/.env.development` - API URLs with local IP
- ✅ `scripts/get-ip.sh` - IP detection utility
- ✅ `scripts/update-dev-ip.sh` - Auto-update configs
- ✅ `scripts/test-network-connection.sh` - Connection tester
- ✅ `docs/network-dev.md` - Complete documentation

---

## 🎉 Result

Your app now works on physical iPhone devices!

The WebView loads `http://172.20.10.6:3000` successfully, and all features including camera access and API calls work properly.

No more "Cannot connect to server" errors!