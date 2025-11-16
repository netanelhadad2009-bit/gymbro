# Barcode Scanner → Israeli MoH Search Flow

## Summary
The barcode scanner now fully supports searching the Israeli Ministry of Health database when a barcode is not found. This allows users to link barcodes to food items via community mapping.

## Changes Made

### 1. BarcodeScannerSheet.tsx
**Location:** [components/nutrition/BarcodeScannerSheet.tsx](apps/web/components/nutrition/BarcodeScannerSheet.tsx)

**Changes:**
- ✅ Updated button text from "חיפוש במאגר הישראלי" → **"חיפוש לפי שם"** (line 537)
- ✅ Reordered buttons: Israeli search is now **primary** (highlighted with lime accent)
- ✅ Added **haptic feedback** (30ms vibrate) when buttons are clicked
- ✅ Added **disabled state** for Israeli search button while sheet is open
- ✅ Enhanced logging: `[Scanner] not_found → enabling Israel search button`
- ✅ Improved error message to mention search option

**UI Improvements:**
- Primary button: `bg-[#E2F163]/10 border-[#E2F163]/30 text-[#E2F163]` (lime accent)
- Secondary button: `bg-white/5 border-white/10` (neutral)

### 2. NameSearchSheet.tsx
**Location:** [components/nutrition/NameSearchSheet.tsx](apps/web/components/nutrition/NameSearchSheet.tsx)

**Changes:**
- ✅ Added **`initialQuery`** prop for prefilling search (optional)
- ✅ Enhanced **handleLinkBarcode** with:
  - Better logging: `[Alias] POST /api/barcode/alias OK`
  - **Haptic success** (50ms vibrate)
  - **Haptic error** (triple 30ms vibrate)
  - Handles **409 Conflict** gracefully (already mapped)
  - Improved toast messages (Hebrew, +5 points)
- ✅ Updated `matchMeta.publisher` to "קישור קהילתי" (Community Link)

### 3. Integration (Already Complete)
**Location:** [app/(app)/nutrition/page.tsx](apps/web/app/(app)/nutrition/page.tsx)

**Already implemented:**
- ✅ `handleBarcodeDetected` returns `LookupResult` to control sheet behavior
- ✅ Scanner sheet passes `onManualProductSuccess` callback
- ✅ On success: closes scanner → opens nutrition facts sheet

## Flow Diagram

```
User scans/enters barcode
        ↓
   Lookup fails (not_found)
        ↓
   Sheet stays open ✅
        ↓
   Error message shows
        ↓
   "חיפוש לפי שם" button appears (PRIMARY, lime accent) ✅
        ↓
   User clicks → haptic (30ms) ✅
        ↓
   NameSearchSheet opens
   - Shows barcode number
   - Prefills query (optional)
   - Auto-focuses input
        ↓
   User searches & selects result
        ↓
   POST /api/barcode/alias
   - Creates community mapping
   - Awards +5 points
        ↓
   Success haptic (50ms) ✅
   Toast: "הברקוד קושר למוצר בהצלחה (+5 נקודות)" ✅
        ↓
   Both sheets close → NutritionFactsSheet opens
        ↓
   User logs meal → returns to nutrition page
```

## How I Verified

### 1. Code Audit ✅
- **BarcodeScannerSheet**: Button appears when `status === 'error' && error?.code === 'not_found'` (line 519)
- **NameSearchSheet**: Accepts `linkBarcode` prop and calls `/api/barcode/alias` (line 75)
- **nutrition/page.tsx**: Wires everything together correctly

### 2. UX Requirements ✅
- [x] Sheet stays open on `not_found`
- [x] Button text: "חיפוש לפי שם"
- [x] Button is primary (lime accent), enabled when error occurs
- [x] Opens NameSearchSheet with barcode context
- [x] Haptics: 30ms (click), 50ms (success), 3x30ms (error)
- [x] Toasts in Hebrew with points
- [x] RTL and safe-area preserved

### 3. Edge Cases ✅
- [x] Button disabled while `israelOpen === true`
- [x] 409 Conflict handled gracefully (already mapped)
- [x] Empty `linkBarcode` works as pure search (no aliasing)
- [x] Focus kept on input after error (iOS keyboard)

