#!/bin/bash

echo "==================================="
echo "Nutrition Flow Diagnostic Test"
echo "==================================="
echo ""

USER_ID="${1:-16e075a7-08aa-4d75-806c-8b5ac36b867b}"
echo "Testing for User ID: $USER_ID"
echo ""

echo "Step 1: Check if migration was applied"
echo "--------------------------------------"
echo "Run this in Supabase Studio SQL editor:"
echo ""
echo "SELECT column_name, data_type"
echo "FROM information_schema.columns"
echo "WHERE table_name='profiles'"
echo "  AND column_name IN ('nutrition_plan', 'nutrition_status', 'nutrition_calories', 'nutrition_fingerprint', 'nutrition_updated_at');"
echo ""
echo "Expected: 5 rows returned"
echo ""

echo "Step 2: Check user's nutrition data"
echo "-----------------------------------"
echo "Run this in Supabase Studio SQL editor:"
echo ""
echo "SELECT"
echo "  id,"
echo "  nutrition_status,"
echo "  nutrition_fingerprint,"
echo "  nutrition_calories,"
echo "  jsonb_typeof(nutrition_plan) AS plan_type,"
echo "  nutrition_updated_at"
echo "FROM public.profiles"
echo "WHERE id = '$USER_ID';"
echo ""
echo "Expected outcomes:"
echo "  - If nutrition_status='ready' and plan_type='object': SUCCESS"
echo "  - If nutrition_status='pending' and plan_type=null: TIMEOUT (need retry)"
echo "  - If row not found: User doesn't exist in database"
echo ""

echo "Step 3: Check server logs for attach route activity"
echo "---------------------------------------------------"
echo "In the terminal where 'pnpm dev' is running, search for:"
echo ""
echo "  [Attach] POST user=${USER_ID:0:8}"
echo ""
echo "Look for these log patterns:"
echo "  ✅ Success: [Attach] Plan saved (fingerprint: ...)"
echo "  ⏱️  Timeout: [Attach] Marked pending (fingerprint: ...)"
echo "  ❌ Error: [Attach] Failed to ... OR [Attach] Fatal error: ..."
echo ""

echo "Step 4: Check Xcode logs for signup flow"
echo "----------------------------------------"
echo "Look for these logs in Xcode console:"
echo ""
echo "  [Signup] Draft found: YES"
echo "  [Signup] Calling attach route... {fingerprint: \"...\", status: \"pending\", hasPlan: false}"
echo "  [Signup] Attach route responded with status: 200"
echo "  [Signup] Attach response data: {...}"
echo ""
echo "If you DON'T see these logs:"
echo "  → The new code hasn't been deployed to the device yet"
echo "  → Rebuild and reinstall the app"
echo ""

echo "Step 5: Verify OpenAI API configuration"
echo "---------------------------------------"
cd /Users/netanelhadad/Projects/gymbro/apps/web

if [ -f ".env.local" ]; then
  if grep -q "OPENAI_API_KEY" .env.local; then
    echo "✅ OPENAI_API_KEY found in .env.local"
    
    # Check if key starts with sk-
    KEY=$(grep OPENAI_API_KEY .env.local | cut -d= -f2 | tr -d '"' | tr -d ' ')
    if [[ $KEY == sk-* ]]; then
      echo "✅ API key format looks correct (starts with sk-)"
    else
      echo "⚠️  API key doesn't start with 'sk-' - may be invalid"
    fi
  else
    echo "❌ OPENAI_API_KEY not found in .env.local"
    echo "   Add: OPENAI_API_KEY=\"sk-...\""
  fi
else
  echo "❌ .env.local file not found"
fi

echo ""
echo "==================================="
echo "Next Actions"
echo "==================================="
echo ""
echo "1. Verify migration applied (Step 1 SQL)"
echo "2. Check user's nutrition data (Step 2 SQL)"
echo "3. Check server terminal logs (Step 3)"
echo "4. Rebuild and test fresh signup flow"
echo "5. Report findings with:"
echo "   - Xcode logs showing new [Signup] Calling attach route... logs"
echo "   - Server logs showing [Attach] ... logs"
echo "   - Database state from Step 2 SQL"
echo ""

