# Local Device Connection Guide

This guide helps you connect to the development server from physical iOS/Android devices.

## Current Configuration

- **Local IP**: `172.20.10.6`
- **Dev Server Port**: `3000`
- **Dev URL**: `http://172.20.10.6:3000`

## Quick Start

### 1. Start the Dev Server

```bash
# Automatically exposes to local network (0.0.0.0)
pnpm --filter @gymbro/web dev

# The server will be available at:
# - http://localhost:3000 (on your Mac)
# - http://172.20.10.6:3000 (from other devices)
```

### 2. Get Your Current IP

```bash
# Run this to get your current local IP
./scripts/get-ip.sh

# Output: 172.20.10.6 (or your current IP)
```

### 3. Update Configuration When Network Changes

When you switch networks (home → office, etc.), update these files:

1. **capacitor.config.ts**
   ```typescript
   function getLocalIP(): string {
     return '172.20.10.6'; // Update this
   }
   ```

2. **.env.development**
   ```env
   NEXT_PUBLIC_API_BASE=http://172.20.10.6:3000
   NEXT_PUBLIC_APP_URL=http://172.20.10.6:3000
   ```

3. **Info.plist** (if needed for specific IP)
   ```xml
   <key>172.20.10.6</key>
   <dict>
     <key>NSTemporaryExceptionAllowsInsecureHTTPLoads</key>
     <true/>
   </dict>
   ```

## Checklist for iOS Device Connection

✅ **Prerequisites**
- [ ] Mac and iPhone on same Wi-Fi network
- [ ] No VPN active on either device
- [ ] Mac Firewall allows Node.js connections

✅ **Server Setup**
- [ ] Dev server running with `-H 0.0.0.0`
- [ ] Port 3000 is not blocked
- [ ] Can access `http://172.20.10.6:3000` from Mac browser

✅ **iOS App Setup**
- [ ] Info.plist has NSAppTransportSecurity configured
- [ ] Capacitor config has correct IP
- [ ] Run `pnpm exec cap sync ios` after config changes

✅ **Testing**
- [ ] Open Safari on iPhone
- [ ] Navigate to `http://172.20.10.6:3000`
- [ ] Page should load without errors

## Troubleshooting

### Error: "Cannot connect to server" / NSURLErrorDomain -1004

**Solution 1**: Check network connectivity
```bash
# From Mac terminal
ping 172.20.10.6

# From iPhone (using Network Utility app)
# Try to ping your Mac's IP
```

**Solution 2**: Disable Mac Firewall temporarily
- System Settings → Network → Firewall → Off
- Test connection
- Re-enable firewall and add Node.js exception

**Solution 3**: Check if server is listening
```bash
# Should show node process on port 3000
lsof -i :3000
```

### Error: "The resource could not be loaded" (ATS)

**Solution**: Verify Info.plist has proper ATS exceptions
- NSAllowsArbitraryLoads = true (for dev only!)
- Specific domain exceptions for your IP

### Error: WebView shows blank page

**Solution**: Check Capacitor server URL
```typescript
// capacitor.config.ts
server: {
  url: 'http://172.20.10.6:3000', // Must match your IP
  cleartext: true
}
```

### Error: Hot reload not working

**Solution**: WebSocket needs same network access
- Ensure no proxy/firewall blocking WebSocket
- Check browser console for WS connection errors

## Network Configurations

### Home Network (Example)
```
IP: 192.168.1.100
Router: 192.168.1.1
Subnet: 255.255.255.0
```

### Mobile Hotspot (Example)
```
IP: 172.20.10.6
Gateway: 172.20.10.1
Subnet: 255.255.255.240
```

### Office Network (Example)
```
IP: 10.0.1.50
Gateway: 10.0.1.1
Subnet: 255.255.255.0
```

## Alternative: HTTPS Tunnel (Zero Config)

For a hassle-free setup, use localtunnel:

```bash
# Install globally
npm install -g localtunnel

# Run tunnel
lt --port 3000 --subdomain gymbro

# Access from anywhere:
# https://gymbro.loca.lt
```

Benefits:
- ✅ Works from any network
- ✅ No IP configuration
- ✅ HTTPS enabled
- ✅ No ATS issues

## Security Notes

⚠️ **Development Only Settings**
- NSAllowsArbitraryLoads should be `false` in production
- Remove specific IP exceptions before App Store submission
- Use HTTPS in production environments

## Quick Commands

```bash
# Get IP
./scripts/get-ip.sh

# Start dev server with network access
pnpm --filter @gymbro/web dev

# Sync iOS after config changes
pnpm exec cap sync ios

# Open Xcode
pnpm exec cap open ios

# Run on connected device
pnpm exec cap run ios --target=<DEVICE_ID>

# List available devices
xcrun simctl list devices
```

## Additional Resources

- [Capacitor iOS Configuration](https://capacitorjs.com/docs/ios/configuration)
- [iOS App Transport Security](https://developer.apple.com/documentation/security/preventing_insecure_network_connections)
- [Next.js Custom Server](https://nextjs.org/docs/pages/building-your-application/configuring/custom-server)

---

Last Updated: When network IP was 172.20.10.6
Remember to update IPs when switching networks!