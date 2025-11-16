#!/bin/bash

# Decode JWT and check issuer
JWT="eyJhbGciOiJIUzI1NiIsImtpZCI6IjZjY0F5V0x2NHJRYjFON1EiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzMwNTYxOTA3LCJpYXQiOjE3MzA1NTgzMDcsImlzcyI6Imh0dHBzOi8vbnlrbGR0enRiZ2xtemN4bWJxaGcuc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjhhZDdlOTBhLTM2NTEtNDY1OS05ZjZhLTY2YzU3NmVmYzg0YyIsImVtYWlsIjoibmV0YUBuZXRhLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiYWNjZXB0X21hcmtldGluZyI6dHJ1ZSwiYWN0aXZpdHlfbGV2ZWxfaGUiOiLXkdeZ16DXldeqIiwiYWdlIjoyNSwiZGlldF90eXBlX2hlIjoi15HXqNeV15kv15zXqden15wiLCJnZW5kZXJfaGUiOiLXm9er15wiLCJnb2FsX2hlIjoi15TXqdeZ16LXldeqINee15HXqSDXldei15bXnCIsImhlaWdodF9jbSI6MTU1LCJ0YXJnZXRfd2VpZ2h0X2tnIjo3MCwid2VpZ2h0X2tnIjo3MH0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3MzA1NTgzMDd9XSwic2Vzc2lvbl9pZCI6ImY5MWQ4NTBhLTU3M2QtNDZkMy04M2UwLWUzMzVjZmI5YzVhNyIsImlzX2Fub255bW91cyI6ZmFsc2V9.qXMIXc2VHqgL_aUmOkK-vXQlGOi7QHzAxFLqAeIuD7A"

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
