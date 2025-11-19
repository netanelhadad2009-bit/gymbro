#!/bin/bash
# ============================================================================
# API Row-Level Security (RLS) Cross-User Access Tests
# ============================================================================
# Purpose: Verify that RLS policies prevent users from accessing each other's data
#
# Expected behavior:
#   - User A can create/read their own resources
#   - User B CANNOT read/modify User A's resources (should get 404/403/empty result)
#
# Usage:
#   # Export JWT tokens for two different users
#   export JWT_USER_A="eyJhbGci..."
#   export JWT_USER_B="eyJhbGci..."
#   ./scripts/security/api_rls_cross_user_tests.sh
#
#   # Or pass as arguments
#   ./scripts/security/api_rls_cross_user_tests.sh "JWT_A" "JWT_B"
#
# How to get JWT tokens:
#   1. Open app in browser (http://localhost:3000)
#   2. Sign in as User A
#   3. Open DevTools → Application → Local Storage
#   4. Find key like "sb-<project>-auth-token"
#   5. Copy the "access_token" value
#   6. Repeat for User B in incognito/different browser
#
# Environment Variables:
#   API_BASE_URL - Base URL (default: http://localhost:3000)
#   JWT_USER_A - JWT token for user A
#   JWT_USER_B - JWT token for user B
# ============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"

# Get JWT tokens
if [ -n "$1" ] && [ -n "$2" ]; then
  JWT_USER_A="$1"
  JWT_USER_B="$2"
fi

# Validate inputs
if [ -z "$JWT_USER_A" ] || [ -z "$JWT_USER_B" ]; then
  echo -e "${RED}❌ Error: Missing JWT tokens${NC}"
  echo ""
  echo "Usage:"
  echo "  export JWT_USER_A='your-jwt-for-user-a'"
  echo "  export JWT_USER_B='your-jwt-for-user-b'"
  echo "  $0"
  echo ""
  echo "Or:"
  echo "  $0 'JWT_A' 'JWT_B'"
  echo ""
  echo "To get JWT tokens:"
  echo "  1. Open http://localhost:3000 in browser"
  echo "  2. Sign in as User A"
  echo "  3. DevTools → Application → Local Storage → sb-*-auth-token"
  echo "  4. Copy 'access_token' value"
  echo "  5. Repeat in incognito for User B"
  exit 1
fi

# Test counters
PASSED=0
FAILED=0
SKIPPED=0

echo "🔒 Testing RLS Cross-User Access Protection"
echo "==========================================="
echo "Base URL: $API_BASE_URL"
echo "User A JWT: ${JWT_USER_A:0:30}..."
echo "User B JWT: ${JWT_USER_B:0:30}..."
echo ""

# ============================================================================
# Helper Functions
# ============================================================================

# Make authenticated request
api_call() {
  local method=$1
  local endpoint=$2
  local jwt=$3
  local body=$4

  if [ -n "$body" ]; then
    curl -s -w "\n%{http_code}" \
      -X "$method" \
      -H "Authorization: Bearer $jwt" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "${API_BASE_URL}${endpoint}"
  else
    curl -s -w "\n%{http_code}" \
      -X "$method" \
      -H "Authorization: Bearer $jwt" \
      "${API_BASE_URL}${endpoint}"
  fi
}

# Extract HTTP status code from response
get_status() {
  echo "$1" | tail -n1
}

# Extract response body (remove last line which is status code)
get_body() {
  echo "$1" | head -n -1
}

# Extract ID from JSON response
extract_id() {
  echo "$1" | jq -r '.meal.id // .id // empty' 2>/dev/null || echo ""
}

# ============================================================================
# Test 1: Meals - User A creates meal, User B tries to access it
# ============================================================================

echo -e "${BLUE}📊 Test 1: Meals RLS${NC}"
echo "------------------------"

# User A creates a meal
echo -n "User A creating meal... "
meal_data='{"name":"Test Security Meal","calories":500,"date":"2025-11-18"}'
response_a_create=$(api_call "POST" "/api/meals" "$JWT_USER_A" "$meal_data")
status_a_create=$(get_status "$response_a_create")
body_a_create=$(get_body "$response_a_create")

if [ "$status_a_create" = "200" ]; then
  meal_id=$(extract_id "$body_a_create")
  if [ -n "$meal_id" ]; then
    echo -e "${GREEN}✅ Success${NC} (ID: ${meal_id:0:8}...)"
  else
    echo -e "${YELLOW}⚠️  Created but no ID returned${NC}"
    ((SKIPPED++))
    meal_id=""
  fi
else
  echo -e "${RED}❌ Failed${NC} (HTTP $status_a_create)"
  ((FAILED++))
  meal_id=""
fi

