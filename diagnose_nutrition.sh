#!/bin/bash

# Nutrition Plan Diagnostic Script
# Helps identify why nutrition plans aren't being created or displayed

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "================================================"
echo "Nutrition Plan Diagnostics"
echo "================================================"
echo ""

# Step 1: Check if migration applied
echo -e "${BLUE}Step 1: Checking Database Schema${NC}"
echo "-----------------------------------"

if ! command -v supabase &> /dev/null; then
  echo -e "${RED}✗ Supabase CLI not installed${NC}"
  echo ""
  echo "Install with: brew install supabase/tap/supabase"
  echo ""
  echo "Or check manually in Supabase Studio:"
  echo "  SELECT column_name FROM information_schema.columns"
  echo "  WHERE table_name='profiles' AND column_name LIKE 'nutrition%';"
  echo ""
  exit 1
fi

DB_URL=$(supabase status 2>/dev/null | grep "DB URL" | awk '{print $NF}' || echo "")

if [ -z "$DB_URL" ]; then
  echo -e "${YELLOW}⚠ Local Supabase not running${NC}"
  echo ""
  echo "Start local Supabase:"
  echo "  cd /Users/netanelhadad/Projects/gymbro"
  echo "  supabase start"
  echo ""
  echo "Or check remote database via Supabase Studio"
  echo ""
  exit 1
fi

echo -e "${GREEN}✓ Connected to database${NC}"
echo ""

