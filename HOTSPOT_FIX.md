# 🔧 iPhone Hotspot Development Fix

## The Problem
You're using your iPhone as a hotspot for your Mac, then trying to run the app on the same iPhone. This creates a network routing issue where the iPhone can't access servers running on the Mac connected to it.

## Solution 1: Use localhost with USB (Recommended)

### Step 1: Update Capacitor Config for localhost
Update `capacitor.config.ts`:

```typescript
function getDevUrl(): string {
  // For USB debugging, always use localhost
  return 'http://localhost:3000';
}
```

### Step 2: Connect iPhone via USB
1. Connect iPhone to Mac with USB cable
2. Trust the computer when prompted
3. In Xcode, select your iPhone (it should show as connected via USB)

### Step 3: Enable Web Inspector
On iPhone:
- Settings → Safari → Advanced → Web Inspector = ON

### Step 4: Run the app
```bash
# Restart server for localhost
pnpm --filter @gymbro/web dev:local

# Sync and run
pnpm exec cap sync ios
pnpm exec cap open ios
```

Then build and run from Xcode.

## Solution 2: Use Network Tunnel (Works Anywhere)

### Step 1: Install localtunnel
```bash
npm install -g localtunnel
```

### Step 2: Start tunnel
```bash
# In one terminal, start Next.js
pnpm --filter @gymbro/web dev:local

# In another terminal, start tunnel
lt --port 3000 --subdomain gymbro
```

You'll get a URL like: `https://gymbro.loca.lt`

### Step 3: Update Capacitor Config
```typescript
function getDevUrl(): string {
  return 'https://gymbro.loca.lt';
}
```

### Step 4: Sync and run
```bash
pnpm exec cap sync ios
# Then build in Xcode
```

## Solution 3: Use Different Network

Connect both Mac and iPhone to a regular Wi-Fi network (not hotspot):
1. Coffee shop Wi-Fi
2. Home router
3. Office network

Then your current setup with `172.20.10.6` would work.

## Why This Happens

When iPhone acts as a hotspot:
- iPhone IP: 172.20.10.1 (gateway)
- Mac IP: 172.20.10.6 (client)

The iPhone's network stack isolates hotspot clients from accessing services on the iPhone itself, and vice versa. The iPhone can't route traffic back to the Mac's dev server.

## Quick Test

To verify this is the issue, try:
1. Open Safari on your iPhone
2. Go to `http://172.20.10.6:3000`
3. If it doesn't load, this confirms the hotspot routing issue

## Recommended Setup for Hotspot Development

Use **Solution 1** (localhost + USB) because:
- ✅ No network dependency
- ✅ Faster performance (USB is faster than Wi-Fi)
- ✅ Works offline
- ✅ No tunnel service needed
- ✅ Can debug with Safari Web Inspector

Just remember to change back to network IP when on regular Wi-Fi!