# Journey System: Workout Tasks Removal - Implementation Guide

## Overview
This document provides the complete implementation for removing all workout/training tasks from the Journey system and replacing them with nutrition/habits-only tasks.

## ✅ Already Completed

### 1. Task Type Definitions
- **File**: `apps/web/lib/journey/taskTypes.ts` ✅ EXISTS
- Defines 7 allowed task types (meal_log, protein_target, calorie_window, weigh_in, streak_days, habit_check, edu_read)
- Includes type guards, validation functions, and TypeScript interfaces

### 2. Stage Engine Updates  
- **File**: `apps/web/lib/stageEngine.ts` ✅ UPDATED
- Removed: workouts_per_week, upper_body_workouts, cardio_minutes, steps_avg
- Added: meals_logged, protein_avg_g, calorie_adherence_pct, weigh_ins, log_streak_days, habit_streak_days
- Updated XP_AWARDS to nutrition/habits only

## 📋 Remaining Tasks

### 3. Generate Stage & Task Templates
**Action Required**: Run the template generator

```bash
cd /Users/netanelhadad/Projects/gymbro
tsx apps/web/scripts/journey/generateTemplates.ts
```

This will create:
- `configs/journey/STAGE_TEMPLATES.json` (36 stages: 12 avatars × 3 stages)
- `configs/journey/TASK_TEMPLATES.json` (108 tasks: 36 stages × 3 tasks avg)

**Template Pattern (per avatar)**:
- Stage 1: Basics (streak_days, meal_log, edu_read)
- Stage 2: Discipline (calorie_window, protein_target, habit_check)
- Stage 3: Progress (weigh_in, streak_days/protein, edu_read)

### 4. Backend Validation
**Files to Update**:

#### `apps/web/app/api/journey/route.ts`
```typescript
import { validateTaskType, ALLOWED_TASK_TYPES } from '@/lib/journey/taskTypes';

// In GET handler - filter invalid tasks
const validTasks = tasks.filter(t => validateTaskType(t.type));

// Return error for invalid types
if (validTasks.length !== tasks.length) {
  console.warn('Filtered out invalid task types');
}
```

#### `apps/web/app/api/journey/track/route.ts`
```typescript
import { assertValidTaskType } from '@/lib/journey/taskTypes';

// In POST handler
try {
  assertValidTaskType(taskType);
} catch (error) {
  return NextResponse.json(
    { error: 'Invalid task type. Allowed: meal_log, protein_target, calorie_window, weigh_in, streak_days, habit_check, edu_read' },
    { status: 400 }
  );
}
```

#### `apps/web/app/api/journey/complete/route.ts`
Same validation as track route.

### 5. Auto-Check Functions
**Create**: `apps/web/lib/journey/autoChecks.ts`

```typescript
import { supabase } from '@/lib/supabase';
import type { MealLogTarget, ProteinTargetTarget, CalorieWindowTarget, WeighInTarget, StreakDaysTarget } from './taskTypes';

export async function checkMealLog(userId: string, target: MealLogTarget): Promise<boolean> {
  const { count, window = 1 } = target;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - window);
  
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('id')
    .eq('user_id', userId)
    .gte('logged_at', startDate.toISOString());
  
  if (error) throw error;
  return (data?.length || 0) >= count;
}

export async function checkProteinTarget(userId: string, target: ProteinTargetTarget): Promise<boolean> {
  const { grams, window = 1, avg = false } = target;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - window);
  
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('protein_g')
    .eq('user_id', userId)
    .gte('logged_at', startDate.toISOString());
  
  if (error) throw error;
  if (!data || data.length === 0) return false;
  
  const totalProtein = data.reduce((sum, log) => sum + (log.protein_g || 0), 0);
  
  if (avg) {
    const avgProtein = totalProtein / window;
    return avgProtein >= grams;
  } else {
    // Check if ANY day hit the target
    return data.some(log => (log.protein_g || 0) >= grams);
  }
}

export async function checkCalorieWindow(userId: string, target: CalorieWindowTarget): Promise<boolean> {
  const { min, max, exact, window = 1 } = target;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - window);
  
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('calories')
    .eq('user_id', userId)
    .gte('logged_at', startDate.toISOString());
  
  if (error) throw error;
  if (!data || data.length === 0) return false;
  
  const totalCalories = data.reduce((sum, log) => sum + (log.calories || 0), 0);
  const avgCalories = totalCalories / window;
  
  if (exact) {
    const tolerance = 50; // ±50 kcal tolerance
    return Math.abs(avgCalories - exact) <= tolerance;
  }
  
  if (min && avgCalories < min) return false;
  if (max && avgCalories > max) return false;
  
  return true;
}

export async function checkWeighIn(userId: string, target: WeighInTarget): Promise<boolean> {
  const { count = 1, window = 7, trend } = target;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - window);
  
  const { data, error } = await supabase
    .from('weight_logs')
    .select('weight_kg, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', startDate.toISOString())
    .order('logged_at', { ascending: true });
  
  if (error) throw error;
  if (!data || data.length < count) return false;
  
  if (trend && data.length >= 2) {
    const firstWeight = data[0].weight_kg;
    const lastWeight = data[data.length - 1].weight_kg;
    
    if (trend === 'down' && lastWeight >= firstWeight) return false;
    if (trend === 'up' && lastWeight <= firstWeight) return false;
  }
  
  return true;
}

export async function checkStreakDays(userId: string, target: StreakDaysTarget): Promise<boolean> {
  const { days, rule } = target;
  
  // Implementation depends on rule
  // This would check consecutive days where the rule was satisfied
  // For now, return false - full implementation needed based on rule type
  
  return false; // TODO: Implement streak checking logic
}
```

