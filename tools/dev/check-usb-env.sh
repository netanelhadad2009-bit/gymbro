#!/usr/bin/env bash
set -euo pipefail

red()   { printf "\033[31m%s\033[0m\n" "$*" >&2; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$*"; }

# Check for iproxy
if ! command -v iproxy >/dev/null 2>&1; then
  red "❌ iproxy not found."
  echo "Run: pnpm bootstrap:ios-usb"
  echo "On Apple Silicon ensure PATH includes /opt/homebrew/bin"
  exit 1
fi

# Check for idevice_id
if ! command -v idevice_id >/dev/null 2>&1; then
  red "❌ idevice_id (libimobiledevice) not found."
  echo "Run: pnpm bootstrap:ios-usb"
  exit 1
fi

# Check if usbmuxd service is running
if command -v brew >/dev/null 2>&1; then
  if ! brew services list | grep -q 'usbmuxd.*started'; then
    yellow "⚠️  usbmuxd service not running."
    echo "Starting service: brew services start usbmuxd"
    brew services start usbmuxd || true
    sleep 1
  fi
fi

# Check for connected devices
DEVICES="$(idevice_id -l 2>/dev/null || true)"
if [[ -z "$DEVICES" ]]; then
  red "❌ No iOS device detected."
  echo ""
  echo "Troubleshooting steps:"
  echo "1. Connect iPhone via USB cable (use original Apple cable)"
  echo "2. Unlock your iPhone"
  echo "3. Tap 'Trust This Computer' when prompted"
  echo "4. Run: idevicepair pair"
  echo "5. Re-run: pnpm doctor:usb"
  echo ""
  echo "If still not working:"
  echo "  - Try a different USB port"
  echo "  - Restart usbmuxd: brew services restart usbmuxd"
  echo "  - Check cable connection"
  exit 1
fi

green "✅ USB environment OK"
echo ""
echo "Connected devices:"
echo "$DEVICES"
echo ""
echo "Ready to run: pnpm ios:usb"
