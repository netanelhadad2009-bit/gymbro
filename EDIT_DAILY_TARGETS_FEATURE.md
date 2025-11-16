# ✅ Feature: Edit Daily Target Values

## What Was Added

Users can now edit all daily nutritional target values directly on the nutrition page:
- 🔥 **Calories** - Edit daily calorie target
- 💪 **Protein** - Edit daily protein target (grams)
- 🍞 **Carbs** - Edit daily carbohydrate target (grams)
- 🥑 **Fat** - Edit daily fat target (grams)

---

## 🎨 How It Works

### Each Widget Has an Edit Button:

**Calories Widget (top):**
- Small ✏️ edit button in top-left corner
- Click to edit daily calorie target

**Macro Cards (protein, carbs, fat):**
- Small ✏️ edit button in top-right corner of each card
- Click to edit that specific macro target

### Edit Mode:
- Number input appears with current value
- Color-coded border matching macro color
- ✅ Save button (green) - Saves changes
- ✖️ Cancel button (gray) - Discards changes

---

## 📋 Files Modified

### 1. CaloriesWidget Component
**Location:** `components/nutrition/CaloriesWidget.tsx`

**Changes:**
- Added `onEditTarget` prop
- Added edit state management
- Added handlers: `startEditing()`, `saveEditing()`, `cancelEditing()`
- Added edit/save/cancel buttons
- Edit mode shows input for target value

**UI in Edit Mode:**
```
┌────────────────────────────────┐
│ ✅ ✖️                  ✏️      │
│                                │
│           יעד יומי:            │
│          [2000]                │
│          קלוריות               │
│              🔥                │
└────────────────────────────────┘
```

### 2. MacroCard Component
**Location:** `components/nutrition/MacroCard.tsx`

**Changes:**
- Added `onEditTarget` prop
- Added edit state management
- Added handlers: `startEditing()`, `saveEditing()`, `cancelEditing()`
- Added edit/save/cancel buttons (top-right corner)
- Edit mode shows input for target value

**UI in Edit Mode:**
```
┌──────────────────┐
│           ✅ ✖️  │
│    120/           │
│     [150]         │
│       g           │
│    חלבון          │
│       💪          │
└──────────────────┘
```

### 3. Nutrition Page
**Location:** `app/(app)/nutrition/page.tsx`

**Added State:**
```typescript
const [customTargets, setCustomTargets] = useState<{
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}>({});
```

**Added Handlers:**
- `handleEditCaloriesTarget(newTarget)`
- `handleEditProteinTarget(newTarget)`
- `handleEditCarbsTarget(newTarget)`
- `handleEditFatTarget(newTarget)`

**Target Logic:**
```typescript
// Uses custom target if set, otherwise falls back to plan target
const targetCalories = customTargets.calories ?? plan?.dailyTargets?.calories ?? 0;
```

**LocalStorage:**
- Loads custom targets on mount
- Saves on every edit
- Key: `customNutritionTargets`
- Per-user (scoped by userId)

---

## 🔧 Technical Details

### Data Flow

**Initial Load:**
```
1. Load nutrition plan → Get default targets
2. Load localStorage → Get custom targets
3. Merge: custom targets override plan targets
4. Display widgets with final targets
```

**Edit Flow:**
```
User clicks ✏️
  → Edit mode activates
  → Input shows current target
  → User changes value
  → User clicks ✅
  → Save to localStorage
  → Update state
  → UI updates immediately
```

### Storage Format

**LocalStorage Key:** `{userId}_customNutritionTargets`

**Value:**
```json
{
  "calories": 2200,
  "protein": 160,
  "carbs": 200,
  "fat": 60
}
```

**Notes:**
- Only stores values that were edited
- Omits values that use plan defaults
- Persists across sessions
- Per-user (not global)

### Priority System

1. **Custom targets** (if set by user) - HIGHEST
2. **Plan targets** (from AI-generated plan)
3. **Zero** (if no plan exists)

Example:
```typescript
// User edited calories but not protein
customTargets = { calories: 2500 }
plan.dailyTargets = { calories: 2000, protein: 150 }

// Result:
targetCalories = 2500  // Uses custom
targetProtein = 150    // Uses plan default
```

---

## 🎯 User Experience

### Editing Calories:

**Step 1:** View current calories widget
```
┌────────────────────────────────┐
│                          ✏️    │
│         500                    │
│   קלוריות נשארו היום           │
│              🔥                │
└────────────────────────────────┘
```

