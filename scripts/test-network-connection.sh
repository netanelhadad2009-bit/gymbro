#!/bin/bash

# Test network connection for mobile development

echo "🔍 Testing Network Connection Setup"
echo "===================================="

# Get IP
IP=$(./scripts/get-ip.sh)
echo "📱 Local IP: $IP"

# Check if server is running
if lsof -i :3000 | grep -q LISTEN; then
  echo "✅ Server is running on port 3000"
else
  echo "❌ Server is NOT running on port 3000"
  echo "   Run: pnpm --filter @gymbro/web dev"
fi

# Test local connection
echo ""
echo "🧪 Testing connections:"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|300\|301\|302"; then
  echo "✅ http://localhost:3000 - OK"
else
  echo "❌ http://localhost:3000 - FAILED"
fi

if curl -s -o /dev/null -w "%{http_code}" http://$IP:3000 | grep -q "200\|300\|301\|302"; then
  echo "✅ http://$IP:3000 - OK"
else
  echo "❌ http://$IP:3000 - FAILED"
fi

echo ""
echo "📱 To test on iPhone:"
echo "1. Make sure iPhone is on same Wi-Fi"
echo "2. Open Safari and go to: http://$IP:3000"
echo "3. Or build in Xcode: pnpm exec cap open ios"
echo ""
echo "🔧 If connection fails:"
echo "• Check Mac Firewall settings"
echo "• Verify both devices on same network"
echo "• Run: ./scripts/update-dev-ip.sh"