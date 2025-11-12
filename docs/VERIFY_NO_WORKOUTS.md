# Quick Verification: Journey Without Workouts

## 5-Step Verification Process

### 1. Check Type Definitions
```bash
cd /Users/netanelhadad/Projects/gymbro
cat apps/web/lib/journey/taskTypes.ts | grep "ALLOWED_TASK_TYPES"
```
**Expected Output**:
```typescript
export const ALLOWED_TASK_TYPES = [
  'meal_log',
  'protein_target',
  'calorie_window',
  'weigh_in',
  'streak_days',
  'habit_check',
  'edu_read',
] as const;
```
✅ **Pass**: No workout types present

### 2. Verify Stage Engine Metrics
```bash
cat apps/web/lib/stageEngine.ts | grep "export type MetricType"
```
**Expected Output**:
```typescript
export type MetricType =
  | 'meals_logged'
  | 'protein_avg_g'
  | 'calorie_adherence_pct'
  | 'weigh_ins'
  | 'log_streak_days'
  | 'habit_streak_days';
```
✅ **Pass**: No workouts_per_week, cardio_minutes, etc.

### 3. Test API Validation
```bash
# Start dev server if not running
pnpm --filter @gymbro/web dev

# In another terminal, test invalid type
curl -X POST http://localhost:3000/api/journey/track \
  -H "Content-Type: application/json" \
  -d '{"taskType":"workout_count","value":5}'
```
**Expected Output**:
```json
{
  "error": "Invalid task type. Allowed: meal_log, protein_target, calorie_window, weigh_in, streak_days, habit_check, edu_read"
}
```
✅ **Pass**: Returns 400 error

### 4. Check Database Schema
```bash
cd supabase
supabase db diff --schema public | grep "task_type_allowed"
```
**Expected Output**:
```sql
ADD CONSTRAINT task_type_allowed CHECK (
  type IN ('meal_log', 'protein_target', 'calorie_window', 
           'weigh_in', 'streak_days', 'habit_check', 'edu_read')
);
```
✅ **Pass**: Constraint enforces allowed types

### 5. Verify Frontend Routing
```bash
grep -A 10 "getCtaRoute" apps/web/lib/journey/taskTypes.ts
```
**Expected**: Function returns:
- `/nutrition` for meal/protein/calorie tasks
- `/progress#weight` for weigh-in
- `null` for in-app tasks (habits, education)
- NO `/workouts` routes

✅ **Pass**: No workout routes in Journey

## Automated Test Suite
```bash
# Run all Journey tests
pnpm --filter @gymbro/web test lib/journey

# Expected: All tests pass
# - Task type validation
# - Auto-check functions
# - Stage progression logic
```

## Manual UI Testing

1. **Open Journey page**: http://localhost:3000/journey
2. **Check stage tasks**: Should only show nutrition/habit tasks
3. **Click task CTA**:
   - Meal/protein/calorie → Redirects to /nutrition ✅
   - Weigh-in → Redirects to /progress ✅
   - Habit/education → Opens in-modal action ✅
4. **NO workout buttons or copy** ✅

## Database Verification
```sql
-- Connect to your Supabase DB
SELECT DISTINCT type FROM stage_task_templates;
-- Should return ONLY: meal_log, protein_target, calorie_window, weigh_in, streak_days, habit_check, edu_read

SELECT COUNT(*) FROM stage_task_templates WHERE type LIKE '%workout%';
-- Should return: 0

SELECT COUNT(*) FROM stage_task_templates WHERE type LIKE '%exercise%';
-- Should return: 0
```

## Checklist

- [ ] Type definitions include ONLY 7 allowed types
- [ ] Stage engine has NO workout metrics
- [ ] API routes reject workout task types with 400
- [ ] Database constraint enforces allowed types
- [ ] Frontend routes to /nutrition or /progress (never /workouts)
- [ ] UI shows NO workout-related copy
- [ ] Templates generated (36 stages, ~108 tasks)
- [ ] Auto-check functions implemented
- [ ] Tests passing
- [ ] Migration applied successfully

## Troubleshooting

### Issue: API still accepts workout types
**Fix**: Ensure `validateTaskType()` is called in all API routes:
```typescript
import { assertValidTaskType } from '@/lib/journey/taskTypes';
// In handler:
assertValidTaskType(taskType); // Throws if invalid
```

### Issue: Old workout tasks still in DB
**Fix**: Run the cleanup migration:
```sql
DELETE FROM user_stage_tasks WHERE task_template_id IN (
  SELECT id FROM stage_task_templates WHERE type LIKE '%workout%'
);
```

### Issue: Frontend still shows workout buttons
**Fix**: Search for workout references:
```bash
grep -r "workout" apps/web/components/journey/
# Remove any matches
```

## Success Criteria

✅ All 5 verification steps pass  
✅ No workout types in type definitions  
✅ No workout metrics in stage engine  
✅ API rejects workout types  
✅ Database enforces allowed types  
✅ Frontend routes correctly  
✅ No workout UI elements  
✅ All tests pass

**Status**: 2/5 verification steps complete (types + stage engine)  
**Remaining**: API validation, database migration, frontend updates