**Step 2:** Click edit button (✏️)
```
┌────────────────────────────────┐
│ ✅ ✖️                          │
│        יעד יומי:               │
│        [2000]                  │
│        קלוריות                 │
│              🔥                │
└────────────────────────────────┘
```

**Step 3:** Change value to 2500
```
┌────────────────────────────────┐
│ ✅ ✖️                          │
│        יעד יומי:               │
│        [2500]                  │
│        קלוריות                 │
│              🔥                │
└────────────────────────────────┘
```

**Step 4:** Click save (✅)
```
┌────────────────────────────────┐
│                          ✏️    │
│         1000                   │
│   קלוריות נשארו היום           │
│              🔥                │
└────────────────────────────────┘
```

✅ **Target updated! Now showing 1000 calories left (2500 - 1500 consumed)**

---

### Editing Protein:

**Before:**
```
┌──────────────────┐
│            ✏️    │
│    120/150g      │
│    חלבון         │
│       💪         │
└──────────────────┘
```

**After Clicking Edit:**
```
┌──────────────────┐
│         ✅ ✖️    │
│    120/          │
│     [150]        │
│       g          │
│    חלבון         │
│       💪         │
└──────────────────┘
```

**Change to 180 and Save:**
```
┌──────────────────┐
│            ✏️    │
│    120/180g      │
│    חלבון         │
│       💪         │
└──────────────────┘
```

---

## 💡 Use Cases

### 1. Adjust for Different Days
- Higher calories on workout days
- Lower calories on rest days
- Temporarily adjust for special events

### 2. Fine-Tune Macros
- Increase protein for muscle building
- Adjust carbs for energy needs
- Modify fat for dietary preferences

### 3. Override AI Plan
- AI generated 2000 calories but you want 2200
- Plan says 150g protein but you prefer 180g
- Customize without regenerating entire plan

### 4. Experiment and Track
- Try different calorie levels
- See what works for your body
- Easy to change and test

---

## 🔒 Data Persistence

### Where It's Stored:
- **LocalStorage** - `customNutritionTargets` key
- **Per-user** - Scoped by userId
- **Browser-specific** - Not synced across devices

### When It's Loaded:
- On page mount
- When userId changes
- Automatically merged with plan targets

### When It's Saved:
- Immediately after clicking save (✅)
- On every target edit
- No manual "save" button needed

### How to Reset:
- Clear browser localStorage, OR
- Set values back to plan defaults manually, OR
- Delete the `customNutritionTargets` key

---

## 🐛 Edge Cases Handled

1. **No plan exists:** Uses custom targets only, or 0
2. **Partial customization:** Some targets custom, others use plan defaults
3. **Invalid input:** Empty or zero values handled gracefully
4. **Cancel during edit:** No changes saved
5. **Multiple edits:** Each save overwrites previous custom value
6. **Guest users:** Still works (uses guest userId)

---

## 📊 Impact

**Before:**
- Targets were fixed from AI plan
- Couldn't adjust without regenerating plan
- No flexibility for daily variations

**After:**
- ✅ Edit any target anytime
- ✅ Changes persist across sessions
- ✅ Quick and easy (2 clicks)
- ✅ Visual feedback (edit mode)
- ✅ Can revert by re-entering plan value

---

## 🧪 Testing Checklist

- [x] Edit calories target
- [x] Edit protein target
- [x] Edit carbs target
- [x] Edit fat target
- [x] Values persist after page refresh
- [x] Cancel discards changes
- [x] Save updates UI immediately
- [x] Custom targets override plan targets
- [x] Works without a plan
- [x] Works for guest users
- [x] Multiple edits work correctly
- [x] Input validation prevents negative values

---

## 💡 Future Enhancements (Optional)

- [ ] Sync targets across devices (use database)
- [ ] Reset button to restore plan defaults
- [ ] Edit all targets at once (modal)
- [ ] Daily target history/log
- [ ] Smart suggestions based on consumption patterns
- [ ] Different targets for different days of the week
- [ ] Import/export custom targets

---

## Summary

**What you can edit:**
- ✅ Daily calorie target
- ✅ Daily protein target (g)
- ✅ Daily carbs target (g)
- ✅ Daily fat target (g)

**How to edit:**
1. Click ✏️ (edit button) on any widget/card
2. Change the value
3. Click ✅ (save) or ✖️ (cancel)
4. Done! Changes persist.

**Where it saves:**
- LocalStorage (browser)
- Per-user
- Overrides plan defaults

**Why it's useful:**
- Flexibility to adjust daily
- No need to regenerate plan
- Quick and easy customization
- Persists across sessions
