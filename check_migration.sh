#!/bin/bash

# Quick Migration Check Script
# Verifies if nutrition_calories migration has been applied

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "Nutrition Migration Check"
echo "================================================"
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
  echo -e "${RED}ERROR: Supabase CLI not installed${NC}"
  echo "Install with: brew install supabase/tap/supabase"
  echo ""
  echo "Alternative: Check manually via Supabase Studio:"
  echo "  1. Go to Supabase Studio → SQL Editor"
  echo "  2. Run the following query:"
  echo ""
  echo "  SELECT column_name, data_type, is_nullable"
  echo "  FROM information_schema.columns"
  echo "  WHERE table_schema = 'public'"
  echo "    AND table_name = 'profiles'"
  echo "    AND column_name LIKE 'nutrition%'"
  echo "  ORDER BY column_name;"
  echo ""
  exit 1
fi

# Try to get the database URL
echo -e "${YELLOW}Checking Supabase connection...${NC}"
DB_URL=$(supabase status 2>/dev/null | grep "DB URL" | awk '{print $NF}' || echo "")

if [ -z "$DB_URL" ]; then
  echo -e "${YELLOW}⚠ Local Supabase not running${NC}"
  echo ""
  echo "To check remote Supabase:"
  echo "  1. Make sure you're linked: supabase link --project-ref <YOUR_PROJECT_REF>"
  echo "  2. Or check via Supabase Studio SQL Editor"
  echo ""
  exit 1
fi

echo -e "${GREEN}✓ Connected to local Supabase${NC}"
echo ""

# Check for nutrition columns
echo -e "${YELLOW}Checking for nutrition columns...${NC}"
echo ""

COLUMN_CHECK=$(psql "$DB_URL" -t -c "
SELECT
  COUNT(*) as nutrition_columns,
  SUM(CASE WHEN column_name = 'nutrition_calories' THEN 1 ELSE 0 END) as has_calories,
  SUM(CASE WHEN column_name = 'nutrition_plan' THEN 1 ELSE 0 END) as has_plan,
  SUM(CASE WHEN column_name = 'nutrition_fingerprint' THEN 1 ELSE 0 END) as has_fingerprint,
  SUM(CASE WHEN column_name = 'nutrition_status' THEN 1 ELSE 0 END) as has_status,
  SUM(CASE WHEN column_name = 'nutrition_updated_at' THEN 1 ELSE 0 END) as has_updated_at
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name LIKE 'nutrition%';
" 2>/dev/null || echo "0|0|0|0|0|0")

# Parse results
TOTAL=$(echo "$COLUMN_CHECK" | awk '{print $1}')
HAS_CALORIES=$(echo "$COLUMN_CHECK" | awk '{print $3}')
HAS_PLAN=$(echo "$COLUMN_CHECK" | awk '{print $5}')
HAS_FINGERPRINT=$(echo "$COLUMN_CHECK" | awk '{print $7}')
HAS_STATUS=$(echo "$COLUMN_CHECK" | awk '{print $9}')
HAS_UPDATED_AT=$(echo "$COLUMN_CHECK" | awk '{print $11}')

echo "Found $TOTAL nutrition columns:"
echo ""

# Check each column
if [ "$HAS_PLAN" == "1" ]; then
  echo -e "  ${GREEN}✓${NC} nutrition_plan (JSONB)"
else
  echo -e "  ${RED}✗${NC} nutrition_plan (MISSING)"
fi

if [ "$HAS_FINGERPRINT" == "1" ]; then
  echo -e "  ${GREEN}✓${NC} nutrition_fingerprint (TEXT)"
else
  echo -e "  ${RED}✗${NC} nutrition_fingerprint (MISSING)"
fi

if [ "$HAS_STATUS" == "1" ]; then
  echo -e "  ${GREEN}✓${NC} nutrition_status (TEXT)"
else
  echo -e "  ${RED}✗${NC} nutrition_status (MISSING)"
fi

if [ "$HAS_CALORIES" == "1" ]; then
  echo -e "  ${GREEN}✓${NC} nutrition_calories (INTEGER) ← NEW"
else
  echo -e "  ${RED}✗${NC} nutrition_calories (MISSING) ← NEED TO APPLY MIGRATION"
fi

if [ "$HAS_UPDATED_AT" == "1" ]; then
  echo -e "  ${GREEN}✓${NC} nutrition_updated_at (TIMESTAMPTZ)"
else
  echo -e "  ${RED}✗${NC} nutrition_updated_at (MISSING)"
fi

echo ""

# Final verdict
if [ "$TOTAL" == "5" ] && [ "$HAS_CALORIES" == "1" ]; then
  echo -e "${GREEN}================================================${NC}"
  echo -e "${GREEN}✓ MIGRATION APPLIED SUCCESSFULLY${NC}"
  echo -e "${GREEN}================================================${NC}"
  echo ""
  echo "All nutrition columns are present. You're ready to test!"
  exit 0
else
  echo -e "${RED}================================================${NC}"
  echo -e "${RED}✗ MIGRATION NOT APPLIED${NC}"
  echo -e "${RED}================================================${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Navigate to project root: cd /Users/netanelhadad/Projects/gymbro"
  echo "  2. Apply migration: supabase db push"
  echo "  3. Re-run this script to verify"
  echo ""
  echo "Migration file: supabase/migrations/026_nutrition_calories.sql"
  exit 1
fi