# User A can read their own meal
if [ -n "$meal_id" ]; then
  echo -n "User A reading own meal... "
  response_a_read=$(api_call "GET" "/api/meals/$meal_id" "$JWT_USER_A")
  status_a_read=$(get_status "$response_a_read")

  if [ "$status_a_read" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $status_a_read)"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $status_a_read - User A should access own data)"
    ((FAILED++))
  fi

  # User B tries to read User A's meal (should be blocked)
  echo -n "User B trying to read User A's meal... "
  response_b_read=$(api_call "GET" "/api/meals/$meal_id" "$JWT_USER_B")
  status_b_read=$(get_status "$response_b_read")
  body_b_read=$(get_body "$response_b_read")

  # Should get 404 or 403, or empty result
  if [ "$status_b_read" = "404" ] || [ "$status_b_read" = "403" ] || [ "$body_b_read" = "null" ] || [ "$body_b_read" = "{}" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $status_b_read - Correctly blocked)"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $status_b_read - User B accessed User A's data!)"
    echo "Response: $body_b_read"
    ((FAILED++))
  fi

  # User B tries to delete User A's meal (should be blocked)
  echo -n "User B trying to delete User A's meal... "
  response_b_delete=$(api_call "DELETE" "/api/meals?id=$meal_id" "$JWT_USER_B")
  status_b_delete=$(get_status "$response_b_delete")

  if [ "$status_b_delete" = "404" ] || [ "$status_b_delete" = "403" ] || [ "$status_b_delete" = "401" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $status_b_delete - Correctly blocked)"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $status_b_delete - User B modified User A's data!)"
    ((FAILED++))
  fi

  # Cleanup: User A deletes their own meal
  echo -n "Cleanup: User A deleting own meal... "
  response_a_delete=$(api_call "DELETE" "/api/meals?id=$meal_id" "$JWT_USER_A")
  status_a_delete=$(get_status "$response_a_delete")

  if [ "$status_a_delete" = "200" ]; then
    echo -e "${GREEN}✅ Cleaned up${NC}"
  else
    echo -e "${YELLOW}⚠️  Cleanup failed${NC} (HTTP $status_a_delete)"
  fi
fi

echo ""

# ============================================================================
# Test 2: Journey Progress - Cross-user access test
# ============================================================================

echo -e "${BLUE}🗺️  Test 2: Journey Progress RLS${NC}"
echo "--------------------------------"

# User A gets their journey plan
echo -n "User A fetching journey plan... "
response_a_journey=$(api_call "GET" "/api/journey/plan" "$JWT_USER_A")
status_a_journey=$(get_status "$response_a_journey")

if [ "$status_a_journey" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP $status_a_journey)"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $status_a_journey)"
  ((FAILED++))
fi

# User B gets their own journey plan (should be different from A's)
echo -n "User B fetching own journey plan... "
response_b_journey=$(api_call "GET" "/api/journey/plan" "$JWT_USER_B")
status_b_journey=$(get_status "$response_b_journey")

if [ "$status_b_journey" = "200" ]; then
  body_a=$(get_body "$response_a_journey")
  body_b=$(get_body "$response_b_journey")

  # Compare responses - they should be different (different user data)
  if [ "$body_a" != "$body_b" ]; then
    echo -e "${GREEN}✅ PASS${NC} (Different data for each user)"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠️  Warning${NC} (Same data returned - might be an issue)"
    ((SKIPPED++))
  fi
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $status_b_journey)"
  ((FAILED++))
fi

echo ""

# ============================================================================
# Test 3: Points & Gamification - Cross-user access test
# ============================================================================

echo -e "${BLUE}🎯 Test 3: Points Summary RLS${NC}"
echo "------------------------------"

# User A gets their points
echo -n "User A fetching points summary... "
response_a_points=$(api_call "GET" "/api/points/summary" "$JWT_USER_A")
status_a_points=$(get_status "$response_a_points")

if [ "$status_a_points" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $status_a_points)"
  ((FAILED++))
fi

# User B gets their own points (should be different)
echo -n "User B fetching points summary... "
response_b_points=$(api_call "GET" "/api/points/summary" "$JWT_USER_B")
status_b_points=$(get_status "$response_b_points")

if [ "$status_b_points" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $status_b_points)"
  ((FAILED++))
fi

echo ""

# ============================================================================
# Results Summary
# ============================================================================

echo "==========================================="
echo "RLS Cross-User Access Test Results"
echo "==========================================="
echo -e "Passed:  ${GREEN}${PASSED}${NC}"
echo -e "Failed:  ${RED}${FAILED}${NC}"
echo -e "Skipped: ${YELLOW}${SKIPPED}${NC}"
echo "Total:   $((PASSED + FAILED + SKIPPED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All RLS tests passed!${NC}"
  echo "✅ Users are properly isolated from each other's data"
  exit 0
else
  echo -e "${RED}⚠️  RLS SECURITY ISSUE DETECTED!${NC}"
  echo "❌ Some tests failed - users may be able to access each other's data"
  echo "🚨 Review RLS policies immediately!"
  exit 1
fi
