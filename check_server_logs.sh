#!/bin/bash

# Script to check server logs for [Attach] entries
# User ID: 16e075a7-08aa-4d75-806c-8b5ac36b867b
# Fingerprint: 00ff1bu6

echo "=== Checking Server Logs for Attach Route Activity ==="
echo ""
echo "User ID: 16e075a7-08aa-4d75-806c-8b5ac36b867b"
echo "Fingerprint: 00ff1bu6"
echo ""

# Check if there's a log file
if [ -f "/tmp/next-dev.log" ]; then
  echo "Found /tmp/next-dev.log"
  echo ""
  echo "Recent [Attach] logs:"
  grep "\[Attach\]" /tmp/next-dev.log | tail -20
else
  echo "No /tmp/next-dev.log found"
  echo ""
  echo "Please check the terminal where 'pnpm dev' is running for [Attach] logs"
  echo ""
  echo "Look for these patterns:"
  echo "  [Attach] POST user=16e075a7 fp=00ff1bu6"
  echo "  [Attach] Server-side generate start (days=1)"
  echo "  [Attach] Server-side generate response status=success/timeout"
  echo "  [Attach] Plan saved (fingerprint: 00ff1bu6)"
  echo "  OR"
  echo "  [Attach] Marked pending (fingerprint: 00ff1bu6)"
fi

echo ""
echo "=== Instructions ==="
echo ""
echo "1. Check the terminal where 'pnpm dev' is running (NOT Xcode)"
echo "2. Scroll back or search for '[Attach]' in the terminal output"
echo "3. Look for logs related to user ID '16e075a7' or fingerprint '00ff1bu6'"
echo ""
echo "If you don't see ANY [Attach] logs:"
echo "  → The attach route was never called (possible fetch failure or network issue)"
echo ""
echo "If you see [Attach] logs with 'status=timeout':"
echo "  → Server-side generation is timing out even with 60s timeout"
echo "  → May need to check OpenAI API key or network"
echo ""
echo "If you see [Attach] logs with 'status=success' and 'Plan saved':"
echo "  → Plan was created successfully, but client didn't receive response"
echo "  → Or nutrition page is reading from wrong source"
echo ""
