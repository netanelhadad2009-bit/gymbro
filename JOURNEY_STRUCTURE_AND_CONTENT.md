# Journey Structure & Content - User Experience Flow

## Overview

The journey system is **persona-driven** and **adaptive**, generating different paths based on 5 user attributes:
- Gender (male/female)
- Goal (cut/bulk/recomp)
- Diet (vegan/keto/balanced/etc.)
- Frequency (low/medium/high)
- Experience (beginner/intermediate/advanced)

---

## Journey Structure

### 2-Chapter System

```
┌─────────────────────────────────────────┐
│ CHAPTER 1: BASICS (Always Included)     │
├─────────────────────────────────────────┤
│ • First Weigh-In                        │
│ • Log Meals                             │
│ • Hit Protein Goal                      │
└─────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ CHAPTER 2: ADVANCED (Persona-Specific)  │
├─────────────────────────────────────────┤
│ • Calorie Goals (cut/bulk specific)     │
│ • Diet Challenges (vegan/keto specific) │
│ • Training Frequency Goals              │
│ • Experience-Based Challenges           │
└─────────────────────────────────────────┘
```

---

## Content Structure Per Node

Each journey node contains:

### 1. Visual Elements
- **Icon**: Based on node type (Scale, UtensilsCrossed, TrendingUp, CalendarDays, etc.)
- **Color State**:
  - LOCKED: Dark gray (zinc-800) - Cannot interact
  - ACTIVE: Avatar color (default #E2F163 lime-yellow) - Pulsing animation
  - COMPLETED: Emerald green (#10B981) - Static with checkmark

### 2. Text Content
- **Title** (Hebrew): Short action name
  - Examples: "שקילה ראשונה", "תיעוד ארוחות", "יעד חלבון"
- **Description** (Hebrew): Clear instruction of what to do
  - Examples: "תעד את המשקל הנוכחי שלך", "תעד לפחות 2 ארוחות היום"
- **Points Reward**: XP awarded upon completion (10-50 points)

### 3. Interactive Elements
- **Progress Bar**: Real-time percentage (0-100%)
  - Calculated from Supabase queries (meals logged, protein consumed, etc.)
- **CTA Button**: "לחץ להשלמה!" (Click to complete) when progress = 100%
- **Navigation**: Tapping opens modal with more details

---

## Detailed Node Examples

### BASICS Chapter (3 Nodes - Always Included)

#### Node 1: First Weigh-In
```yaml
ID: weigh_in_today
Type: FIRST_WEIGH_IN
Title: "שקילה ראשונה"
Description: "תעד את המשקל הנוכחי שלך"
Points: 10
Icon: Scale ⚖️

Progress Logic:
  - Queries: SELECT * FROM weigh_ins WHERE user_id = ?
  - Completion: At least 1 weigh-in exists
  - Progress: 0% (no weigh-in) → 100% (has weigh-in)

User Action:
  - Tap node → Modal opens
  - Tap "Start Task" → Navigates to /progress#weight
  - User logs weight
  - Return to journey → Node shows 100% → Tap to complete
  - Confetti animation + 10 points awarded
```

#### Node 2: Log Meals
```yaml
ID: log_2_meals
Type: LOG_MEALS_TODAY
Title: "תיעוד ארוחות"
Description: "תעד לפחות 2 ארוחות היום"
Points: 15
Icon: UtensilsCrossed 🍽️

Progress Logic:
  - Queries: SELECT * FROM meals WHERE user_id = ? AND date = TODAY
  - Completion: 2+ meals logged today
  - Progress: 0 meals = 0%, 1 meal = 50%, 2+ meals = 100%

User Action:
  - Tap node → Modal shows "0/2 meals logged"
  - Tap "Log Meal" → Navigates to /nutrition
  - User logs breakfast → Returns → Progress shows 50%
  - User logs lunch → Returns → Progress shows 100%
  - Tap to complete → 15 points awarded
```

#### Node 3: Hit Protein Goal
```yaml
ID: protein_min
Type: HIT_PROTEIN_GOAL
Title: "יעד חלבון"
Description: "השג יעד של {target}g חלבון ליום"
  - Male: 120g
  - Female: 90g
Points: 20
Icon: TrendingUp 📈

Progress Logic:
  - Queries: SELECT SUM(protein) FROM meals WHERE user_id = ? AND date = TODAY
  - Completion: Total protein >= target
  - Progress: Linear (60g of 120g = 50%)

Metadata:
  threshold: 120 (or 90)
  nutrient: "protein"
  operator: "gte"

User Action:
  - Tap node → Modal shows "72g / 120g protein"
  - Real-time updates as meals are logged
  - When sum >= 120g → Shows 100%
  - Tap to complete → 20 points awarded
```

---

### ADVANCED Chapter (Conditional - Persona-Specific)

#### Node 4A: Calorie Deficit (Cut Goal)
```yaml
ID: cal_deficit_day
Type: CALORIE_DEFICIT
Title: "גירעון קלורי"
Description: "השג גירעון קלורי ליום אחד"
Points: 25
Icon: TrendingDown 📉

Conditions:
  - Only shown if persona.goal === "cut"

Progress Logic:
  - Compares daily calories to target (from nutrition plan)
  - Target: e.g., 1800 kcal
  - Consumed: Sum from meals
  - Completion: consumed < target

User Action:
  - See remaining calories in real-time
  - Modal shows: "1650 / 1800 kcal (150 kcal under target)"
  - Encourages mindful eating throughout the day
```

#### Node 4B: Calorie Surplus (Bulk Goal)
```yaml
ID: cal_surplus_day
Type: CALORIE_SURPLUS
Title: "עודף קלורי"
Description: "השג עודף קלורי ליום אחד"
Points: 25
Icon: TrendingUp 📈

Conditions:
  - Only shown if persona.goal === "bulk"

Progress Logic:
  - Target: e.g., 2500 kcal
  - Consumed: Sum from meals
  - Completion: consumed >= target
```

#### Node 5A: Vegan Protein Sources (Vegan Diet)
```yaml
ID: vegan_protein_sources
Type: VEGAN_PROTEIN
Title: "מקורות חלבון טבעוניים"
Description: "צרוך 3 מקורות חלבון טבעוניים שונים"
Points: 20

Conditions:
  - Only shown if persona.diet === "vegan"

Progress Logic:
  - Tracks unique vegan protein sources from meals
  - Examples: tofu, tempeh, lentils, chickpeas, quinoa
  - Completion: 3+ different sources in a day
```

#### Node 5B: Keto Day (Keto Diet)
```yaml
ID: keto_day
Type: KETO_COMPLIANT
Title: "יום קטוגני"
Description: "שמור על פחות מ-30g פחמימות ליום"
Points: 30

Conditions:
  - Only shown if persona.diet === "keto"

Progress Logic:
  - Queries: SELECT SUM(carbs) FROM meals WHERE date = TODAY
  - Threshold: 30g carbs
  - Operator: lte (less than or equal)
  - Completion: total_carbs <= 30g

Metadata:
  threshold: 30
  nutrient: "carbs"
  operator: "lte"
```

#### Node 6: Workout Frequency (High Frequency / Experienced)
```yaml
ID: workout_3x_week
Type: WORKOUT_FREQUENCY
Title: "אימונים שבועיים"
Description: "השלם 3 אימונים בשבוע"
Points: 35

Conditions:
  - persona.frequency === "high" OR
  - persona.experience !== "beginner"

Progress Logic:
  - Queries: SELECT COUNT(*) FROM workouts
            WHERE user_id = ?
            AND date >= START_OF_WEEK
  - Completion: 3+ workouts this week
  - Progress: 0/3 = 0%, 1/3 = 33%, 2/3 = 66%, 3/3 = 100%
```

#### Node 7: 7-Day Streak (Intermediate/Advanced)
```yaml
ID: week_streak_7
Type: WEEK_STREAK_7
Title: "רצף שבועי"
Description: "תעד ארוחות 7 ימים ברצף"
Points: 50

Conditions:
  - persona.experience === "intermediate" OR
  - persona.experience === "advanced"

Progress Logic:
  - Calculates consecutive days with meals logged
  - Queries: Complex streak calculation from meals table
  - Completion: 7 consecutive days
  - Progress: Shows current streak (e.g., "4/7 days")
```

---

## User Experience Flow

### 1. Journey Page View

```
┌──────────────────────────────────────┐
│  מסע הכושר שלי        [🔥 Streak: 3] │ ← Header
├──────────────────────────────────────┤
│                                      │
│    Chapter: BASICS                   │
│                                      │
│    ┌──────┐                         │
│    │  ⚖️  │  שקילה ראשונה           │ ← Node 1 (COMPLETED)
│    │  ✓   │  10 נקודות              │   Green, checkmark
│    └──────┘                         │
│       │                              │
│       │ ═══ (energy path)            │
│       ▼                              │
│    ┌──────┐                         │
│    │  🍽️  │  תיעוד ארוחות           │ ← Node 2 (ACTIVE)
│    │  75% │  15 נקודות              │   Avatar color, pulsing
│    └──────┘                         │   Shows 75% progress ring
│       │                              │
│       │ --- (faded path)             │
│       ▼                              │
│    ┌──────┐                         │
│    │  🔒  │  יעד חלבון              │ ← Node 3 (LOCKED)
│    │      │  20 נקודות              │   Gray, locked
│    └──────┘                         │
│                                      │
└──────────────────────────────────────┘
```

### 2. Node Modal (When Tapped)

```
┌──────────────────────────────────────┐
│                                   [X]│
│   🍽️  תיעוד ארוחות                  │
│                                      │
│   תעד לפחות 2 ארוחות היום            │
│                                      │
│   ┌────────────────────────────┐   │
│   │  Progress: 2/3 meals       │   │
│   │  [██████████░░] 66%        │   │
│   └────────────────────────────┘   │
│                                      │
│   Meals logged today:               │
│   ✓ Breakfast - 450 kcal            │
│   ✓ Lunch - 620 kcal                │
│   ○ Dinner - Not logged             │
│                                      │
│   ┌────────────────────────────┐   │
│   │   📝 Log Meal →            │   │ ← CTA Button
│   └────────────────────────────┘   │
│                                      │
│   Reward: 15 points                 │
└──────────────────────────────────────┘
```

### 3. Completion Animation

```
User taps "Complete" when progress = 100%:

1. Confetti explosion 🎉
2. Points counter animates: +15 points
3. Node transforms: ACTIVE → COMPLETED
4. Color changes: Avatar color → Green
5. Checkmark appears
6. Next node unlocks: LOCKED → ACTIVE
7. Cache invalidated (fresh data on next load)
```

---

## Progression Logic

### Sequential Unlocking (Gating)
```javascript
// Pseudo-code from useJourney.ts
for (let i = 0; i < nodes.length; i++) {
  const node = nodes[i];

  // Check if any previous node is incomplete
  const hasPreviousIncomplete = nodes
    .slice(0, i)
    .some(n => n.status !== 'COMPLETED');

  if (hasPreviousIncomplete) {
    node.status = 'LOCKED';
  } else {
    // Evaluate progress from Supabase
    node.status = evaluateProgress(node);
  }
}
```

**Key Rules:**
- Only ONE node is ACTIVE at a time
- All nodes after first incomplete node are LOCKED
- Cannot skip ahead
- Must complete in order

---

## Current Limitations & Content Gaps

### 1. **Limited Content Depth**
- **Issue**: Each node only has title + 1-line description
- **Missing**:
  - Multi-step instructions
  - Educational content (why protein matters, etc.)
  - Tips for success
  - Common pitfalls to avoid

### 2. **No Educational Content**
- **Issue**: Users don't learn WHY they're doing tasks
- **Missing**:
  - Nutrition education
  - Training principles
  - Habit formation tips
  - Progress explanations

### 3. **Static Descriptions**
- **Issue**: Descriptions don't adapt to user progress
- **Example**: "Log 2 meals" always says the same thing
- **Could Be**: "Great job logging breakfast! Now add lunch to reach 100%"

### 4. **No Rich Media**
- **Issue**: Text-only content
- **Missing**:
  - Videos (how to log meals, how to weigh in)
  - Images (proper portion sizes, meal examples)
  - Interactive demos
  - Progress charts

### 5. **Limited Node Variety**
- **Current**: Only 5 node types (weigh-in, meals, protein, streak, calories)
- **Missing**:
  - Workout-specific nodes
  - Water intake tracking
  - Sleep quality tracking
  - Measurement tracking (waist, arms, etc.)
  - Progress photos
  - Habit streaks (beyond meals)

### 6. **No Milestone Celebrations**
- **Issue**: Only individual node completions
- **Missing**:
  - Chapter completion rewards
  - Achievement badges
  - Progress milestones (Week 1 done, Month 1 done)
  - Social sharing

### 7. **No Failure Handling**
- **Issue**: If user breaks a streak, no recovery path
- **Missing**:
  - Encouragement when falling behind
  - Alternative paths if stuck
  - Help/hints system
  - "Skip for now" option for blocked users

---

## Data Flow Summary

```
User Action (e.g., log meal)
       ↓
Supabase INSERT into meals table
       ↓
Next journey page load
       ↓
useJourney() hook fetches data
       ↓
evaluateNodeProgress() queries meals table
       ↓
Calculates: 2 meals logged / 3 required = 66%
       ↓
Updates node UI: "2/3 meals" + 66% progress ring
       ↓
User logs 3rd meal
       ↓
Progress → 100%
       ↓
"לחץ להשלמה!" button appears
       ↓
User taps → POST /api/journey/complete
       ↓
Backend validates conditions
       ↓
Marks node COMPLETED + awards points
       ↓
Unlocks next node
       ↓
Invalidates cache
       ↓
Fresh data on next load
```

---

## Recommendations for Content Enhancement

### 1. Add Multi-Step Guides
Instead of:
```
Title: "תיעוד ארוחות"
Description: "תעד לפחות 2 ארוחות היום"
```

Use:
```
Title: "תיעוד ארוחות"
Steps:
  1. Tap "Nutrition" tab
  2. Tap "Add Meal" button
  3. Search for foods or scan barcode
  4. Confirm portion sizes
  5. Save meal

Why: "Tracking meals helps you understand your eating patterns
and ensures you're hitting your nutrition targets."

Tips:
  - Log meals right after eating for accuracy
  - Include drinks and snacks too
  - Use the barcode scanner for packaged foods
```

### 2. Add Progress Context
Instead of showing just "66%", show:
```
Progress: 2/3 meals logged

You're doing great! You've logged:
✓ Breakfast (450 kcal, 30g protein)
✓ Lunch (620 kcal, 45g protein)

Still need to log dinner to complete this challenge.
```

### 3. Add Educational Moments
```
🎓 Did you know?
Protein helps preserve muscle during weight loss.
Aim for 1.6-2.2g per kg of bodyweight daily.

That's why your target is 120g for your profile!
```

### 4. Add Celebratory Milestones
```
🎉 You've completed the BASICS chapter!

You've earned:
- 45 total points
- "Foundation Builder" badge
- Unlocked ADVANCED challenges

Keep going! Next up: Calorie goals →
```

---

## Current State: Simple but Effective

**Strengths:**
✅ Clear, actionable tasks
✅ Real-time progress tracking
✅ Gamification (points, unlocking)
✅ Personalized to user goals
✅ Visual feedback (colors, animations)

**Weaknesses:**
❌ Minimal educational content
❌ No rich media (videos, images)
❌ Limited task variety
❌ No recovery paths for failures
❌ No social/community features

---

**The current journey is a solid MVP that successfully guides users through basic fitness habits, but has significant room for content enrichment and feature expansion.**
