# ✅ Feature: Click to Edit Daily Targets

## What Was Implemented

Users can now click on any nutrition widget or card to navigate to a dedicated edit page where they can modify all daily target values at once.

---

## 🎨 How It Works

### Clickable Widgets/Cards

**All widgets are now clickable:**
- 🔥 **Calories Widget** - Click anywhere on the card
- 💪 **Protein Card** - Click anywhere on the card
- 🍞 **Carbs Card** - Click anywhere on the card
- 🥑 **Fat Card** - Click anywhere on the card

**Visual feedback:**
- Hover effect (slightly lighter background)
- Cursor changes to pointer
- Slight scale animation on click

### Edit Targets Page

**Dedicated page** (`/nutrition/edit-targets`) with:
- Clean, focused UI for editing all targets
- Big input fields for each macro
- Color-coded borders matching macro colors
- Save and Cancel buttons
- Auto-saves to localStorage on save

---

## 📋 Files Created/Modified

### 1. New Page: Edit Targets
**Location:** `app/(app)/nutrition/edit-targets/page.tsx`

**Features:**
- Loads current targets (custom or plan defaults)
- Large input fields for each target:
  - Calories (lime green border)
  - Protein (pink border)
  - Carbs (orange border)
  - Fat (blue border)
- Save button → Saves to localStorage & navigates back
- Cancel button → Discards changes & navigates back

**UI:**
```
┌────────────────────────────────┐
│   ערוך יעדים יומיים            │
├────────────────────────────────┤
│                                │
│   🔥 קלוריות                   │
│   [2000]                       │
│                                │
│   💪 חלבון                      │
│   [150]                        │
│                                │
│   🍞 פחמימות                    │
│   [200]                        │
│                                │
│   🥑 שומנים                     │
│   [60]                         │
│                                │
│   [ביטול]    [שמור]            │
└────────────────────────────────┘
```

### 2. CaloriesWidget
**Location:** `components/nutrition/CaloriesWidget.tsx`

**Changes:**
- Removed: Edit button, save/cancel buttons, edit mode
- Added: `onClick` prop
- Added: Clickable styling (hover, cursor, scale)
- Simplified: Just displays calories, no inline editing

### 3. MacroCard
**Location:** `components/nutrition/MacroCard.tsx`

**Changes:**
- Removed: Edit button, save/cancel buttons, edit mode
- Added: `onClick` prop
- Added: Clickable styling (hover, cursor, scale)
- Simplified: Just displays macros, no inline editing

### 4. Nutrition Page
**Location:** `app/(app)/nutrition/page.tsx`

**Changes:**
- Removed: Individual edit handlers for each target
- Added: `handleNavigateToEditTargets()` - navigates to `/nutrition/edit-targets`
- Updated: All widgets/cards use `onClick={handleNavigateToEditTargets}`
- Added: Reload custom targets when page becomes visible (returns from edit page)

---

## 🔧 Technical Details

### Navigation Flow

```
Nutrition Page
  ↓ Click widget/card
Edit Targets Page
  ↓ Edit values
  ↓ Click Save
localStorage updated
  ↓ Navigate back
Nutrition Page
  ↓ Visibility change event
Reload custom targets
  ↓
UI updates with new targets
```

### Data Persistence

**When clicking widget:**
1. Router navigates to `/nutrition/edit-targets`
2. Edit page loads current values from localStorage

**On edit page:**
1. User changes values
2. Clicks "Save"
3. `storage.setJson(userId, "customNutritionTargets", targets)`
4. `router.back()` - returns to nutrition page

**Back on nutrition page:**
1. `visibilitychange` event fires
2. Reloads custom targets from localStorage
3. UI updates with new values

### Custom Targets Priority

```typescript
const targetCalories = customTargets.calories ?? plan?.dailyTargets?.calories ?? 0;
```

**Priority:**
1. Custom targets (edited by user)
2. Plan targets (from AI plan)
3. Zero (fallback)

---

## 🎯 User Experience

### Step-by-Step Flow

**Step 1:** View nutrition page
```
┌────────────────────────────────┐
│         500                    │
│   קלוריות נשארו היום           │
│   (Click anywhere)             │
└────────────────────────────────┘
```

**Step 2:** Click on calories widget
- Page navigates to `/nutrition/edit-targets`

**Step 3:** Edit targets page opens
```
┌────────────────────────────────┐
│   ערוך יעדים יומיים            │
│                                │
│   🔥 קלוריות                   │
│   [2000] ← Edit here           │
│                                │
│   💪 חלבון                      │
│   [150] ← Edit here            │
│                                │
│   ...                          │
│                                │
│   [ביטול]    [שמור]            │
└────────────────────────────────┘
```

