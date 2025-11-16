#!/bin/bash

# Test Attach Route - Verify Server-Side Generation Works
# This script tests the complete attach flow with a pending draft

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "================================================"
echo "Testing Attach Route with Pending Draft"
echo "================================================"
echo ""

# Check if JWT token is provided
if [ -z "$JWT" ]; then
  echo -e "${RED}ERROR: No JWT token provided${NC}"
  echo ""
  echo "To test the attach route, you need a JWT token:"
  echo ""
  echo "1. Open your app in browser (http://localhost:3000)"
  echo "2. Log in or sign up"
  echo "3. Open DevTools (F12)"
  echo "4. Go to Application → Local Storage"
  echo "5. Find key like: sb-<something>-auth-token"
  echo "6. Copy the 'access_token' value"
  echo "7. Run this script with:"
  echo ""
  echo "   export JWT='your-access-token-here'"
  echo "   ./test_attach_route.sh"
  echo ""
  exit 1
fi

echo -e "${BLUE}Step 1: Testing POST /api/nutrition/attach${NC}"
echo "-------------------------------------------"
echo ""

# Test with a pending draft (no plan, status='pending')
echo "Sending pending draft to attach route..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST http://localhost:3000/api/nutrition/attach \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "pending",
    "fingerprint": "test-cli-' $(date +%s) '",
    "plan": null,
    "createdAt": ' $(date +%s000) '
  }' 2>&1)

# Split response and status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Check response
if [ "$HTTP_CODE" = "200" ]; then
  OK=$(echo "$BODY" | jq -r '.ok' 2>/dev/null || echo "false")
  SAVED=$(echo "$BODY" | jq -r '.saved' 2>/dev/null || echo "false")
  CALORIES=$(echo "$BODY" | jq -r '.calories' 2>/dev/null || echo "null")

  if [ "$OK" = "true" ] && [ "$SAVED" = "true" ]; then
    echo -e "${GREEN}✓ SUCCESS: Plan created and saved!${NC}"
    echo "  Calories: $CALORIES"
    echo ""
  elif [ "$OK" = "true" ] && [ "$SAVED" = "false" ]; then
    echo -e "${YELLOW}⚠ SKIPPED: Same fingerprint (no-op)${NC}"
    echo ""
  else
    ERROR=$(echo "$BODY" | jq -r '.error' 2>/dev/null || echo "unknown")

    if [ "$ERROR" = "pending" ]; then
      echo -e "${RED}✗ FAILED: Server-side generation timed out${NC}"
      echo ""
      echo "This means:"
      echo "  - The attach route was called (good)"
      echo "  - Server-side generation was attempted (good)"
      echo "  - BUT it timed out after 20s (10s + 10s retry)"
      echo ""
      echo "Possible causes:"
      echo "  - OpenAI API key missing or invalid"
      echo "  - OpenAI API slow/down"
      echo "  - Network issues"
      echo ""
      echo "Check server logs for:"
      echo "  [Attach] Server-side generate response status=timeout"
      echo ""
    else
      echo -e "${RED}✗ FAILED: ${ERROR}${NC}"
    fi
  fi

elif [ "$HTTP_CODE" = "401" ]; then
  echo -e "${RED}✗ UNAUTHORIZED${NC}"
  echo ""
  echo "Your JWT token is invalid or expired."
  echo "Get a fresh token and try again."
  echo ""

elif [ "$HTTP_CODE" = "500" ]; then
  echo -e "${RED}✗ SERVER ERROR${NC}"
  echo ""
  ERROR_MSG=$(echo "$BODY" | jq -r '.message' 2>/dev/null || echo "Unknown error")
  echo "Error: $ERROR_MSG"
  echo ""
  echo "Check server logs for details."
  echo ""

else
  echo -e "${RED}✗ UNEXPECTED STATUS: $HTTP_CODE${NC}"
  echo ""
fi

echo "================================================"
echo ""

echo -e "${BLUE}Step 2: Checking Server Logs${NC}"
echo "-----------------------------"
echo ""

# Check for [Attach] logs in the dev server output
if [ -f /tmp/next-dev.log ]; then
  echo "Recent [Attach] logs from dev server:"
  echo ""
  grep -i "\[Attach\]" /tmp/next-dev.log | tail -20 || echo "No [Attach] logs found"
  echo ""
else
  echo -e "${YELLOW}⚠ Log file not found${NC}"
  echo ""
  echo "Server logs are being written to the terminal where 'pnpm dev' is running."
  echo "Check that terminal for [Attach] logs:"
  echo ""
  echo "  [Attach] POST user=xxx fp=xxx"
  echo "  [Attach] Server-side generate start (days=1)"
  echo "  [Attach] Server-side generate response status=success"
  echo "  [Attach] Parsed hasPlan=true days=1"
  echo "  [Attach] Plan saved (fingerprint: xxx)"
  echo ""
