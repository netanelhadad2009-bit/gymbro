# Journey System: Workout Tasks Removed

**Date**: 2025-01-XX  
**Version**: 2.0.0  
**Breaking Change**: Yes

## Summary

Removed all workout/training tasks from the Journey system. Journey now focuses exclusively on nutrition tracking, habits, and education. Workout features remain available in the Workouts section but are decoupled from Journey progression.

## What Changed

### ✅ Completed

#### Core Type System
- **Added**: `apps/web/lib/journey/taskTypes.ts`
  - 7 allowed task types (meal_log, protein_target, calorie_window, weigh_in, streak_days, habit_check, edu_read)
  - Type guards and validation functions
  - Zero workout types allowed

#### Stage Engine
- **Modified**: `apps/web/lib/stageEngine.ts`
  - **Removed metrics**: workouts_per_week, upper_body_workouts, cardio_minutes, steps_avg
  - **Added metrics**: meals_logged, protein_avg_g, calorie_adherence_pct, weigh_ins, log_streak_days, habit_streak_days
  - **Updated XP awards**: WORKOUT→MEAL_LOG, etc.
  - Stage type changed from 'workout'|'nutrition'|'habit'|'mixed' to 'nutrition'|'habit'|'mixed'

### 📝 To Be Implemented

See `docs/JOURNEY_NO_WORKOUT_TASKS_IMPLEMENTATION.md` for full details.

#### Templates (needs generation)
- Stage templates: 36 stages (12 avatars × 3)
- Task templates: ~108 tasks
- Pattern: Basics → Discipline → Progress

#### Backend (needs validation)
- API routes: Add `validateTaskType()` checks
- Return 400 for invalid types
- Filter out any legacy workout tasks

#### Database (needs migration)
- Delete workout task records
- Add CHECK constraint on task_type column
- Reseed with new nutrition/habit templates

#### Frontend (needs routing updates)
- Update NodeModal CTA routing
- Remove workout references
- Add in-modal actions for habits/education

## Migration Path

```bash
# 1. Generate templates
tsx apps/web/scripts/journey/generateTemplates.ts

# 2. Apply migration
supabase migration up

# 3. Verify
curl http://localhost:3000/api/journey | jq '.stages[].tasks[].type'
# Should only show: meal_log, protein_target, calorie_window, weigh_in, streak_days, habit_check, edu_read
```

## Breaking Changes

### For Users
- **Journey stages no longer track workouts** - Users must use /workouts page for training
- **Existing workout-based journey progress will be reset** - Fresh start with nutrition focus

### For Developers
- **Task type enum changed** - Any code referencing workout task types will break
- **API contracts updated** - Journey APIs now reject workout types with 400
- **Database schema enforced** - Cannot insert workout tasks into journey tables

## Rollback Plan

If needed, revert migration 024 and restore from backup:
```bash
supabase migration down 024_journey_no_workouts
# Then restore user_stage_tasks from backup
```

## Impact Assessment

- **Users affected**: All users with active journey progress
- **Data loss**: Workout-based task progress (design decision)
- **Feature parity**: Maintained via separate /workouts section
- **User communication**: In-app message explaining new nutrition-focused journey

## Questions?

See full implementation guide: `docs/JOURNEY_NO_WORKOUT_TASKS_IMPLEMENTATION.md`
