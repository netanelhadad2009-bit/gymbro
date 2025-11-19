#!/bin/bash
# ============================================================================
# API Rate Limiting Tests
# ============================================================================
# Purpose: Verify that API endpoints enforce rate limits on burst traffic
#
# Expected behavior: After N requests, endpoints should return 429 (Too Many Requests)
#
# Usage:
#   # Export JWT token for authenticated user
#   export JWT_TOKEN="eyJhbGci..."
#   ./scripts/security/api_rate_limit_tests.sh
#
#   # Or pass as argument
#   ./scripts/security/api_rate_limit_tests.sh "your-jwt-token"
#
#   # Override burst count (default: 30)
#   BURST_COUNT=50 ./scripts/security/api_rate_limit_tests.sh
#
# How to get JWT token:
#   1. Open app in browser (http://localhost:3000)
#   2. Sign in
#   3. Open DevTools → Application → Local Storage
#   4. Find key like "sb-<project>-auth-token"
#   5. Copy the "access_token" value
#
# Environment Variables:
#   API_BASE_URL - Base URL (default: http://localhost:3000)
#   JWT_TOKEN - JWT token for authenticated requests
#   BURST_COUNT - Number of rapid requests to send (default: 30)
#   SLEEP_BETWEEN_BURSTS - Seconds to wait between endpoint tests (default: 5)
#
# Note on Rate Limits:
#   - Rate limits are typically configured per-endpoint or per-user
#   - Common patterns:
#     * 10-20 requests/minute for read endpoints
#     * 5-10 requests/minute for write endpoints
#     * 2-5 requests/minute for expensive AI endpoints
#   - Adjust BURST_COUNT based on your app's rate limit configuration
#   - If tests don't trigger 429, increase BURST_COUNT or check rate limit config
# ============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
BURST_COUNT="${BURST_COUNT:-30}"
SLEEP_BETWEEN_BURSTS="${SLEEP_BETWEEN_BURSTS:-5}"

# Get JWT token
if [ -n "$1" ]; then
  JWT_TOKEN="$1"
fi

# Validate inputs
if [ -z "$JWT_TOKEN" ]; then
  echo -e "${RED}❌ Error: Missing JWT token${NC}"
  echo ""
  echo "Usage:"
  echo "  export JWT_TOKEN='your-jwt-token'"
  echo "  $0"
  echo ""
  echo "Or:"
  echo "  $0 'your-jwt-token'"
  echo ""
  echo "To get JWT token:"
  echo "  1. Open http://localhost:3000 in browser"
  echo "  2. Sign in"
  echo "  3. DevTools → Application → Local Storage → sb-*-auth-token"
  echo "  4. Copy 'access_token' value"
  exit 1
fi

# Test counters
ENDPOINTS_TESTED=0
ENDPOINTS_RATE_LIMITED=0
ENDPOINTS_NOT_LIMITED=0

echo "🚦 Testing API Rate Limiting"
echo "=========================================="
echo "Base URL: $API_BASE_URL"
echo "JWT Token: ${JWT_TOKEN:0:30}..."
echo "Burst Count: $BURST_COUNT requests"
echo "Sleep Between Tests: ${SLEEP_BETWEEN_BURSTS}s"
echo ""

# ============================================================================
# Helper Functions
# ============================================================================

# Make authenticated request
api_call() {
  local method=$1
  local endpoint=$2
  local body=$3

  if [ -n "$body" ]; then
    curl -s -w "\n%{http_code}" \
      -X "$method" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "${API_BASE_URL}${endpoint}" 2>/dev/null
  else
    curl -s -w "\n%{http_code}" \
      -X "$method" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      "${API_BASE_URL}${endpoint}" 2>/dev/null
  fi
}

# Extract HTTP status code from response
get_status() {
  echo "$1" | tail -n1
}

# Test endpoint with burst traffic
test_rate_limit() {
  local endpoint_name=$1
  local method=$2
  local endpoint=$3
  local body=$4

  ((ENDPOINTS_TESTED++))

  echo -e "${BLUE}Testing: ${endpoint_name}${NC}"
  echo "  Method: $method"
  echo "  Endpoint: $endpoint"
  echo -n "  Sending $BURST_COUNT requests... "

  local status_codes=()
  local rate_limited=0
  local success_count=0
  local error_count=0

  # Send burst traffic
  for ((i=1; i<=BURST_COUNT; i++)); do
    response=$(api_call "$method" "$endpoint" "$body")
    status=$(get_status "$response")
    status_codes+=("$status")

    if [ "$status" = "429" ]; then
      ((rate_limited++))
    elif [ "$status" = "200" ] || [ "$status" = "201" ]; then
      ((success_count++))
    else
      ((error_count++))
    fi

    # Show progress every 10 requests
    if [ $((i % 10)) -eq 0 ]; then
      echo -n "."
    fi
  done

  echo " Done"

  # Analyze results
  echo "  Results:"
  echo "    - 200/201 (Success): $success_count"
  echo "    - 429 (Rate Limited): $rate_limited"
  echo "    - Other errors: $error_count"

  # Determine if rate limiting is working
  if [ $rate_limited -gt 0 ]; then
    echo -e "  ${GREEN}✅ PASS${NC} - Rate limiting detected after $(( success_count )) requests"
    ((ENDPOINTS_RATE_LIMITED++))
  else
    echo -e "  ${YELLOW}⚠️  WARNING${NC} - No rate limiting detected (sent $BURST_COUNT requests)"
    echo "    This endpoint may not have rate limiting configured."
    echo "    Consider adding rate limits for production security."
    ((ENDPOINTS_NOT_LIMITED++))
  fi

  echo ""
}

