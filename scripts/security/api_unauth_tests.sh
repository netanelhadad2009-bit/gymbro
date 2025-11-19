#!/bin/bash
# ============================================================================
# API Unauthorized Access Tests
# ============================================================================
# Purpose: Verify that API endpoints properly reject unauthenticated requests
#
# Expected behavior: All protected endpoints should return 401 or 403 without JWT
#
# Usage:
#   ./scripts/security/api_unauth_tests.sh
#   API_BASE_URL=https://your-app.vercel.app ./scripts/security/api_unauth_tests.sh
#
# Environment Variables:
#   API_BASE_URL - Base URL of the API (default: http://localhost:3000)
# ============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"

# Test counters
PASSED=0
FAILED=0

echo "🔒 Testing API Authentication Security"
echo "======================================"
echo "Base URL: $API_BASE_URL"
echo ""

# ============================================================================
# Helper function to test endpoint
# ============================================================================
test_endpoint() {
  local method=$1
  local endpoint=$2
  local expected_status=$3
  local body=$4

  echo -n "Testing ${method} ${endpoint}... "

  # Make request without Authorization header
  if [ -n "$body" ]; then
    response=$(curl -s -w "%{http_code}" -o /dev/null \
      -X "$method" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "${API_BASE_URL}${endpoint}")
  else
    response=$(curl -s -w "%{http_code}" -o /dev/null \
      -X "$method" \
      "${API_BASE_URL}${endpoint}")
  fi

  # Check if response is 401 or 403
  if [ "$response" = "401" ] || [ "$response" = "403" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $response)"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $response - expected 401/403)"
    ((FAILED++))
  fi
}

# ============================================================================
# Test Cases - Nutrition & Meals
# ============================================================================

echo "📊 Nutrition & Meals Endpoints"
echo "------------------------------"

test_endpoint "GET" "/api/meals" "401"
test_endpoint "POST" "/api/meals" "401" '{"name":"Test","calories":100,"date":"2025-01-01"}'
test_endpoint "GET" "/api/meals/test-id-123" "401"
test_endpoint "DELETE" "/api/meals?id=test-id-123" "401"

test_endpoint "GET" "/api/nutrition/foods" "401"
test_endpoint "POST" "/api/nutrition/log" "401" '{"food":"apple","calories":50}'
test_endpoint "POST" "/api/nutrition/plan" "401" '{"days":7}'

echo ""

# ============================================================================
# Test Cases - Journey & Progress
# ============================================================================

echo "🗺️  Journey & Progress Endpoints"
echo "------------------------------"

test_endpoint "GET" "/api/journey/plan" "401"
test_endpoint "POST" "/api/journey/complete" "401" '{"stageId":"test"}'
test_endpoint "GET" "/api/journey/stages" "401"
test_endpoint "POST" "/api/journey/track" "401" '{"event":"test"}'

echo ""

# ============================================================================
# Test Cases - AI Coach
# ============================================================================

echo "🤖 AI Coach Endpoints"
echo "------------------------------"

test_endpoint "POST" "/api/coach/chat" "401" '{"message":"Hello"}'
test_endpoint "GET" "/api/coach/messages" "401"
test_endpoint "GET" "/api/coach/sessions" "401"
test_endpoint "POST" "/api/coach/request" "401" '{"type":"workout"}'

echo ""

# ============================================================================
# Test Cases - Points & Gamification
# ============================================================================

echo "🎯 Points & Gamification Endpoints"
echo "------------------------------"

test_endpoint "GET" "/api/points/summary" "401"
test_endpoint "GET" "/api/points/feed" "401"

echo ""

# ============================================================================
# Test Cases - Streak Tracking
# ============================================================================

echo "🔥 Streak Tracking Endpoints"
echo "------------------------------"

test_endpoint "GET" "/api/streak" "401"
test_endpoint "POST" "/api/streak/mark" "401" '{"source":"nutrition"}'

echo ""

# ============================================================================
# Test Cases - Push Notifications
# ============================================================================

echo "🔔 Push Notifications Endpoints"
echo "------------------------------"

test_endpoint "POST" "/api/push/subscribe" "401" '{"subscription":{"endpoint":"test","keys":{"p256dh":"test","auth":"test"}}}'
test_endpoint "POST" "/api/push/register-native" "401" '{"token":"test","platform":"ios"}'

echo ""

# ============================================================================
# Test Cases - AI Generation
# ============================================================================

echo "✨ AI Generation Endpoints"
echo "------------------------------"

test_endpoint "POST" "/api/ai/nutrition" "401" '{"prompt":"test"}'
test_endpoint "POST" "/api/ai/workout" "401" '{"prompt":"test"}'

echo ""

# ============================================================================
# Results Summary
# ============================================================================

echo "======================================"
echo "Test Results Summary"
echo "======================================"
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo "Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  echo "✅ API properly rejects unauthenticated requests"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed!${NC}"
  echo "❌ Review failed endpoints - they may allow unauthorized access"
  exit 1
fi
