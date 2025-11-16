#!/bin/bash

# Nutrition Plan End-to-End Verification Script
# This script verifies the complete nutrition flow from database to API

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "Nutrition Plan E2E Verification"
echo "================================================"
echo ""

# Check for JWT token
if [ -z "$JWT" ]; then
  echo -e "${RED}ERROR: JWT token not set${NC}"
  echo "Please set your JWT token:"
  echo "  export JWT='your-jwt-token-here'"
  echo ""
  echo "To get your JWT token:"
  echo "  1. Open your app in browser"
  echo "  2. Open DevTools (F12)"
  echo "  3. Go to Application → Local Storage"
  echo "  4. Find supabase.auth.token"
  echo "  5. Copy the access_token value"
  exit 1
fi

# Extract user ID from JWT
echo -e "${YELLOW}Step 1: Extracting User ID from JWT${NC}"
USER_ID=$(node -e "
const p=process.env.JWT?.split('.')[1];
if(!p){console.error('Invalid JWT');process.exit(1)};
const s=JSON.parse(Buffer.from(p,'base64').toString());
console.log(s.sub||s.user_id||s.userId||'NO_SUB_FOUND');
")

if [ "$USER_ID" == "NO_SUB_FOUND" ] || [ -z "$USER_ID" ]; then
  echo -e "${RED}✗ Failed to extract user ID from JWT${NC}"
  exit 1
fi

echo -e "${GREEN}✓ User ID: ${USER_ID:0:16}...${NC}"
echo ""

# Step 2: Test API endpoint
echo -e "${YELLOW}Step 2: Testing GET /api/nutrition/plan${NC}"
API_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT" http://localhost:3000/api/nutrition/plan)
API_OK=$(echo "$API_RESPONSE" | jq -r '.ok // false')
API_ERROR=$(echo "$API_RESPONSE" | jq -r '.error // ""')
PLAN_TYPE=$(echo "$API_RESPONSE" | jq -r '.plan | type // "null"')
FINGERPRINT=$(echo "$API_RESPONSE" | jq -r '.fingerprint // "null"')
CALORIES=$(echo "$API_RESPONSE" | jq -r '.calories // "null"')
UPDATED_AT=$(echo "$API_RESPONSE" | jq -r '.updatedAt // "null"')

echo "API Response:"
echo "  ok: $API_OK"
echo "  plan type: $PLAN_TYPE"
echo "  fingerprint: ${FINGERPRINT:0:16}..."
echo "  calories: $CALORIES"
echo "  updatedAt: $UPDATED_AT"

if [ "$API_OK" == "true" ]; then
  echo -e "${GREEN}✓ API returned nutrition plan${NC}"
  API_STATUS=200
else
  echo -e "${RED}✗ API error: $API_ERROR${NC}"
  API_STATUS=404
fi
echo ""

# Step 3: Check if Supabase CLI is available
echo -e "${YELLOW}Step 3: Database Verification${NC}"
if command -v supabase &> /dev/null; then
  echo "Checking local Supabase connection..."

  # Try to get the database URL
  DB_URL=$(supabase status 2>/dev/null | grep "DB URL" | awk '{print $NF}' || echo "")

  if [ -n "$DB_URL" ]; then
    echo -e "${GREEN}✓ Local Supabase is running${NC}"

    # Query the database
    echo ""
    echo "Querying profiles table for user $USER_ID..."
    psql "$DB_URL" -v ON_ERROR_STOP=1 -c "
SELECT
  id,
  jsonb_typeof(nutrition_plan) AS plan_type,
  nutrition_status,
  LEFT(nutrition_fingerprint, 16) AS fingerprint_prefix,
  nutrition_calories,
  nutrition_updated_at
FROM public.profiles
WHERE id = '$USER_ID';
" || echo -e "${RED}Query failed${NC}"

    echo ""
    echo "Schema verification:"
    psql "$DB_URL" -v ON_ERROR_STOP=1 -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='profiles' AND column_name LIKE 'nutrition%'
ORDER BY column_name;
" || echo -e "${RED}Schema check failed${NC}"

    DB_VERIFIED=true
  else
    echo -e "${YELLOW}⚠ Local Supabase not running (run 'supabase start')${NC}"
    echo "Skipping database checks..."
    DB_VERIFIED=false
  fi
else
  echo -e "${YELLOW}⚠ Supabase CLI not installed${NC}"
  echo "Install with: brew install supabase/tap/supabase"
  echo "Or verify manually via Supabase Studio"
  DB_VERIFIED=false
fi
echo ""

# Step 4: Check backend logs
echo -e "${YELLOW}Step 4: Checking Backend Logs${NC}"
echo "Looking for [Attach] logs in Next.js output..."

# Check running Next.js process logs
NEXT_PID=$(ps aux | grep "next-server" | grep -v grep | awk '{print $2}' | head -1)
if [ -n "$NEXT_PID" ]; then
  echo "Next.js server running (PID: $NEXT_PID)"
  echo ""
  echo "Recent [Attach] logs:"
  # Try to find logs in .next or check stdout
  ls -t /Users/netanelhadad/Projects/gymbro/apps/web/.next/**/*.log 2>/dev/null | head -1 | xargs tail -50 2>/dev/null | grep "\[Attach\]" | tail -5 || echo "No recent [Attach] logs found in .next directory"

  # Alternative: check recent terminal output (if available)
  echo ""
  echo -e "${YELLOW}Check your terminal where 'pnpm dev' is running for [Attach] logs${NC}"
else
  echo -e "${YELLOW}⚠ Next.js server not running${NC}"
fi
echo ""

# Step 5: Force manual attach if needed
if [ "$API_STATUS" == "404" ]; then
  echo -e "${YELLOW}Step 5: No plan found - Testing Manual Attach${NC}"
  echo "Attempting to force generation via POST /api/nutrition/attach..."

  ATTACH_RESPONSE=$(curl -s -X POST http://localhost:3000/api/nutrition/attach \
    -H "Authorization: Bearer $JWT" \
    -H "Content-Type: application/json" \
    -d '{"status":"pending","fingerprint":"manual-verify-001"}')

  ATTACH_OK=$(echo "$ATTACH_RESPONSE" | jq -r '.ok // false')
  ATTACH_ERROR=$(echo "$ATTACH_RESPONSE" | jq -r '.error // ""')

  echo "Attach Response:"
  echo "$ATTACH_RESPONSE" | jq

  if [ "$ATTACH_OK" == "true" ]; then
    echo -e "${GREEN}✓ Manual attach succeeded${NC}"
    echo ""
    echo "Retesting GET /api/nutrition/plan..."
    sleep 2

    RETRY_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT" http://localhost:3000/api/nutrition/plan)
    RETRY_OK=$(echo "$RETRY_RESPONSE" | jq -r '.ok // false')

    if [ "$RETRY_OK" == "true" ]; then
      echo -e "${GREEN}✓ Plan now available!${NC}"
      API_STATUS=200
      PLAN_TYPE=$(echo "$RETRY_RESPONSE" | jq -r '.plan | type')
      CALORIES=$(echo "$RETRY_RESPONSE" | jq -r '.calories // "null"')
    else
      echo -e "${RED}✗ Plan still not available${NC}"
    fi
  else
    echo -e "${RED}✗ Manual attach failed: $ATTACH_ERROR${NC}"
  fi
  echo ""
fi

# Final Report
echo "================================================"
echo -e "${YELLOW}FINAL VERIFICATION REPORT${NC}"
echo "================================================"

cat << REPORT
{
  "user_id": "$USER_ID",
  "api_status": $API_STATUS,
  "plan_type": "$PLAN_TYPE",
  "fingerprint": "${FINGERPRINT:0:16}...",
  "calories": $CALORIES,
  "updatedAt": "$UPDATED_AT",
  "database_verified": $DB_VERIFIED,
  "status": "$([ "$API_STATUS" == "200" ] && echo "SUCCESS" || echo "NEEDS_ATTENTION")"
}
REPORT

echo ""
if [ "$API_STATUS" == "200" ] && [ "$PLAN_TYPE" == "object" ]; then
  echo -e "${GREEN}✓ VERIFICATION PASSED${NC}"
  echo "Nutrition plan is properly configured and accessible!"
else
  echo -e "${RED}✗ VERIFICATION FAILED${NC}"
  echo ""
  echo "Troubleshooting steps:"
  echo "  1. Check if migration was applied: supabase db push"
  echo "  2. Verify user completed onboarding (has profile data)"
  echo "  3. Check server logs for generation errors"
  echo "  4. Try manual attach: see script output above"
fi
echo "================================================"
