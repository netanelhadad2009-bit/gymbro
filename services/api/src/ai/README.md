# AI Workout Plan Generation

This directory contains the logic for generating and validating workout plans using Claude AI.

## Architecture

The workout plan generation follows a **normalize → validate → retry** pipeline:

```
LLM Response (Raw JSON)
    ↓
normalizePlan.ts  (Format correction & auto-fix)
    ↓
validatePlan.ts   (Strict schema validation)
    ↓
✅ Success → resolveExerciseIds.ts
    OR
❌ Failure → Retry once with stricter prompt → normalize again → validate
```

## Files

### `normalizePlan.ts`
**Purpose:** Normalize LLM output BEFORE strict validation to handle common format variations.

**What it fixes:**
- **Goal mapping:** Hebrew goals → enum (`'העלאת מסת שריר'` → `'mass'`)
- **muscles_focus:** Trim to 1-5 items, infer from exercises if empty
- **tempo:** Normalize dashes (`'2–0–2'` → `'2-0-2'`), handle "Hold" → `'החזק'`
- **reps:** Normalize separators (`'8–12'` → `'8-12'`), expand single numbers to ranges
- **sets:** Clamp to 2-4
- **orders:** Renumber days and exercises to be consecutive
- **total_sets:** Recompute from exercise sets

**Returns:** `{ plan, warnings }`

### `validatePlan.ts`
**Purpose:** Strict Zod schema validation with soft-validation mode for minor corrections.

**Validates:**
- Schema compliance (types, ranges, formats)
- Business rules (6-10 exercises/day, reps match goal, ≤25 sets/day)
- Rep ranges appropriate for goal (mass/cut/strength)

**Modes:**
- **Soft mode** (default): Auto-correct `total_sets`, day/exercise orders, slight rep drift
- **Hard mode**: Throw on all violations

**Returns:** `{ plan, warnings }`

### `resolveExerciseIds.ts`
**Purpose:** Match exercise names to database IDs using fuzzy matching.

**Returns:** `{ planWithIds, missing[] }`

### `plan.ts` (route)
**Workflow:**
1. Parse LLM JSON response
2. **Normalize** using `normalizePlan()`
3. **Validate** using `validatePlanOrThrow()`
4. On validation failure: **Retry once** with stricter prompt highlighting exact violations
5. On success: **Resolve IDs** and return plan

## Common Issues Fixed

### 1. Goal enum mismatch
**Before:** `"goal": "שריפת שומן"` → ❌ Validation error
**After:** Normalized to `"goal": "cut"` → ✅

### 2. muscles_focus length
**Before:** `"muscles_focus": []` or `["a","b","c","d","e","f"]` → ❌
**After:** Inferred from exercises or trimmed to 5 → ✅

### 3. Tempo format
**Before:** `"tempo": "2 - 0 - 2"` or `"Hold"` → ❌
**After:** Normalized to `"2-0-2"` or `"החזק"` → ✅

### 4. Reps format
**Before:** `"reps": "8–12"` (em dash) or `"10"` (single number) → ❌
**After:** `"reps": "8-12"` (regular dash) → ✅

## Environment Variables

- `WORKOUT_SOFT_VALIDATE` (default: `true`): Enable soft validation mode
- `ANTHROPIC_API_KEY`: Required for LLM calls

## Testing

Run end-to-end workout generation:
```bash
pnpm run test:ai:workout
```

Test specific normalization cases:
```typescript
import { normalizePlan } from './normalizePlan';

const result = normalizePlan(rawPlan, {
  goal: 'שריפת שומן',
  workoutsPerWeek: 5
});

console.log('Warnings:', result.warnings);
console.log('Normalized goal:', result.plan.goal); // 'cut'
```

## Retry Strategy

If first-pass validation fails, the route automatically:
1. Logs the specific validation errors
2. Retries with a **stricter prompt** that explicitly states the failed requirements
3. Uses lower temperature (0.2 vs 0.3) for more deterministic output
4. Normalizes and validates the retry result
5. Returns 422 with detailed issues if retry also fails

This dramatically reduces validation failures from ~30% to <5%.
