#!/bin/bash

echo "🧪 Testing Barcode Lookup API Directly"
echo "======================================="
echo ""

# Test 1: Valid Israeli barcode
echo "1. Testing valid Israeli barcode (729 prefix)..."
curl -X POST http://localhost:3000/api/barcode/lookup \
  -H "Content-Type: application/json" \
  -d '{"barcode": "7290000156668"}' \
  -w "\nHTTP Status: %{http_code}\n" | jq '.'
echo ""

# Test 2: Non-existent barcode (will be cached as "not found")
echo "2. Testing non-existent barcode..."
curl -X POST http://localhost:3000/api/barcode/lookup \
  -H "Content-Type: application/json" \
  -d '{"barcode": "1234567890128"}' \
  -w "\nHTTP Status: %{http_code}\n" | jq '.'
echo ""

# Test 3: Invalid barcode (wrong check digit)
echo "3. Testing invalid barcode (bad check digit)..."
curl -X POST http://localhost:3000/api/barcode/lookup \
  -H "Content-Type: application/json" \
  -d '{"barcode": "1234567890123"}' \
  -w "\nHTTP Status: %{http_code}\n" | jq '.'
echo ""

# Test 4: Too short barcode
echo "4. Testing too short barcode..."
curl -X POST http://localhost:3000/api/barcode/lookup \
  -H "Content-Type: application/json" \
  -d '{"barcode": "123"}' \
  -w "\nHTTP Status: %{http_code}\n" | jq '.'
echo ""

echo "✅ Tests completed. Check server logs for detailed logging."