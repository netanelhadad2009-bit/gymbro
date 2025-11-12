# Avatar Dimensions Reference

This document catalogs all questionnaire dimensions captured during onboarding and explains how they map to avatar traits.

## Core Dimensions

### 1. Goal
**Type:** `"gain" | "loss" | "recomp"`
**Source:** `apps/web/app/onboarding/goals/page.tsx`
**Description:** Primary fitness objective
**Values:**
- `gain` - Muscle gain (העלאה במסה)
- `loss` - Weight loss (ירידה במשקל)
- `recomp` - Body recomposition/maintenance (שיפור הרכב הגוף)

**Avatar Mapping:**
Primary discriminator for avatar selection. Determines training split, nutrition pattern, and caloric strategy.

---

### 2. Experience
**Type:** `"never" | "results" | "knowledge" | "time" | "sure"`
**Source:** `apps/web/app/onboarding/experience/page.tsx`
**Description:** Primary barrier to past success
**Values:**
- `never` - Couldn't maintain consistency (לא הצלחתי להתמיד)
- `results` - Didn't see results (לא הצלחתי לראות תוצאות)
- `knowledge` - Lack of nutritional knowledge (אין לי מספיק ידע תזונתי)
- `time` - Insufficient time (לא מצאתי מספיק זמן)
- `sure` - Unsure (אני לא בטוח/ה)

**Avatar Mapping:**
Influences tone of voice, support level, and educational content emphasis. "never" and "time" signal need for habit-building focus.

---

### 3. Frequency
**Type:** `number` (2-6)
**Source:** `apps/web/app/onboarding/frequency/page.tsx`
**Description:** Desired weekly workout frequency
**Values:**
- `2` - Light commitment (קל להתמיד)
- `3` - Balanced for beginners/intermediates (מאוזן)
- `4` - Advanced pace (קצב מתקדם)
- `5` - Challenging pace (קצב מאתגר)
- `6` - Dedicated athlete (ספורטאי/ת מחויב/ת)

**Avatar Mapping:**
Critical for training split selection. 2-3 days → full-body or upper/lower split. 4-6 days → push/pull/legs or body-part split.

---

### 4. Activity Level
**Type:** `"sedentary" | "light" | "high"`
**Source:** `apps/web/app/onboarding/activity/page.tsx`
**Description:** Daily activity outside of workouts
**Values:**
- `sedentary` - Mostly sitting (יושב רוב היום)
- `light` - Some movement (זז קצת במהלך היום)
- `high` - Physical work or on feet all day (עובד פיזית)

**Avatar Mapping:**
Affects TDEE calculation multiplier and nutrition recommendations. Impacts caloric baseline for deficit/surplus.

---

### 5. Diet Preference
**Type:** `"none" | "vegan" | "vegetarian" | "keto" | "paleo"`
**Source:** `apps/web/app/onboarding/diet/page.tsx`
**Description:** Dietary restriction or preference
**Values:**
- `none` - No specific diet (לא עוקב אחרי דיאטה)
- `vegan` - Plant-based only (טבעוני/ת)
- `vegetarian` - Vegetarian (צמחוני/ת)
- `keto` - Ketogenic diet (קטוגני/ת)
- `paleo` - Paleo diet (פלאוליתי/ת)

**Avatar Mapping:**
Filters avatar to plant-powered variants or influences meal recommendations. Critical for nutrition personalization.

---

### 6. Metrics (Height, Weight, BMI)
**Type:** `number`
**Source:** `apps/web/app/onboarding/metrics/page.tsx`
**Fields:**
- `height_cm` - Height in centimeters (140-210)
- `weight_kg` - Weight in kilograms (40-200)
- `bmi` - Calculated BMI (derived)

**Avatar Mapping:**
Used for baseline TDEE calculation and progress tracking. BMI category can influence initial programming recommendations (e.g., higher volume for advanced lifters with higher lean mass).

---

## Secondary Dimensions

### 7. Gender
**Type:** `"male" | "female" | "other"`
**Source:** `apps/web/app/onboarding/gender/page.tsx`
**Description:** User's gender

**Avatar Mapping:**
Affects UI copy personalization and TDEE calculation. Not a primary avatar discriminator but influences presentation.

---

### 8. Birthdate
**Type:** `Date`
**Source:** `apps/web/app/onboarding/birthdate/page.tsx`
**Description:** Date of birth

**Avatar Mapping:**
Used to calculate age. May influence exercise selection (joint-friendly for older users) and recovery recommendations.

---

### 9. Target Weight
**Type:** `number`
**Source:** `apps/web/app/onboarding/target-weight/page.tsx`
**Description:** Goal weight in kg

**Avatar Mapping:**
Helps determine deficit/surplus magnitude and expected timeline. Validates goal alignment (gain vs. loss).

---

### 10. Pace
**Type:** `string` (not yet validated)
**Source:** `apps/web/app/onboarding/pace/page.tsx`
**Description:** Desired rate of progress

**Avatar Mapping:**
Influences caloric deficit/surplus magnitude. Aggressive pace = larger deficit/surplus.

---

### 11. Readiness
**Type:** `string` (not yet validated)
**Source:** `apps/web/app/onboarding/readiness/page.tsx`
**Description:** User's readiness to commit

**Avatar Mapping:**
May influence onboarding completion probability scoring. Not used in avatar matching currently.

---

### 12. Motivation
**Type:** `string` (not yet validated)
**Source:** `apps/web/app/onboarding/motivation/page.tsx`
**Description:** Primary motivation

**Avatar Mapping:**
Can influence tone of voice and messaging strategy. Not a primary avatar dimension.

---

## Avatar Resolution Priority

When resolving which avatar fits a user, dimensions are weighted as follows:

1. **Goal** (highest priority) - Must match or avatar is disqualified
2. **Frequency** - Strong weight, determines split feasibility
3. **Experience** - Moderate weight, influences beginner vs. advanced
4. **Diet** - Binary filter (plant-powered avatars only for vegan/vegetarian)
5. **Activity** - Soft influence on nutrition recommendations
6. **Metrics** - Used for calculations, not avatar selection

## Data Storage

All dimensions are persisted to:
- **localStorage** via `saveOnboardingData()` from `@/lib/onboarding-storage`
- **Supabase profiles table** for authenticated users
- **OnboardingAnswers interface** in avatar system (see `resolveAvatar.ts`)

## References

- Onboarding flow navigation: `apps/web/lib/onboarding/client.ts`
- Gender context: `apps/web/contexts/GenderContext.tsx`
- Storage utilities: `apps/web/lib/onboarding-storage.ts`
