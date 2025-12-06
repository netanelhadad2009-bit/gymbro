# Nutrition Edit Feature

## Overview

This feature adds the ability to edit logged nutrition entries directly from the daily nutrition page using a bottom sheet interface. Users can modify the portion size of logged food items, and the macros/calories are automatically recalculated.

## Files Changed

### API Changes

- **`apps/web/app/api/meals/route.ts`**
  - Extended `UpdateMealSchema` to include `portion_grams` field
  - The PATCH endpoint now supports updating portion size along with macros

### New Components

- **`apps/web/components/nutrition/EditLoggedFoodSheet.tsx`**
  - New bottom sheet component for editing logged food entries
  - Uses Radix UI Dialog (same pattern as `NutritionFactsSheet`)
  - Features:
    - Displays current portion and macros
    - Numeric input for new portion size
    - Quick portion buttons (50g, 100g, 150g, 200g, 250g)
    - Real-time macro recalculation preview
    - Save/Cancel buttons with loading state
    - Error handling with inline error display
  - Exports `LoggedMealEntry` type for use in parent components

### Modified Components

- **`apps/web/components/nutrition/UserMealsList.tsx`**
  - Added `onClickEntry` prop to handle tap/click on meal cards
  - Exported `UserMeal` type for use in parent components
  - Added `portion_grams` and `brand` to `UserMeal` type
  - Added `stopPropagation` to all interactive elements (edit/delete buttons, inputs)
  - Meal cards are now clickable and trigger the edit sheet

- **`apps/web/app/(app)/nutrition/NutritionPageClient.tsx`**
  - Added state for edit sheet visibility (`showEditSheet`)
  - Added state for selected meal (`selectedMealForEdit`)
  - Added `handleClickMealEntry` handler to open edit sheet
  - Added `handleMealUpdated` handler for optimistic UI updates
  - Integrated `EditLoggedFoodSheet` component
  - Passed `onClickEntry` prop to `UserMealsList`

## Flow

1. **User taps a logged food entry** in the UserMealsList
   - `onClickEntry` is called with the meal data
   - `handleClickMealEntry` converts `UserMeal` to `LoggedMealEntry`
   - Sets `selectedMealForEdit` and `showEditSheet` state

2. **Edit sheet opens** with current food details
   - Shows food name and brand (if available)
   - Displays current portion size and macros
   - Pre-fills the portion input with current value

3. **User modifies the portion**
   - Can type a custom value or use quick portion buttons
   - Macros are recalculated in real-time based on per-100g values
   - Per-100g values are derived from: `(currentMacro / currentPortion) * 100`

4. **User saves changes**
   - API call: `PATCH /api/meals?id={mealId}`
   - Body includes: `calories`, `protein`, `carbs`, `fat`, `portion_grams`
   - On success:
     - Haptic feedback (if available)
     - `onUpdated` callback with new values
     - Sheet closes automatically
   - On failure:
     - Error message displayed inline
     - Sheet stays open for retry

5. **Optimistic UI update**
   - `handleMealUpdated` updates local `userMeals` state immediately
   - Daily totals recalculate automatically (computed from state)
   - No need to refetch from server

## Security

- RLS (Row Level Security) is respected - users can only update their own meals
- The PATCH endpoint validates user ownership: `.eq("user_id", user.id)`
- Rate limiting is applied (standard preset)
- Input validation via Zod schema (0-9999 range for all macro values)

## Limitations / TODOs

1. **Per-100g data not stored**: The per-100g values are derived from current macros and portion. If portion_grams is not set (defaults to 100g), the calculation works correctly. For meals logged without portion info, the base values are treated as per-100g.

2. **Inline edit still available**: The existing inline edit functionality (pencil icon) is preserved for quick edits without portion recalculation. The bottom sheet provides a more detailed editing experience.

3. **No delete from sheet**: The edit sheet only supports updating. Delete must be done via the trash icon in the meal list.

## Testing Checklist

- [ ] Tap on a logged meal opens the edit sheet
- [ ] Sheet displays correct food name, brand, and current macros
- [ ] Changing portion updates macro preview in real-time
- [ ] Quick portion buttons work correctly
- [ ] Save button is disabled when no changes made
- [ ] Successful save updates the list and closes sheet
- [ ] Daily totals (calories, protein, carbs, fat) update after edit
- [ ] Failed save shows error message, sheet stays open
- [ ] Cancel button closes sheet without saving
- [ ] Edit/Delete buttons still work (don't trigger sheet)
- [ ] Inline editing mode still works correctly
