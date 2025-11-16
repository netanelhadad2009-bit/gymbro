# Meal Tracking Implementation Guide

## Overview
This implementation adds an AI-powered meal tracking feature to the GymBro nutrition app, allowing users to:
1. Add meals manually with macros
2. Scan meals from photos using AI (GPT-4o Vision)
3. Track consumed calories and macros throughout the day

## Features Implemented

### 1. Floating Action Button (FAB)
- **Location**: `/components/nutrition/FloatingAddMealButton.tsx`
- **Features**:
  - Animated FAB with rotation on open
  - Two action options: Manual entry & Photo scan
  - Mobile-optimized with proper touch targets
  - RTL-friendly Hebrew UI

### 2. Manual Meal Entry
- **Location**: `/app/(app)/nutrition/add-manual/page.tsx`
- **Features**:
  - Form for meal name (required) and calories (required)
  - Optional macro inputs (protein, carbs, fat)
  - Saves to Supabase via API
  - Back navigation to nutrition page

### 3. AI Vision Meal Analysis
- **Endpoint**: `/app/api/ai/vision/nutrition/route.ts`
- **Features**:
  - Accepts image upload via multipart/form-data
  - Uses GPT-4o to analyze food and estimate macros
  - Returns meal name, calories, protein, carbs, fat, and confidence level
  - Automatically saves to Supabase with image URL
  - Stores images in Supabase Storage bucket

### 4. Database Schema
- **Migration**: `/supabase/migrations/007_meals_table.sql`
- **Table**: `public.meals`
- **Fields**:
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `date` (date)
  - `name` (text)
  - `calories` (integer)
  - `protein`, `carbs`, `fat` (integer, optional)
  - `source` ('manual' or 'ai_vision')
  - `image_url` (text, optional)
  - `confidence` (integer, 0-100, for AI scans)
  - Timestamps

### 5. Meals API
- **Endpoint**: `/app/api/meals/route.ts`
- **Methods**:
  - `GET`: Fetch user's meals for a specific date
  - `POST`: Create a new manual meal
  - `DELETE`: Remove a meal

### 6. User Meals Display
- **Component**: `/components/nutrition/UserMealsList.tsx`
- **Features**:
  - Shows all user-added meals
  - Differentiates between manual and AI-scanned meals
  - Shows confidence level for AI meals
  - Delete functionality
  - Image preview for scanned meals

## Testing Instructions

### 1. Run Database Migration
```bash
# Apply the meals table migration to your Supabase instance
# This can be done via Supabase Dashboard or CLI
```

### 2. Start Development Server
```bash
cd /Users/netanelhadad/Projects/gymbro
pnpm --filter @gymbro/web dev
```

### 3. Test Manual Meal Entry
1. Navigate to `/nutrition`
2. Click the green "+" FAB button in the bottom right
3. Select "הוסף ארוחה ידנית" (Add meal manually)
4. Fill in the form:
   - Meal name: "סלט עוף" (Chicken salad)
   - Calories: 350
   - Protein: 40g
   - Carbs: 15g
   - Fat: 12g
5. Click "שמור" (Save)
6. Verify the meal appears in the nutrition page

### 4. Test AI Photo Scanning
1. Click the green "+" FAB button
2. Select "סרוק ארוחה מתמונה" (Scan meal from photo)
3. On mobile: Camera/gallery picker will open
4. On desktop: File picker will open
5. Select a food image
6. Wait for AI analysis (loading screen appears)
7. Verify the meal is added with AI-estimated macros

### 5. Test Meal Deletion
1. Find a user-added meal in the list
2. Click the red trash icon
3. Confirm deletion
4. Verify meal is removed from list

### 6. Verify Macro Calculations
- Check that consumed calories/macros update when:
  - Toggling plan meals as eaten
  - Adding new user meals
  - Deleting user meals

## Mobile Testing

### iOS Safari
1. Open the app in Safari on iPhone
2. Test camera access by clicking FAB → "Scan meal"
3. Should open camera roll or camera

### Android Chrome
1. Open the app in Chrome on Android
2. Test camera access
3. Should allow choosing between camera and gallery

### PWA/WebView
- The implementation uses standard HTML5 file input with `accept="image/*"`
- Works in React Native WebView
- Works as PWA

## Environment Variables Required
```env
# OpenAI for Vision API
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL_NUTRITION=gpt-4o

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Known Limitations
1. Image uploads are limited to reasonable file sizes
2. AI analysis takes 2-5 seconds
3. Confidence levels vary based on image quality
4. Hebrew meal names work best but English is supported

## Future Enhancements
- Barcode scanning for packaged foods
- Meal history and favorites
- Weekly/monthly nutrition reports
- Social sharing of meals
- Recipe suggestions based on remaining macros

## Troubleshooting

### Issue: Camera doesn't open on mobile
**Solution**: Ensure the app is served over HTTPS or localhost

### Issue: AI analysis fails
**Solution**: Check OpenAI API key and quota

### Issue: Meals not saving
**Solution**: Verify Supabase connection and RLS policies

### Issue: Images not uploading
**Solution**: Check Supabase Storage bucket permissions

## Success Metrics
- ✅ FAB appears and animates correctly
- ✅ Manual meal entry saves to database
- ✅ Photo upload triggers AI analysis
- ✅ AI returns reasonable macro estimates
- ✅ User meals display with proper styling
- ✅ Delete functionality works
- ✅ Macros recalculate on changes
- ✅ Mobile camera/gallery access works
- ✅ Loading states show during async operations

## Code Quality
- TypeScript throughout
- Modular component structure
- Error handling at all levels
- Loading states for better UX
- RTL Hebrew support
- Mobile-first responsive design