# ✅ Feature: Edit Meal Nutritional Values

## What Was Added

Users can now edit all nutritional values for manually added meals directly in the nutrition page.

---

## 🎨 How It Works

### View Mode (Default):
- Meal card shows: name, calories, protein, carbs, fat
- Two buttons visible:
  - ✏️ **Edit button** (blue) - Opens edit mode
  - 🗑️ **Delete button** (red) - Deletes the meal

### Edit Mode:
- Name field becomes an input
- All nutritional values become number inputs:
  - **Calories** (lime green border)
  - **Protein** (pink border)
  - **Carbs** (orange border)
  - **Fat** (blue border)
- Two buttons visible:
  - ✅ **Save button** (green) - Saves changes
  - ✖️ **Cancel button** (gray) - Cancels editing

---

## 📋 Files Modified

### 1. Frontend Component: `UserMealsList.tsx`
**Location:** `components/nutrition/UserMealsList.tsx`

**Changes:**
- Added `onEdit` prop
- Added edit state management (`editingMealId`, `editValues`)
- Added handlers: `startEditing()`, `cancelEditing()`, `saveEditing()`
- Added edit mode UI with input fields for all values
- Added edit and save/cancel buttons

**Key Features:**
- Inline editing (no modal/dialog needed)
- Color-coded inputs matching macro colors
- Real-time local state updates
- Cancel to discard changes

### 2. API Endpoint: `api/meals/route.ts`
**Location:** `app/api/meals/route.ts`

**Added:** `PATCH /api/meals?id={mealId}` endpoint

**Accepts:**
```json
{
  "name": "Updated meal name",
  "calories": 500,
  "protein": 30,
  "carbs": 60,
  "fat": 15
}
```

**Features:**
- Partial updates (only send changed fields)
- RLS security (users can only edit their own meals)
- Validates meal ownership
- Returns updated meal data

### 3. Nutrition Page: `nutrition/page.tsx`
**Location:** `app/(app)/nutrition/page.tsx`

**Added:** `handleEditMeal()` function

**Flow:**
1. User clicks edit button
2. Edit mode activates with current values
3. User changes values
4. User clicks save
5. PATCH request to `/api/meals?id={mealId}`
6. Refreshes meal list
7. Calorie totals update automatically

**Passed to:** `<UserMealsList onEdit={handleEditMeal} />`

---

## 🔧 Technical Details

### State Management
```typescript
const [editingMealId, setEditingMealId] = useState<string | null>(null);
const [editValues, setEditValues] = useState<Partial<UserMeal>>({});
```

### Edit Flow
```
User clicks ✏️
  → startEditing(meal)
  → Sets editingMealId = meal.id
  → Copies values to editValues
  → UI shows input fields
```

### Save Flow
```
User clicks ✅
  → saveEditing()
  → onEdit(editingMealId, editValues)
  → PATCH /api/meals?id={mealId}
  → loadUserMeals() (refresh)
  → Clears edit state
  → UI returns to view mode
```

### Cancel Flow
```
User clicks ✖️
  → cancelEditing()
  → Clears edit state
  → UI returns to view mode
  → No API call (changes discarded)
```

---

## 🎯 User Experience

### Editing a Meal:

**Step 1:** View your added meals
```
┌─────────────────────────────────────┐
│ ארוחת בוקר         14:05            │
│ 450 קלוריות • 25 חלבון             │
│ 60 פחמימות • 10 שומן                │
│                          ✏️  🗑️     │
└─────────────────────────────────────┘
```

**Step 2:** Click edit button (✏️)
```
┌─────────────────────────────────────┐
│ [ארוחת בוקר        ]  14:05         │
│ [450] קלוריות  [25] חלבון          │
│ [60] פחמימות  [10] שומן             │
│                          ✅  ✖️     │
└─────────────────────────────────────┘
```