# Check columns
echo "Checking nutrition columns..."
COLUMNS=$(psql "$DB_URL" -t -c "
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name LIKE 'nutrition%'
ORDER BY column_name;
" 2>/dev/null || echo "")

if [ -z "$COLUMNS" ]; then
  echo -e "${RED}✗ No nutrition columns found!${NC}"
  echo ""
  echo "You need to apply the migration:"
  echo "  cd /Users/netanelhadad/Projects/gymbro"
  echo "  supabase db push"
  echo ""
  exit 1
fi

echo "Found columns:"
echo "$COLUMNS" | while read -r col; do
  if [ -n "$col" ]; then
    col_trimmed=$(echo "$col" | xargs)
    if [ "$col_trimmed" = "nutrition_calories" ]; then
      echo -e "  ${GREEN}✓${NC} $col_trimmed ${GREEN}(NEW - migration applied!)${NC}"
    else
      echo -e "  ${GREEN}✓${NC} $col_trimmed"
    fi
  fi
done

# Check if nutrition_calories exists specifically
HAS_CALORIES=$(echo "$COLUMNS" | grep -c "nutrition_calories" || echo "0")

if [ "$HAS_CALORIES" = "0" ]; then
  echo ""
  echo -e "${RED}✗ nutrition_calories column missing - migration NOT applied${NC}"
  echo ""
  echo "Apply migration:"
  echo "  cd /Users/netanelhadad/Projects/gymbro"
  echo "  supabase db push"
  echo ""
  exit 1
fi

echo ""
echo -e "${GREEN}✓ Migration applied successfully${NC}"
echo ""

# Step 2: Check for users with nutrition data
echo -e "${BLUE}Step 2: Checking User Nutrition Data${NC}"
echo "---------------------------------------"

USER_COUNT=$(psql "$DB_URL" -t -c "
SELECT COUNT(*) FROM profiles WHERE nutrition_fingerprint IS NOT NULL;
" 2>/dev/null || echo "0")

echo "Users with nutrition fingerprint: $USER_COUNT"

if [ "$USER_COUNT" = "0" ]; then
  echo -e "${YELLOW}⚠ No users have nutrition data yet${NC}"
  echo ""
  echo "This means:"
  echo "  1. No one has completed onboarding, OR"
  echo "  2. The generating page is not creating drafts, OR"
  echo "  3. The attach route is not being called during signup"
  echo ""
fi

# Show recent profiles with nutrition status
echo ""
echo "Recent user nutrition statuses:"
psql "$DB_URL" -c "
SELECT
  id,
  nutrition_status,
  nutrition_calories,
  CASE
    WHEN nutrition_plan IS NOT NULL THEN 'HAS PLAN'
    ELSE 'NO PLAN'
  END as plan_status,
  nutrition_updated_at,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;
" 2>/dev/null || echo "No data available"

echo ""

# Step 3: Check for pending vs ready
echo -e "${BLUE}Step 3: Plan Status Breakdown${NC}"
echo "--------------------------------"

STATS=$(psql "$DB_URL" -t -c "
SELECT
  COUNT(CASE WHEN nutrition_status = 'ready' AND nutrition_plan IS NOT NULL THEN 1 END) as ready_with_plan,
  COUNT(CASE WHEN nutrition_status = 'ready' AND nutrition_plan IS NULL THEN 1 END) as ready_no_plan,
  COUNT(CASE WHEN nutrition_status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN nutrition_status IS NULL THEN 1 END) as no_status,
  COUNT(*) as total
FROM profiles;
" 2>/dev/null || echo "0|0|0|0|0")

READY_WITH_PLAN=$(echo "$STATS" | awk '{print $1}')
READY_NO_PLAN=$(echo "$STATS" | awk '{print $3}')
PENDING=$(echo "$STATS" | awk '{print $5}')
NO_STATUS=$(echo "$STATS" | awk '{print $7}')
TOTAL=$(echo "$STATS" | awk '{print $9}')

echo "Total users: $TOTAL"
echo ""
echo -e "  ${GREEN}✓${NC} Ready with plan: $READY_WITH_PLAN ${GREEN}(Good!)${NC}"
echo -e "  ${YELLOW}⚠${NC} Ready but no plan: $READY_NO_PLAN ${YELLOW}(Bug - should have plan)${NC}"
echo -e "  ${YELLOW}⚠${NC} Pending: $PENDING ${YELLOW}(Waiting for generation/attach)${NC}"
echo -e "  ${BLUE}i${NC} No status: $NO_STATUS ${BLUE}(Not started onboarding)${NC}"

echo ""

# Step 4: Show example plan structure if any exist
echo -e "${BLUE}Step 4: Sample Plan Structure${NC}"
echo "-------------------------------"

SAMPLE=$(psql "$DB_URL" -t -c "
SELECT
  id,
  jsonb_pretty(nutrition_plan)
FROM profiles
WHERE nutrition_plan IS NOT NULL
LIMIT 1;
" 2>/dev/null || echo "")

if [ -z "$SAMPLE" ]; then
  echo -e "${YELLOW}⚠ No sample plans found${NC}"
  echo ""
  echo "No nutrition plans exist in the database."
  echo "This confirms the issue: Plans are not being created."
else
  echo "Found sample plan:"
  echo "$SAMPLE"
fi

echo ""

# Step 5: Recommendations
echo -e "${BLUE}Recommendations${NC}"
echo "----------------"

if [ "$READY_WITH_PLAN" = "0" ]; then
  echo -e "${RED}ISSUE: No users have nutrition plans!${NC}"
  echo ""
  echo "Next steps to diagnose:"
  echo ""
  echo "1. Check if generating page is creating drafts:"
  echo "   - Go to browser DevTools → Console"
  echo "   - Go through onboarding → generating page"
  echo "   - Look for logs: [Generating] Draft saved (full)"
  echo "   - Should NOT see: [Generating] Watchdog fired (before 15s)"
  echo ""
  echo "2. Check if attach route is being called:"
  echo "   - Look for server logs: [Attach] POST user=..."
  echo "   - Check signup page console: [Signup] Draft migrated"
  echo ""
  echo "3. Check server logs:"
  echo "   - Look at terminal where 'pnpm dev' is running"
  echo "   - Search for [Attach] or [Nutrition Plan] logs"
  echo ""
  echo "4. Test attach route manually:"
  echo "   - Export your JWT token from browser localStorage"
  echo "   - Run: ./verify_nutrition_e2e.sh"
  echo ""
elif [ "$PENDING" -gt "0" ]; then
  echo -e "${YELLOW}ISSUE: Users stuck in 'pending' status${NC}"
  echo ""
  echo "This means the attach route was called but couldn't generate a plan."
  echo ""
  echo "Check server logs for:"
  echo "  [Attach] Server-side generate response status=timeout"
  echo "  [Attach] Server-side generate response status=error"
  echo ""
  echo "Possible causes:"
  echo "  - OpenAI API key missing or invalid"
  echo "  - Network issues"
  echo "  - Generation timeout (10s + 10s = 20s not enough)"
  echo ""
elif [ "$READY_NO_PLAN" -gt "0" ]; then
  echo -e "${RED}CRITICAL BUG: Users marked 'ready' but have no plan!${NC}"
  echo ""
  echo "This is a data integrity issue. Fix with:"
  echo ""
  echo "UPDATE profiles"
  echo "SET nutrition_status = 'pending'"
  echo "WHERE nutrition_status = 'ready' AND nutrition_plan IS NULL;"
  echo ""
else
  echo -e "${GREEN}✓ Database looks healthy!${NC}"
  echo ""
  echo "If users are still seeing 'No nutrition plan found', check:"
  echo "  1. Browser localStorage cache"
  echo "  2. User authentication (correct JWT token)"
  echo "  3. Client-side code (nutrition/page.tsx)"
fi

echo ""
echo "================================================"
echo "Diagnostic Complete"
echo "================================================"