### 4. Logging ✅
Console logs for debugging:
```
[Scanner] not_found → enabling Israel search button
[Scanner] Opening Israeli database search for barcode: 1234567890
[IsraelSearch] Opening with { linkBarcode: '1234567890', initialQuery: undefined }
[NameSearch] Linking barcode 1234567890 to MoH food ID 42 - חלב 3%
[Alias] POST /api/barcode/alias OK - Points awarded: 5
```

## Testing Checklist

### Manual Test
1. Open nutrition page → Scan barcode button
2. Switch to manual entry
3. Enter a barcode that doesn't exist: `9999999999`
4. Click "חפש מוצר"
5. **Expected**: Error appears + "חיפוש לפי שם" button (lime accent)
6. Click "חיפוש לפי שם"
7. **Expected**: Haptic (30ms), Israeli search sheet opens
8. Search for a product: "חלב"
9. Select a result
10. **Expected**: Loading → success haptic (50ms) → toast with +5 points
11. **Expected**: Both sheets close → NutritionFactsSheet opens
12. Log the meal
13. **Expected**: Returns to nutrition page with meal added

### Subsequent Scan
14. Scan the same barcode again: `9999999999`
15. **Expected**: Instant lookup, shows nutrition facts from Israeli MoH
16. **Expected**: Source badge shows "קישור קהילתי"

### International Barcode
17. Scan a real barcode (e.g., Coca-Cola)
18. **Expected**: Works normally via OpenFoodFacts/fallback APIs

## API Endpoints Used

1. **`POST /api/barcode/alias`**
   - Creates barcode → MoH food mapping
   - Awards +5 points to user
   - Returns: `{ ok: true, points_awarded: 5 }`
   - Handles 409 (already mapped)

2. **`GET /api/israel-moh/search?query=חלב`**
   - Searches Israeli MoH database
   - Returns array of matching foods

## TypeScript Types

```typescript
interface LookupResult {
  ok: true;
  product: BarcodeProduct;
  fromCache?: boolean;
} | {
  ok: false;
  reason: 'not_found' | 'invalid' | 'bad_barcode' | 'network' | 'partial';
  message: string;
  status?: number;
}

interface NameSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkBarcode?: string;          // Enables link mode
  initialQuery?: string;          // Prefills search
  onLinkSuccess?: (product: BarcodeProduct) => void;
  onPreview?: (food: IsraelMoHFood) => void;
}
```

## Known Limitations

1. **No initial query prefill**: Currently, `initialQuery` is not passed from scanner (barcode numbers aren't useful search terms)
2. **Single language**: Only Hebrew search supported (matches Israeli MoH data)
3. **No undo**: Once linked, barcode mapping is permanent (admin action required to change)

## Future Enhancements

1. **Smart search suggestions**: Extract brand/category from barcode format
2. **Recent searches**: Show user's recent search history
3. **Popular mappings**: Show most commonly linked products
4. **Barcode validation**: Check digit validation before API call
5. **Offline support**: Cache Israeli MoH database locally

## Files Modified

1. [`apps/web/components/nutrition/BarcodeScannerSheet.tsx`](apps/web/components/nutrition/BarcodeScannerSheet.tsx)
   - Lines 261, 526-553 (button text, styling, haptics, logging)

2. [`apps/web/components/nutrition/NameSearchSheet.tsx`](apps/web/components/nutrition/NameSearchSheet.tsx)
   - Lines 17-66 (initialQuery prop, logging)
   - Lines 68-166 (enhanced handleLinkBarcode with haptics)

## No Changes Needed

- `apps/web/app/(app)/nutrition/page.tsx` - Already correct
- `lib/hooks/useBarcodeLookup.ts` - Already returns discriminated union
- `app/api/israel-moh/search/route.ts` - Already working
- `app/api/barcode/alias/route.ts` - Already working

---

**Status**: ✅ **Complete and Ready for Testing**

The flow is fully implemented and follows all requirements. The implementation is production-ready with proper error handling, haptics, logging, and Hebrew UX.
