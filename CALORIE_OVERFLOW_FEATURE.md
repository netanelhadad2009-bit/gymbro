# ✅ Feature: Show Calories Over Target

## What Changed

The calorie widget now shows when you've eaten MORE than your target calories, instead of showing "0 קלוריות נשארו היום".

---

## How It Works

### Before (Old Behavior):
```
Target: 2000 calories
Eaten:  2300 calories
Display: 0 קלוריות נשארו היום
```
**Problem:** User doesn't know they exceeded their goal!

### After (New Behavior):
```
Target: 2000 calories
Eaten:  2300 calories
Display: 300 קלוריות מעל היעד
```
**Solution:** User sees exactly how much they exceeded!

---

## Visual Examples

### Under Target (Normal):
```
┌────────────────────────────────┐
│  🔥                            │
│  500         ◐───────          │
│  קלוריות נשארו היום            │
│                                 │
│  Color: Yellow (#e2f163)        │
└────────────────────────────────┘
```

### At Target (Exactly):
```
┌────────────────────────────────┐
│  🔥                            │
│  0           ●───────          │
│  קלוריות נשארו היום            │
│                                 │
│  Color: Yellow (#e2f163)        │
│  Circle: 100% full              │
└────────────────────────────────┘
```

### Over Target (NEW!):
```
┌────────────────────────────────┐
│  🔥                            │
│  300         ●───────          │
│  קלוריות מעל היעד              │
│                                 │
│  Color: Red (#ef4444)           │
│  Circle: 100% full (red)        │
└────────────────────────────────┘
```

---

## Code Changes

### File: `components/nutrition/CaloriesWidget.tsx`

**Before:**
```typescript
const caloriesLeft = Math.max(target - consumed, 0); // Always 0 if over
const percentage = Math.min((consumed / target) * 100, 100); // Capped at 100%
```

**After:**
```typescript
const caloriesLeft = target - consumed; // Can be negative!
const isOverTarget = caloriesLeft < 0;
const displayValue = Math.abs(caloriesLeft); // Show absolute value

// Text changes based on state
{isOverTarget ? "קלוריות מעל היעד" : "קלוריות נשארו היום"}

// Color changes based on state
color: isOverTarget ? "#ef4444" : "#e2f163"
```

---

## User Experience

### Scenario 1: User is under target
- **Display:** "500 קלוריות נשארו היום" (yellow)
- **Meaning:** You can eat 500 more calories today

### Scenario 2: User reaches target exactly
- **Display:** "0 קלוריות נשארו היום" (yellow)
- **Meaning:** You've reached your goal perfectly!

### Scenario 3: User exceeds target
- **Display:** "300 קלוריות מעל היעד" (red)
- **Meaning:** You've eaten 300 calories more than your goal

---

## Benefits

✅ **Clear Feedback:** Users know exactly where they stand
✅ **Motivational:** Shows progress even when over goal
✅ **Color Coding:** Red = warning, Yellow = good/on track
✅ **Accurate Numbers:** No more misleading "0" when over target

---

## Testing

To test this feature:

1. **Refresh your app**
2. Go to **Nutrition** page
3. Mark enough meals to **exceed your calorie target**
4. **Expected result:**
   - Number shows how much you're over
   - Text says "קלוריות מעל היעד"
   - Color changes to red
   - Circle is 100% filled (red)

---

## Technical Details

- **Green Light Color:** `#e2f163` (yellow-green)
- **Red Warning Color:** `#ef4444` (red)
- **Circle:** Fills to 100% max, then stays full (even if over)
- **Number:** Always shows absolute value (positive)
- **Text:** Changes based on `isOverTarget` boolean

---

## Edge Cases Handled

1. **Target = 0:** Won't divide by zero (handled in percentage calc)
2. **Consumed = 0:** Shows full target remaining (yellow)
3. **Way over target (200%):** Still shows 100% circle (red) with correct overflow number
4. **Negative consumed:** Treats as 0 (shouldn't happen but safe)

---

## Summary

**What it does:** Shows calorie overflow when you exceed your daily target

**Why it's useful:** Users can see they've exceeded their goal and by how much

**How it looks:** Red text/circle with "קלוריות מעל היעד" label
