#!/bin/bash

# Test Journey API Endpoints
# This script tests the journey progression logic

API_URL="http://localhost:3000/api/journey"

echo "🧪 Testing Journey API..."
echo "========================="
echo ""

# Test GET /api/journey
echo "📍 Testing GET /api/journey"
response=$(curl -s -X GET "$API_URL" \
  -H "Content-Type: application/json")

# Check if response is successful
if echo "$response" | grep -q '"ok":true'; then
  echo "✅ API Response successful"

  # Extract some data
  chapters=$(echo "$response" | grep -o '"chapters":\[[^]]*\]' | head -1)
  points=$(echo "$response" | grep -o '"total_points":[0-9]*' | head -1)
  badges=$(echo "$response" | grep -o '"total_badges":[0-9]*' | head -1)

  echo "📊 Data received:"
  echo "   $points"
  echo "   $badges"

  # Check for node states
  if echo "$response" | grep -q '"state":"ACTIVE"'; then
    echo "✅ Found ACTIVE nodes"
  fi

  if echo "$response" | grep -q '"state":"LOCKED"'; then
    echo "✅ Found LOCKED nodes"
  fi

  if echo "$response" | grep -q '"state":"COMPLETED"'; then
    echo "✅ Found COMPLETED nodes"
  else
    echo "ℹ️  No COMPLETED nodes yet"
  fi

else
  echo "❌ API Response failed"
  echo "$response"
fi

echo ""
echo "========================="
echo "🎯 Journey API Test Complete"