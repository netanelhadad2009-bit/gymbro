#!/bin/bash

# Test Nutrition API Endpoint
# This script helps diagnose why nutrition plans aren't being returned

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "================================================"
echo "Nutrition API Test"
echo "================================================"
echo ""

# Check if JWT token is provided
if [ -z "$JWT" ]; then
  echo -e "${YELLOW}No JWT token provided${NC}"
  echo ""
  echo "To test the API, you need a JWT token:"
  echo ""
  echo "1. Open your app in browser"
  echo "2. Open DevTools (F12)"
  echo "3. Go to Application → Local Storage"
  echo "4. Find 'sb-<project-id>-auth-token'"
  echo "5. Copy the 'access_token' value"
  echo "6. Run this script with:"
  echo ""
  echo "   export JWT='your-token-here'"
  echo "   ./test_nutrition_api.sh"
  echo ""
  exit 1
fi

echo -e "${BLUE}Testing GET /api/nutrition/plan${NC}"
echo "-----------------------------------"
echo ""

# Test the endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $JWT" \
  -H "Cookie: sb-access-token=$JWT" \
  http://localhost:3000/api/nutrition/plan)

# Split response and status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ API returned 200 OK${NC}"
  echo ""
  echo "Response body:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""

  # Check if plan exists in response
  HAS_PLAN=$(echo "$BODY" | jq -r '.plan' 2>/dev/null || echo "null")

  if [ "$HAS_PLAN" != "null" ] && [ "$HAS_PLAN" != "" ]; then
    echo -e "${GREEN}✓ Plan data found in response${NC}"

    # Extract key info
    DAYS=$(echo "$BODY" | jq -r '.plan.days | length' 2>/dev/null || echo "0")
    CALORIES=$(echo "$BODY" | jq -r '.calories' 2>/dev/null || echo "null")
    FINGERPRINT=$(echo "$BODY" | jq -r '.fingerprint' 2>/dev/null || echo "null")

    echo ""
    echo "Plan details:"
    echo "  Days: $DAYS"
    echo "  Calories: $CALORIES"
    echo "  Fingerprint: ${FINGERPRINT:0:12}..."
  else
    echo -e "${RED}✗ No plan data in response${NC}"
    echo ""
    echo "This should not happen with a 200 response!"
  fi

elif [ "$HTTP_CODE" = "404" ]; then
  echo -e "${RED}✗ API returned 404 Not Found${NC}"
  echo ""
  echo "Response body:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo -e "${YELLOW}This means:${NC}"
  echo "  1. User has no nutrition plan in database, OR"
  echo "  2. nutrition_plan column is NULL, OR"
  echo "  3. User profile doesn't exist"
  echo ""
  echo "Next steps:"
  echo "  - Check if you completed onboarding"
  echo "  - Check database directly (see below)"
  echo "  - Run the attach route to create a plan"

elif [ "$HTTP_CODE" = "401" ]; then
  echo -e "${RED}✗ API returned 401 Unauthorized${NC}"
  echo ""
  echo "Response body:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo -e "${YELLOW}This means:${NC}"
  echo "  Your JWT token is invalid or expired"
  echo ""
  echo "Get a fresh token:"
  echo "  1. Log out and log back in"
  echo "  2. Copy new access_token from localStorage"
  echo "  3. Try again"

else
  echo -e "${RED}✗ API returned $HTTP_CODE${NC}"
  echo ""
  echo "Response body:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""
echo "================================================"
echo ""

# Extract user ID from JWT to help with database queries
echo -e "${BLUE}Extracting User ID from JWT${NC}"
echo "-----------------------------------"

# JWT is in format: header.payload.signature
# We need to decode the payload (base64url)
PAYLOAD=$(echo "$JWT" | cut -d. -f2)

# Add padding if needed (base64 requires length divisible by 4)
case $((${#PAYLOAD} % 4)) in
  2) PAYLOAD="${PAYLOAD}==" ;;
  3) PAYLOAD="${PAYLOAD}=" ;;
esac

# Decode (replace URL-safe chars first)
DECODED=$(echo "$PAYLOAD" | tr '_-' '/+' | base64 -d 2>/dev/null || echo "{}")

USER_ID=$(echo "$DECODED" | jq -r '.sub' 2>/dev/null || echo "unknown")

if [ "$USER_ID" != "unknown" ] && [ "$USER_ID" != "" ]; then
  echo "User ID: $USER_ID"
  echo ""
  echo "To check database directly, run this SQL in Supabase Studio:"
  echo ""
  echo "SELECT"
  echo "  id,"
  echo "  nutrition_status,"
  echo "  nutrition_calories,"
  echo "  CASE WHEN nutrition_plan IS NOT NULL THEN 'HAS PLAN' ELSE 'NO PLAN' END as plan_status,"
  echo "  nutrition_fingerprint,"
  echo "  nutrition_updated_at"
  echo "FROM profiles"
  echo "WHERE id = '$USER_ID';"
  echo ""
else
  echo -e "${YELLOW}Could not extract user ID from JWT${NC}"
fi

echo "================================================"