**Step 3:** Change values
```
┌─────────────────────────────────────┐
│ [ארוחת צהריים      ]  14:05         │
│ [550] קלוריות  [30] חלבון          │
│ [65] פחמימות  [15] שומן             │
│                          ✅  ✖️     │
└─────────────────────────────────────┘
```

**Step 4:** Click save (✅)
```
┌─────────────────────────────────────┐
│ ארוחת צהריים        14:05           │
│ 550 קלוריות • 30 חלבון             │
│ 65 פחמימות • 15 שומן                │
│                          ✏️  🗑️     │
└─────────────────────────────────────┘
```

✅ **Calories update automatically in the widget!**

---

## 🔒 Security

### RLS (Row Level Security)
- Users can only edit their own meals
- Enforced at database level
- Double-checked in API (`.eq("user_id", user.id)`)

### Validation
- Only allowed fields can be updated (name, calories, protein, carbs, fat)
- Source type cannot be changed
- Meal ownership verified before update

### Authentication
- Must be logged in to edit
- Returns 401 if not authenticated
- Session validated on every request

---

## 📊 Impact on Calculations

When you edit a meal:
1. ✅ **Nutrition page calories** - Updates immediately after save
2. ✅ **Graphs page calories** - Updates immediately after save
3. ✅ **Macro totals** - All macros (protein, carbs, fat) update
4. ✅ **Progress tracking** - Historical data updated

**Note:** Only affects the specific date of the meal, not other days.

---

## 🐛 Edge Cases Handled

1. **Multiple edits:** Only one meal can be edited at a time
2. **Cancel without save:** No API call, no changes persisted
3. **Invalid values:** Number inputs prevent non-numeric input
4. **Meal deleted during edit:** Returns 404, shows error message
5. **Network error:** Shows error alert, keeps edit mode open
6. **Empty values:** Defaults to 0 for numeric fields

---

## 🧪 Testing Checklist

- [x] Click edit button on a meal
- [x] Edit mode shows current values in inputs
- [x] Change meal name
- [x] Change calories value
- [x] Change protein value
- [x] Change carbs value
- [x] Change fat value
- [x] Click save - changes persist
- [x] Click cancel - changes discarded
- [x] Calorie widget updates after save
- [x] Can edit multiple meals one at a time
- [x] Cannot edit plan meals (only manual/photo meals)
- [x] Edit button only shows for meals with onEdit prop

---

## 💡 Future Enhancements (Optional)

- [ ] Add date picker to move meal to different day
- [ ] Bulk edit multiple meals at once
- [ ] Undo/redo functionality
- [ ] Edit history/audit log
- [ ] Keyboard shortcuts (Enter to save, Esc to cancel)
- [ ] Validation messages for out-of-range values
- [ ] Auto-save after X seconds of inactivity

---

## 📱 UI/UX Details

### Colors:
- **Calories:** `#e2f163` (lime green)
- **Protein:** `#C9456C` (pink)
- **Carbs:** `#FFA856` (orange)
- **Fat:** `#5B9BFF` (blue)
- **Edit button:** `#60a5fa` (blue)
- **Save button:** `#4ade80` (green)
- **Delete button:** `#f87171` (red)
- **Cancel button:** `#a3a3a3` (gray)

### Input Styling:
- Dark background (`bg-neutral-800`)
- Border matches macro color
- Focus: Brighter border
- Width: 64px (w-16) for numbers
- Rounded corners
- White text

### Transitions:
- Smooth fade between view/edit modes
- Button hover effects
- Focus states on inputs

---

## Summary

**What you can edit:**
- ✅ Meal name
- ✅ Calories
- ✅ Protein
- ✅ Carbs
- ✅ Fat

**What updates:**
- ✅ Database
- ✅ UI immediately
- ✅ Calorie widget
- ✅ Graphs page

**How to use:**
1. Click ✏️ (edit button)
2. Change values
3. Click ✅ (save) or ✖️ (cancel)
4. Done!
