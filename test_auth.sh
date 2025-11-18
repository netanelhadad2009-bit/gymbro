#!/bin/bash
# test_auth.sh
# Utility to inspect a Supabase JWT (for LOCAL DEV ONLY).

# JWT is taken from:
# 1) First CLI argument, or
# 2) TEST_JWT environment variable

JWT="${1:-$TEST_JWT}"

if [ -z "$JWT" ]; then
  echo "❌ Error: JWT token required"
  echo "Usage:"
  echo "  export TEST_JWT='your-jwt-here'"
  echo "  ./test_auth.sh \"\$TEST_JWT\""
  echo "  # or:"
  echo "  ./test_auth.sh 'your-jwt-here'"
  exit 1
fi

PAYLOAD=$(echo "$JWT" | cut -d. -f2)
DECODED=$(echo "$PAYLOAD" | base64 -d 2>/dev/null)

echo "JWT Token Analysis:"
echo "==================="
echo ""
echo "Issuer from JWT:"
echo "$DECODED" | jq -r '.iss'

echo ""
echo "Subject (User ID) from JWT:"
echo "$DECODED" | jq -r '.sub'

echo ""
echo "App Configuration:"
cat /Users/netanelhadad/Projects/gymbro/apps/web/.env.local | grep NEXT_PUBLIC_SUPABASE_URL

echo ""
echo "Conclusion:"
echo "-----------"

JWT_ISS=$(echo "$DECODED" | jq -r '.iss')
APP_URL=$(grep NEXT_PUBLIC_SUPABASE_URL /Users/netanelhadad/Projects/gymbro/apps/web/.env.local | cut -d= -f2 | tr -d '"')

if echo "$JWT_ISS" | grep -q "nykldtztbglmzcxmbqhg" && echo "$APP_URL" | grep -q "ivzltlqsjrikffssyvbr"; then
  echo "❌ JWT TOKEN MISMATCH!"
  echo "   JWT is from: nykldtztbglmzcxmbqhg.supabase.co"
  echo "   App expects: ivzltlqsjrikffssyvbr.supabase.co"
  echo ""
  echo "The JWT token is from a different Supabase project!"
  echo "You need to get a fresh JWT token from http://localhost:3000"
elif echo "$JWT_ISS" | grep -q "ivzltlqsjrikffssyvbr"; then
  echo "✅ JWT matches app configuration"
else
  echo "⚠️  Unable to determine mismatch status"
fi
