# FatSecret Fallback & Manual Product Entry - Test Plan

## Overview
Tests for barcode lookup fallback system and manual product entry feature.

## Prerequisites
1. FatSecret API credentials configured in `.env.local`:
   ```
   FATSECRET_CLIENT_ID=your_client_id
   FATSECRET_CLIENT_SECRET=your_client_secret
   ```

2. Database migration applied:
   ```bash
   # Run the migration
   psql $DATABASE_URL -f apps/web/supabase/migrations/018_add_user_foods_and_points.sql
   ```

3. Dev server running:
   ```bash
   pnpm --filter @gymbro/web dev
   ```

## Test Cases

### Case A: Open Food Facts Not Found → FatSecret Found
**Goal**: Verify fallback to FatSecret when OFF returns not_found

**Steps**:
1. Navigate to `/nutrition`
2. Click barcode scanner button
3. Click "הקלדה ידנית של ברקוד" (Manual entry)
4. Enter a barcode that exists in FatSecret but not in Open Food Facts:
   - Example: `012000161551` (US product)
5. Click "חיפוש מוצר"

**Expected**:
- Loading spinner shows for minimum 300ms
- FatSecret API is called (check console for `[FatSecret]` logs)
- Product found and cached with `source: 'fatsecret'`
- NutritionFactsSheet opens showing:
  - Product name and brand
  - "מקור: FatSecret" badge
  - Nutrition data per 100g
  - If data is partial: orange warning banner
- Can add to calendar successfully

**Console Logs to Check**:
```
[BarcodeAPI] Product not found in OFF
[BarcodeAPI] Trying FatSecret fallback
[FatSecret] Searching for barcode
[FatSecret] Found food_id
[BarcodeAPI] FatSecret found product
```

---

### Case B: Neither Found → Manual Product Entry
**Goal**: Verify manual product sheet opens when all APIs fail

**Steps**:
1. Navigate to `/nutrition`
2. Click barcode scanner
3. Enter barcode: `9999999999999` (fake barcode)
4. Click "חיפוש מוצר"

