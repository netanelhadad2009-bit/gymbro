#!/bin/bash

# Run iOS app in development mode (connects to dev server)
# This sets CAP_DEV=1 so the app uses http://127.0.0.1:3000 instead of bundled assets

echo "🚀 Starting iOS app in development mode..."
echo "📱 The app will connect to http://127.0.0.1:3000"
echo ""
echo "⚠️  Make sure the dev server is running on port 3000:"
echo "   pnpm --filter @gymbro/web dev"
echo ""

cd "$(dirname "$0")/.."

# Set environment variable and open Xcode
export CAP_DEV=1

# Sync Capacitor first
echo "📦 Syncing Capacitor..."
pnpm exec cap sync ios

echo ""
echo "✅ Opening Xcode..."
echo "   Build and run the app (Cmd+R)"
echo ""

open ios/App/App.xcworkspace