### 6. Database Migration
**Create**: `supabase/migrations/024_journey_no_workouts.sql`

```sql
-- Remove old workout-related task types
DELETE FROM user_stage_tasks 
WHERE task_template_id IN (
  SELECT id FROM stage_task_templates 
  WHERE type SIMILAR TO '%(workout|exercise|gym|lift|cardio|training)%'
);

DELETE FROM stage_task_templates 
WHERE type SIMILAR TO '%(workout|exercise|gym|lift|cardio|training)%';

-- Add check constraint for allowed task types
ALTER TABLE stage_task_templates
DROP CONSTRAINT IF EXISTS task_type_allowed;

ALTER TABLE stage_task_templates
ADD CONSTRAINT task_type_allowed CHECK (
  type IN ('meal_log', 'protein_target', 'calorie_window', 
           'weigh_in', 'streak_days', 'habit_check', 'edu_read')
);

-- Insert new stage templates
-- (Generated from STAGE_TEMPLATES.json)

-- Insert new task templates  
-- (Generated from TASK_TEMPLATES.json)

COMMENT ON CONSTRAINT task_type_allowed ON stage_task_templates IS 
'Only nutrition and habit tasks allowed - no workouts';
```

### 7. Frontend Updates
**File**: `apps/web/components/journey/NodeModal.tsx`

Add routing logic:
```typescript
import { getCtaRoute } from '@/lib/journey/taskTypes';

// In component
const ctaRoute = getCtaRoute(task.type);

if (ctaRoute) {
  router.push(ctaRoute);
} else {
  // Handle in-modal (habit_check, edu_read)
  setShowInlineAction(true);
}
```

Remove any workout-related copy or buttons.

### 8. Tests
**Create**: `apps/web/lib/journey/__tests__/taskValidation.test.ts`

```typescript
import { validateTaskType, ALLOWED_TASK_TYPES } from '../taskTypes';

describe('Task Type Validation', () => {
  it('should allow all nutrition/habit tasks', () => {
    ALLOWED_TASK_TYPES.forEach(type => {
      expect(validateTaskType(type)).toBe(true);
    });
  });

  it('should reject workout tasks', () => {
    const workoutTypes = [
      'workout_count',
      'lift_target',
      'exercise_complete',
      'gym_session',
      'cardio_minutes',
      'training_streak'
    ];

    workoutTypes.forEach(type => {
      expect(validateTaskType(type)).toBe(false);
    });
  });

  it('should reject invalid types', () => {
    expect(validateTaskType('invalid')).toBe(false);
    expect(validateTaskType('')).toBe(false);
    expect(validateTaskType('workout')).toBe(false);
  });
});
```

## Verification Steps

Run these commands to verify the implementation:

```bash
# 1. Generate templates
cd /Users/netanelhadad/Projects/gymbro
tsx apps/web/scripts/journey/generateTemplates.ts

# 2. Run migration
cd supabase
supabase migration up

# 3. Run tests
cd apps/web
pnpm test lib/journey

# 4. Check API endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/journey
# Should return stages with only allowed task types

# 5. Try invalid task type
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"taskType":"workout_count"}' \
  http://localhost:3000/api/journey/track
# Should return 400 error
```

## Summary

### Files Created
1. ✅ `apps/web/lib/journey/taskTypes.ts` - Type definitions
2. 📝 `configs/journey/STAGE_TEMPLATES.json` - Stage templates (needs generation)
3. 📝 `configs/journey/TASK_TEMPLATES.json` - Task templates (needs generation)
4. 📝 `apps/web/lib/journey/autoChecks.ts` - Auto-check functions
5. 📝 `supabase/migrations/024_journey_no_workouts.sql` - Migration
6. 📝 `apps/web/lib/journey/__tests__/taskValidation.test.ts` - Tests

### Files Modified
1. ✅ `apps/web/lib/stageEngine.ts` - Metrics updated
2. 📝 `apps/web/app/api/journey/route.ts` - Add validation
3. 📝 `apps/web/app/api/journey/track/route.ts` - Add validation
4. 📝 `apps/web/app/api/journey/complete/route.ts` - Add validation
5. 📝 `apps/web/components/journey/NodeModal.tsx` - Update routing

### Statistics
- **Avatars**: 12
- **Stages**: 36 (12 × 3)
- **Tasks**: ~108 (36 × 3)
- **Allowed Task Types**: 7
- **Removed Types**: All workout/training types

## Next Steps

1. Review this document
2. Run the template generator script
3. Implement backend validation in API routes
4. Create auto-check functions
5. Write and run database migration
6. Update frontend routing
7. Run tests
8. Deploy and verify in production