fi

echo "================================================"
echo ""

echo -e "${BLUE}Step 3: Testing GET /api/nutrition/plan${NC}"
echo "---------------------------------------------"
echo ""

PLAN_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $JWT" \
  http://localhost:3000/api/nutrition/plan 2>&1)

PLAN_HTTP_CODE=$(echo "$PLAN_RESPONSE" | tail -n1)
PLAN_BODY=$(echo "$PLAN_RESPONSE" | sed '$d')

echo "HTTP Status: $PLAN_HTTP_CODE"
echo ""

if [ "$PLAN_HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Plan API returns 200${NC}"
  echo ""
  echo "Response:"
  echo "$PLAN_BODY" | jq '. | {ok, calories, updatedAt, hasPlan: (.plan != null)}' 2>/dev/null || echo "$PLAN_BODY"
  echo ""

elif [ "$PLAN_HTTP_CODE" = "404" ]; then
  echo -e "${YELLOW}⚠ Plan API returns 404${NC}"
  echo ""
  echo "Response:"
  echo "$PLAN_BODY" | jq '.' 2>/dev/null || echo "$PLAN_BODY"
  echo ""
  echo "This means no plan exists in the database yet."
  echo "Either the attach route failed, or you haven't gone through onboarding."
  echo ""

else
  echo -e "${RED}✗ Unexpected status: $PLAN_HTTP_CODE${NC}"
  echo ""
  echo "Response:"
  echo "$PLAN_BODY" | jq '.' 2>/dev/null || echo "$PLAN_BODY"
  echo ""
fi

echo "================================================"
echo ""

echo -e "${BLUE}Step 4: Database Verification (SQL)${NC}"
echo "------------------------------------"
echo ""

# Extract user ID from JWT
PAYLOAD=$(echo "$JWT" | cut -d. -f2)
case $((${#PAYLOAD} % 4)) in
  2) PAYLOAD="${PAYLOAD}==" ;;
  3) PAYLOAD="${PAYLOAD}=" ;;
esac
DECODED=$(echo "$PAYLOAD" | tr '_-' '/+' | base64 -d 2>/dev/null || echo "{}")
USER_ID=$(echo "$DECODED" | jq -r '.sub' 2>/dev/null || echo "unknown")

if [ "$USER_ID" != "unknown" ] && [ "$USER_ID" != "null" ]; then
  echo "Your User ID: $USER_ID"
  echo ""
  echo "Run this SQL in Supabase Studio to check your profile:"
  echo ""
  echo "SELECT"
  echo "  id,"
  echo "  jsonb_typeof(nutrition_plan) AS plan_type,"
  echo "  nutrition_status,"
  echo "  nutrition_fingerprint,"
  echo "  nutrition_calories,"
  echo "  nutrition_updated_at"
  echo "FROM public.profiles"
  echo "WHERE id = '$USER_ID';"
  echo ""
  echo "Expected results if attach worked:"
  echo "  plan_type: 'object'"
  echo "  nutrition_status: 'ready'"
  echo "  nutrition_calories: <number>"
  echo "  nutrition_fingerprint: <string>"
  echo ""
else
  echo -e "${YELLOW}Could not extract user ID from JWT${NC}"
fi

echo "================================================"
echo ""

echo -e "${BLUE}Summary${NC}"
echo "--------"
echo ""

if [ "$HTTP_CODE" = "200" ] && [ "$OK" = "true" ] && [ "$SAVED" = "true" ]; then
  echo -e "${GREEN}✓✓✓ ALL TESTS PASSED ✓✓✓${NC}"
  echo ""
  echo "The attach route is working correctly!"
  echo "Server-side generation succeeded."
  echo ""
  echo "Next steps:"
  echo "  1. Test the full flow in your app"
  echo "  2. Go through onboarding → generating → signup"
  echo "  3. Check /nutrition page - should show a plan"
  echo ""

elif [ "$HTTP_CODE" = "200" ] && [ "$ERROR" = "pending" ]; then
  echo -e "${YELLOW}⚠ PARTIAL SUCCESS${NC}"
  echo ""
  echo "The attach route is being called, but generation is timing out."
  echo ""
  echo "Check:"
  echo "  1. OpenAI API key in .env.local"
  echo "  2. Server logs for timeout errors"
  echo "  3. Network connectivity"
  echo ""

else
  echo -e "${RED}✗ TESTS FAILED${NC}"
  echo ""
  echo "The attach route has issues."
  echo ""
  echo "Check:"
  echo "  1. Is the dev server running? (should be on port 3000)"
  echo "  2. Is the JWT token valid? (try getting a fresh one)"
  echo "  3. Check server logs for errors"
  echo ""
fi

echo "================================================"
