#!/bin/bash

# Update development IP addresses across all configuration files
# Run this when switching networks

# Get current IP
IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)

if [ -z "$IP" ]; then
  echo "❌ Could not detect IP address. Are you connected to a network?"
  exit 1
fi

echo "🌍 Detected IP: $IP"

# Update capacitor.config.ts
if [ -f "apps/web/capacitor.config.ts" ]; then
  sed -i '' "s/return '[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*';/return '$IP';/" apps/web/capacitor.config.ts
  echo "✅ Updated capacitor.config.ts"
fi

# Update .env.development
if [ -f "apps/web/.env.development" ]; then
  sed -i '' "s|NEXT_PUBLIC_API_BASE=http://[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*:3000|NEXT_PUBLIC_API_BASE=http://$IP:3000|g" apps/web/.env.development
  sed -i '' "s|NEXT_PUBLIC_APP_URL=http://[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*:3000|NEXT_PUBLIC_APP_URL=http://$IP:3000|g" apps/web/.env.development
  echo "✅ Updated .env.development"
fi

echo ""
echo "📱 Configuration updated for IP: $IP"
echo ""
echo "Next steps:"
echo "1. Run: pnpm exec cap sync ios"
echo "2. Start dev server: pnpm --filter @gymbro/web dev"
echo "3. Access from device: http://$IP:3000"