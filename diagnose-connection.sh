#!/bin/bash

echo "🔍 Diagnosing iOS Connection Issues"
echo "===================================="
echo ""

# Get current IP
IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
echo "📱 Your current IP: $IP"
echo ""

# Check server
echo "🖥️  Server Status:"
if lsof -i :3000 | grep -q LISTEN; then
  echo "✅ Server is running on port 3000"

  # Test localhost
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo "✅ Localhost access works (http://localhost:3000)"
  else
    echo "❌ Localhost access failed"
  fi

  # Test network IP
  if curl -s -o /dev/null -w "%{http_code}" http://$IP:3000 | grep -q "200"; then
    echo "✅ Network access works (http://$IP:3000)"
  else
    echo "❌ Network access failed - CHECK FIREWALL"
  fi
else
  echo "❌ Server is NOT running"
  echo "   Run: pnpm --filter @gymbro/web dev"
fi

echo ""
echo "📄 Capacitor Config:"
CAPACITOR_URL=$(cat apps/web/ios/App/App/capacitor.config.json 2>/dev/null | grep '"url"' | head -1 | sed 's/.*"url": "\(.*\)".*/\1/')
if [ ! -z "$CAPACITOR_URL" ]; then
  echo "   Configured URL: $CAPACITOR_URL"

  # Check if it matches current IP
  if [[ "$CAPACITOR_URL" == *"$IP"* ]]; then
    echo "   ✅ URL matches current IP"
  else
    echo "   ⚠️  URL doesn't match current IP ($IP)"
    echo "   Run: ./scripts/update-dev-ip.sh"
  fi
else
  echo "   ❌ Could not read capacitor config"
fi

echo ""
echo "🔥 Firewall Check:"
echo "   To check firewall status:"
echo "   System Settings → Network → Firewall"
echo ""
echo "   If ON, try:"
echo "   1. Turn OFF temporarily"
echo "   2. Test from iPhone Safari: http://$IP:3000"
echo "   3. If works, add Node.js exception"

echo ""
echo "📱 Test from iPhone:"
echo "   1. Open Safari on iPhone"
echo "   2. Go to: http://$IP:3000"
echo "   3. Should see GymBro site"
echo ""
echo "   If Safari loads but app doesn't:"
echo "   → Rebuild in Xcode"
echo ""
echo "   If Safari doesn't load:"
echo "   → Network/firewall issue"

echo ""
echo "🔧 Quick Fixes:"
echo "   1. Disable Mac firewall temporarily"
echo "   2. Check both devices on same WiFi"
echo "   3. Disable any VPN"
echo "   4. Try: pnpm exec cap sync ios"