**Expected**:
- Error appears: "המוצר לא נמצא"
- Toast shows error message
- Sheet stays open (doesn't close)
- Two secondary buttons appear:
  - "הוספת מוצר ידני" (Add manual product)
  - "חיפוש לפי שם" (Search by name)

**Then**:
5. Click "הוספת מוצר ידני"

**Expected**:
- ManualProductSheet opens
- Barcode field is pre-filled with `9999999999999`
- All other fields are empty
- Form validation works:
  - Product name required
  - Nutrition values must be 0-9999
  - Serving size 1-10000g

---

### Case C: Manual Product Save → Points + Sheet Opens
**Goal**: Verify complete manual product flow

**Steps**:
1. Open ManualProductSheet (from Case B above)
2. Fill in form:
   ```
   שם המוצר: בננה
   מותג: (leave empty)
   ברקוד: 9999999999999
   גודל מנה: 100
   קלוריות: 89
   חלבון: 1
   פחמימות: 23
   שומן: 0
   ```
3. Verify live preview shows correct macros
4. Click "שמור מוצר"

**Expected**:
- Loading state: "שומר..."
- Success toast: "המוצר נוסף בהצלחה! הרווחת +5 נקודות"
- Haptic feedback (vibrate)
- ManualProductSheet closes
- BarcodeScannerSheet closes
- NutritionFactsSheet opens with the created product:
  - Shows "מקור: הוסף ידנית"
  - Shows nutrition data
  - Can select portion and meal type
  - Can add to calendar

**Database Checks**:
```sql
-- Product was created
SELECT * FROM user_foods WHERE name_he = 'בננה';

-- Points awarded
SELECT * FROM points_events
WHERE reason = 'manual_food_add'
ORDER BY created_at DESC LIMIT 1;
```

Expected points event:
```json
{
  "points": 5,
  "reason": "manual_food_add",
  "meta_json": {
    "food_id": "...",
    "food_name": "בננה",
    "barcode": "9999999999999"
  }
}
```

---

### Case D: Invalid Barcode → Inline Error
**Goal**: Verify validation prevents API calls for bad input

**Steps**:
1. Open barcode scanner manual entry
2. Enter: `123` (too short)
3. Click "חיפוש מוצר"

**Expected**:
- Error appears immediately (no API call)
- Message: "ברקוד לא תקין. יש להקליד 8–14 ספרות"
- Sheet stays open
- Input stays focused (iOS)
- No toast notification

**Then**:
4. Change to: `12345abc789` (contains letters)
5. Input should auto-filter to `12345789` (numbers only)

---

### Case E: Partial Data → Warning Banner
**Goal**: Verify partial data indicator shows when FatSecret returns incomplete info

**Steps**:
1. Find a barcode that returns partial data from FatSecret
   (Product with unknown serving size)
2. Enter barcode
3. Click search

**Expected**:
- Product found from FatSecret
- NutritionFactsSheet shows orange banner:
  - Icon: AlertCircle
  - Title: "נתונים חלקיים"
  - Message: "חלק מהמידע התזונתי חסר או משוער..."
- `product.isPartial === true`
- Still allows adding to calendar

---

### Case F: Israeli Barcode (729 prefix)
**Goal**: Verify Israeli barcode handling

**Steps**:
1. Enter Israeli barcode: `7290004120896`
2. Click search

**Expected**:
- Check digit validation bypassed (Israeli barcodes often have incorrect check digits)
- Console log: `[BarcodeAPI] Israeli barcode with invalid check digit (bypassing)`
- Lookup proceeds normally

---

### Case G: Cache Behavior
**Goal**: Verify caching works for all sources

**Steps**:
1. Search for barcode from FatSecret (Case A)
2. Note the request time
3. Search for same barcode again

**Expected**:
- Second search returns instantly from cache
- No FatSecret API call
- Console: `[BarcodeAPI] Cache hit: ... fatsecret`
- Product still shows correctly

**Database Check**:
```sql
SELECT barcode, source, is_partial, updated_at
FROM food_cache
WHERE barcode = '012000161551';
```

---

### Case H: Source Badge Display
**Goal**: Verify source badges appear correctly

**Test Different Sources**:

1. **Open Food Facts**:
   - Barcode: `3017620422003` (Nutella)
   - Expected badge: "Open Food Facts"

2. **FatSecret**:
   - Any US barcode found in FatSecret
   - Expected badge: "FatSecret"

3. **Manual**:
   - Manually created product (Case C)
   - Expected badge: "הוסף ידנית"

4. **Cache**:
   - Re-scan cached product
   - Badge should show original source (not "cache")

---

## Error Scenarios

### Network Error
**Steps**:
1. Disconnect internet
2. Try barcode lookup

**Expected**:
- Error after timeout (10s)
- Message: "בעיית חיבור. בדקו אינטרנט ונסו שוב"
- Sheet stays open

### FatSecret Credentials Missing
**Steps**:
1. Remove `FATSECRET_CLIENT_ID` from .env
2. Restart server
3. Try lookup for barcode not in OFF

**Expected**:
- Console error: `[FatSecret] Missing credentials`
- Falls back to "not_found" (doesn't crash)
- Manual product option appears

---

## Performance Checks

1. **Minimum Feedback Time**:
   - All lookups show loading for at least 300ms
   - Even cached results wait 300ms

2. **FatSecret Token Caching**:
   - First request gets token
   - Subsequent requests reuse cached token (50 min TTL)
   - Check console: "Using cached token"

3. **Concurrent Request Deduplication**:
   - Rapidly search same barcode 3x
   - Only 1 API call should be made
   - All 3 return same result

---

## Accessibility

1. **RTL Layout**:
   - All text aligns right
   - Input fields RTL
   - Buttons in correct order

2. **iOS Keyboard**:
   - Sheet uses 100dvh
   - Input stays focused after error
   - Toast appears above keyboard
   - Safe area insets respected

3. **Haptic Feedback**:
   - Success: Short vibrate (50ms)
   - Error: Triple vibrate (30ms x 3)
   - Manual product created: Double vibrate

---

## Database Integrity

After running all tests, verify:

```sql
-- All user_foods have valid data
SELECT id, name_he, per_100g
FROM user_foods
WHERE per_100g->>'kcal' IS NULL OR per_100g->>'protein_g' IS NULL;
-- Should return 0 rows

-- All points events are valid
SELECT * FROM points_events
WHERE points < 0 OR points > 100;
-- Should return 0 rows

-- RLS works
-- Try to query as different user - should see only own data
```

---

## Cleanup

After testing:

```sql
-- Remove test data
DELETE FROM user_foods WHERE barcode = '9999999999999';
DELETE FROM points_events WHERE meta_json->>'food_name' = 'בננה';
DELETE FROM food_cache WHERE barcode = '9999999999999';
```

---

## Notes for Developers

- All console logs use prefixes: `[FatSecret]`, `[BarcodeAPI]`, `[ManualProduct]`
- Errors never throw to client - always return discriminated union
- Hebrew error messages are user-facing
- English logs are for debugging
- All database writes use RLS (user_id = auth.uid())