**Step 4:** Change values
- Type new values in input fields
- All changes stay in local state

**Step 5:** Click "שמור" (Save)
- Values saved to localStorage
- Navigates back to nutrition page
- UI updates automatically

---

## 💡 Benefits

**Before (with inline editing):**
- ❌ Edit pencil icons cluttered UI
- ❌ Small input fields hard to use
- ❌ Edit one at a time only
- ❌ Save/cancel buttons took space

**After (with dedicated page):**
- ✅ Clean UI, no clutter
- ✅ Large, easy-to-use inputs
- ✅ Edit all targets at once
- ✅ Focused editing experience
- ✅ Better mobile UX

---

## 🔒 Data Management

### Storage Location
- **LocalStorage:** `{userId}_customNutritionTargets`
- **Format:**
```json
{
  "calories": 2500,
  "protein": 180,
  "carbs": 200,
  "fat": 65
}
```

### Syncing
- No server/database (localStorage only)
- Per-user (scoped by userId)
- Browser-specific (not synced across devices)
- Persists across sessions

### Loading Strategy
1. **On mount:** Load custom targets
2. **On visibility change:** Reload (catches returns from edit page)
3. **Merge:** Custom overrides plan defaults

---

## 🐛 Edge Cases Handled

1. **No custom targets:** Uses plan defaults
2. **No plan:** Uses zero defaults
3. **Partial customization:** Merges custom + plan
4. **Cancel button:** Discards all changes
5. **Browser back:** Same as cancel (no save)
6. **Page refresh:** Targets persist (localStorage)

---

## 📱 Mobile UX

**Why this approach is better for mobile:**
- Large touch targets (entire card)
- No small buttons to tap
- Full-screen edit page
- Big input fields
- Easy to type numbers
- Clear save/cancel actions

---

## 🧪 Testing Checklist

- [x] Click calories widget → navigates to edit page
- [x] Click protein card → navigates to edit page
- [x] Click carbs card → navigates to edit page
- [x] Click fat card → navigates to edit page
- [x] Edit page loads current values
- [x] Can edit all fields
- [x] Save button updates values
- [x] Cancel button discards changes
- [x] Back navigation shows updated values
- [x] Hover effects work
- [x] Cursor shows pointer on hover
- [x] Scale animation on click

---

## 🎨 UI/UX Details

### Visual Feedback

**Hover state:**
```css
hover:bg-neutral-900  /* Slightly lighter background */
transition-colors      /* Smooth transition */
cursor-pointer        /* Pointer cursor */
```

**Active state:**
```css
active:scale-[0.98]   /* Slight scale down on click */
```

**Edit page colors:**
- Calories: `#e2f163` (lime green)
- Protein: `#C9456C` (pink)
- Carbs: `#FFA856` (orange)
- Fat: `#5B9BFF` (blue)

---

## 💻 Code Structure

### Edit Targets Page Structure

```typescript
export default function EditTargetsPage() {
  const [userId, setUserId] = useState<string>("");
  const [targets, setTargets] = useState({
    calories: 0, protein: 0, carbs: 0, fat: 0
  });

  // Load user ID and targets
  useEffect(() => { /* ... */ }, []);

  const handleSave = () => {
    storage.setJson(userId, "customNutritionTargets", targets);
    router.back();
  };

  return (/* Edit UI */);
}
```

### Widget Click Handler

```typescript
const handleNavigateToEditTargets = () => {
  router.push('/nutrition/edit-targets');
};

<CaloriesWidget
  target={targetCalories}
  consumed={consumedCalories}
  onClick={handleNavigateToEditTargets}
/>
```

---

## 📊 Comparison

| Feature | Inline Edit (Old) | Dedicated Page (New) |
|---------|-------------------|----------------------|
| UI Clutter | ❌ Edit buttons visible | ✅ Clean, no buttons |
| Input Size | ❌ Small | ✅ Large |
| Edit Multiple | ❌ One at a time | ✅ All at once |
| Mobile UX | ❌ Hard to tap | ✅ Easy to use |
| Focus | ❌ Distracted | ✅ Dedicated |
| Visual Feedback | ⚠️ Minimal | ✅ Clear |

---

## Summary

**What changed:**
- ❌ Removed inline editing with pencil buttons
- ✅ Made all widgets/cards clickable
- ✅ Created dedicated edit page
- ✅ Better mobile experience
- ✅ Cleaner UI

**How to use:**
1. Click any nutrition widget/card
2. Edit all targets on dedicated page
3. Click "שמור" (Save)
4. Return to nutrition page
5. See updated values

**Where it saves:**
- LocalStorage only
- Per-user
- Persists across sessions
- No server sync
