#!/bin/bash

# Quick fix for "Loading GymBro" stuck screen
#
# PERMANENT FIX APPLIED (2025-01-29):
# - Modified apps/web/next.config.js to disable webpack cache in dev mode
# - This prevents cache corruption after rapid code changes
# - You should rarely need to run this script now!
#
# If you still encounter loading issues, this script will help:

echo "🔧 Fixing loading screen issue..."
echo ""

# Kill all node processes
echo "1️⃣  Killing all node processes..."
killall -9 node 2>/dev/null || true
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
sleep 1

# Clear cache directories
echo "2️⃣  Clearing Next.js cache..."
rm -rf apps/web/.next
rm -rf apps/web/.turbo

# Start dev server
echo "3️⃣  Starting fresh dev server..."
pnpm --filter @gymbro/web dev --port 3000 --hostname 127.0.0.1 > /tmp/gymbro-dev.log 2>&1 &

# Wait for server to start
echo "4️⃣  Waiting for server to start..."
sleep 3

# Check if server is responding
echo "5️⃣  Checking server health..."
RESPONSE=$(curl -s http://127.0.0.1:3000 2>/dev/null | head -1)

if [ -n "$RESPONSE" ]; then
  echo "✅ Server is responding!"
  echo ""
  echo "🎉 Fixed! Refresh your app now."
else
  echo "⚠️  Server might still be compiling..."
  echo "   Wait 5 more seconds and check: http://127.0.0.1:3000"
fi

echo ""
echo "📝 Logs: tail -f /tmp/gymbro-dev.log"
