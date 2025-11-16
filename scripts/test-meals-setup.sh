#!/bin/bash

# Test if meals feature is properly set up

echo "🍽️  Testing Meals Setup"
echo "======================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the current IP
IP=$(./scripts/get-ip.sh 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

echo "📱 Testing from device perspective..."
echo "Server URL: http://$IP:3000"
echo ""

# Test server connection
echo "1. Testing server connection..."
if curl -s -o /dev/null -w "%{http_code}" "http://$IP:3000" | grep -q "200\|300\|301\|302"; then
    echo -e "${GREEN}✅ Server is accessible${NC}"
else
    echo -e "${RED}❌ Server is not accessible${NC}"
    echo "   Make sure the dev server is running: pnpm --filter @gymbro/web dev"
    exit 1
fi

# Test API endpoint
echo ""
echo "2. Testing API endpoints..."
if curl -s -o /dev/null -w "%{http_code}" "http://$IP:3000/api/health" | grep -q "200\|404"; then
    echo -e "${GREEN}✅ API routes are accessible${NC}"
else
    echo -e "${YELLOW}⚠️  API routes may not be accessible${NC}"
fi

# Check if required files exist
echo ""
echo "3. Checking required files..."

FILES_TO_CHECK=(
    "apps/web/app/api/ai/vision/nutrition/route.ts"
    "apps/web/components/nutrition/FloatingAddMealButton.tsx"
    "apps/web/app/(app)/nutrition/add-manual/page.tsx"
    "apps/web/lib/types/meal.ts"
    "CREATE_MEALS_TABLE.sql"
)

ALL_GOOD=true
for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ Missing: $file${NC}"
        ALL_GOOD=false
    fi
done

# Environment check
echo ""
echo "4. Checking environment..."
if [ -f "apps/web/.env.local" ] || [ -f "apps/web/.env.development" ]; then
    echo -e "${GREEN}✅ Environment file exists${NC}"

    # Check for OpenAI key
    if grep -q "OPENAI_API_KEY" apps/web/.env.local 2>/dev/null || grep -q "OPENAI_API_KEY" apps/web/.env.development 2>/dev/null; then
        echo -e "${GREEN}✅ OpenAI API key is configured${NC}"
    else
        echo -e "${YELLOW}⚠️  OpenAI API key not found - AI scanning won't work${NC}"
        echo "   Add OPENAI_API_KEY to your .env.local file"
    fi

    # Check for Supabase keys
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" apps/web/.env.local 2>/dev/null || grep -q "NEXT_PUBLIC_SUPABASE_URL" apps/web/.env.development 2>/dev/null; then
        echo -e "${GREEN}✅ Supabase is configured${NC}"
    else
        echo -e "${RED}❌ Supabase not configured${NC}"
        echo "   Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    fi
else
    echo -e "${RED}❌ No environment file found${NC}"
    echo "   Create apps/web/.env.local with your API keys"
fi

# Final summary
echo ""
echo "======================="
if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✅ All files are in place!${NC}"
    echo ""
    echo "📝 Next steps:"
    echo "1. Run the SQL script in Supabase:"
    echo "   - Open Supabase Dashboard → SQL Editor"
    echo "   - Paste contents of CREATE_MEALS_TABLE.sql"
    echo "   - Click Run"
    echo ""
    echo "2. Test on your iPhone:"
    echo "   - Open the app"
    echo "   - Go to Nutrition tab"
    echo "   - Tap the + button"
    echo "   - Try scanning a meal!"
else
    echo -e "${YELLOW}⚠️  Some files are missing${NC}"
    echo "Check the missing files above"
fi

echo ""
echo "💡 Tip: After setting up Supabase, you can verify with:"
echo "   npx supabase db dump --data-only --table meals"