# ============================================================================
# Test Cases
# ============================================================================

echo -e "${CYAN}🧪 Starting Rate Limit Tests${NC}"
echo "============================================"
echo ""

# ----------------------------------------------------------------------------
# Test 1: Journey Progress Endpoint (Medium Rate Limit Expected)
# ----------------------------------------------------------------------------

test_rate_limit \
  "Journey Plan (GET)" \
  "GET" \
  "/api/journey/plan" \
  ""

echo "Cooling down for ${SLEEP_BETWEEN_BURSTS}s..."
sleep "$SLEEP_BETWEEN_BURSTS"

# ----------------------------------------------------------------------------
# Test 2: Points Summary (Read Endpoint - Higher Rate Limit Expected)
# ----------------------------------------------------------------------------

test_rate_limit \
  "Points Summary (GET)" \
  "GET" \
  "/api/points/summary" \
  ""

echo "Cooling down for ${SLEEP_BETWEEN_BURSTS}s..."
sleep "$SLEEP_BETWEEN_BURSTS"

# ----------------------------------------------------------------------------
# Test 3: Meal Creation (Write Endpoint - Lower Rate Limit Expected)
# ----------------------------------------------------------------------------

meal_body='{"name":"Rate Limit Test Meal","calories":100,"date":"2025-11-18"}'
test_rate_limit \
  "Meal Creation (POST)" \
  "POST" \
  "/api/meals" \
  "$meal_body"

echo "Cooling down for ${SLEEP_BETWEEN_BURSTS}s..."
sleep "$SLEEP_BETWEEN_BURSTS"

# ----------------------------------------------------------------------------
# Test 4: AI Workout Generation (Expensive - Strictest Rate Limit Expected)
# ----------------------------------------------------------------------------

ai_workout_body='{"userInput":"Quick 20 min workout","difficulty":"medium"}'
test_rate_limit \
  "AI Workout Generation (POST)" \
  "POST" \
  "/api/ai/workout" \
  "$ai_workout_body"

echo "Cooling down for ${SLEEP_BETWEEN_BURSTS}s..."
sleep "$SLEEP_BETWEEN_BURSTS"

# ----------------------------------------------------------------------------
# Test 5: AI Nutrition Generation (Expensive - Strictest Rate Limit Expected)
# ----------------------------------------------------------------------------

ai_nutrition_body='{"userInput":"Healthy breakfast ideas","calorieTarget":400}'
test_rate_limit \
  "AI Nutrition Generation (POST)" \
  "POST" \
  "/api/ai/nutrition" \
  "$ai_nutrition_body"

# ============================================================================
# Results Summary
# ============================================================================

echo "============================================"
echo "Rate Limiting Test Results"
echo "============================================"
echo "Total Endpoints Tested: $ENDPOINTS_TESTED"
echo -e "Rate Limited (✅): ${GREEN}${ENDPOINTS_RATE_LIMITED}${NC}"
echo -e "Not Rate Limited (⚠️): ${YELLOW}${ENDPOINTS_NOT_LIMITED}${NC}"
echo ""

# Calculate percentage
if [ $ENDPOINTS_TESTED -gt 0 ]; then
  limited_percentage=$(( (ENDPOINTS_RATE_LIMITED * 100) / ENDPOINTS_TESTED ))
  echo "Rate Limit Coverage: ${limited_percentage}%"
  echo ""
fi

# Final assessment
if [ $ENDPOINTS_NOT_LIMITED -eq 0 ]; then
  echo -e "${GREEN}🎉 All endpoints have rate limiting!${NC}"
  echo "✅ Your API is protected against burst traffic abuse"
  exit 0
elif [ $ENDPOINTS_RATE_LIMITED -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Partial rate limiting detected${NC}"
  echo "Some endpoints may be vulnerable to abuse."
  echo ""
  echo "Recommendations:"
  echo "  1. Add rate limiting middleware to all API routes"
  echo "  2. Use different limits for different endpoint types:"
  echo "     - Read endpoints: 20-60 requests/minute"
  echo "     - Write endpoints: 10-20 requests/minute"
  echo "     - AI endpoints: 2-5 requests/minute"
  echo "  3. Consider using Vercel's Edge Config or Upstash Redis for rate limiting"
  echo "  4. Implement per-user rate limits based on subscription tier"
  exit 1
else
  echo -e "${RED}❌ No rate limiting detected!${NC}"
  echo "🚨 Your API is vulnerable to abuse and DoS attacks"
  echo ""
  echo "CRITICAL: Implement rate limiting immediately:"
  echo "  1. Install rate limiting package:"
  echo "     npm install @upstash/ratelimit @upstash/redis"
  echo "  2. Create middleware in apps/web/lib/rate-limit.ts"
  echo "  3. Apply to all API routes in apps/web/app/api/**/route.ts"
  echo "  4. Configure appropriate limits per endpoint type"
  echo ""
  echo "Example limits:"
  echo "  - GET /api/meals: 60 req/min"
  echo "  - POST /api/meals: 20 req/min"
  echo "  - POST /api/ai/*: 5 req/min"
  exit 1
fi
