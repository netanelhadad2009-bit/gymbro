# 🚀 Continue Journey Workout Removal Here

## Quick Status

**Progress**: 30% Complete  
**What's Done**: Core architecture + comprehensive documentation  
**What's Next**: Template generation, backend validation, database migration

---

## 📂 Key Documents

Start here for context:
1. **`docs/JOURNEY_NO_WORKOUTS_SUMMARY.md`** - Overall status & progress
2. **`docs/JOURNEY_NO_WORKOUTS_IMPLEMENTATION.md`** - Detailed implementation guide  
3. **`docs/VERIFY_NO_WORKOUTS.md`** - Verification steps
4. **`docs/CHANGELOG_NO_WORKOUT_TASKS.md`** - Breaking changes & migration

---

## ✅ Already Complete

- [x] Task type definitions (`apps/web/lib/journey/taskTypes.ts`)
- [x] Stage engine refactor (`apps/web/lib/stageEngine.ts`)
- [x] Complete documentation (4 files)

---

## 📋 Next 3 Tasks (In Order)

### 1. Generate Templates (2-3 hours)

```bash
# Option A: Complete the generator script
open apps/web/scripts/journey/generateTemplates.ts
# Add the complete implementation from docs/JOURNEY_NO_WORKOUTS_IMPLEMENTATION.md section 3

# Then run:
cd /Users/netanelhadad/Projects/gymbro
tsx apps/web/scripts/journey/generateTemplates.ts
```

**Expected Output**:
- `configs/journey/STAGE_TEMPLATES.json` (36 stages)
- `configs/journey/TASK_TEMPLATES.json` (~108 tasks)

**Verify**:
```bash
cat configs/journey/STAGE_TEMPLATES.json | jq '.stages | length'
# Should output: 36

cat configs/journey/TASK_TEMPLATES.json | jq '.tasks[].type' | sort | uniq
# Should output only: meal_log, protein_target, calorie_window, weigh_in, streak_days, habit_check, edu_read
```

---

### 2. Add Backend Validation (1-2 hours)

Update these 3 files to add task type validation:

#### File 1: `apps/web/app/api/journey/route.ts`
```typescript
// Add at top:
import { validateTaskType } from '@/lib/journey/taskTypes';

// In GET handler, filter tasks:
const validTasks = tasks.filter(t => validateTaskType(t.type));
if (validTasks.length !== tasks.length) {
  console.warn('[Journey API] Filtered out invalid task types');
}
```

#### File 2: `apps/web/app/api/journey/track/route.ts`
```typescript
// Add at top:
import { assertValidTaskType } from '@/lib/journey/taskTypes';

// In POST handler, before processing:
try {
  assertValidTaskType(taskType);
} catch (error) {
  return NextResponse.json(
    { error: 'Invalid task type. Allowed: meal_log, protein_target, calorie_window, weigh_in, streak_days, habit_check, edu_read' },
    { status: 400 }
  );
}
```

#### File 3: `apps/web/app/api/journey/complete/route.ts`
Same validation as track route.

**Verify**:
```bash
# Test invalid type (should return 400):
curl -X POST http://localhost:3000/api/journey/track \
  -H "Content-Type: application/json" \
  -d '{"taskType":"workout_count","value":5}'
```

---

### 3. Database Migration (1 hour)

Create: `supabase/migrations/024_journey_no_workouts.sql`

Copy the complete SQL from `docs/JOURNEY_NO_WORKOUTS_IMPLEMENTATION.md` section 6.

**Then run**:
```bash
cd /Users/netanelhadad/Projects/gymbro/supabase
supabase migration up
```

**Verify**:
```sql
-- In Supabase SQL Editor:
SELECT COUNT(*) FROM stage_task_templates WHERE type LIKE '%workout%';
-- Should return: 0
```

---

## 🎯 After These 3 Tasks

You'll be at **70% complete**. Remaining work:
- Auto-check functions (3-4 hours)
- Frontend updates (2 hours)
- Testing (2 hours)

See `docs/JOURNEY_NO_WORKOUTS_SUMMARY.md` for full breakdown.

---

## 🆘 If You Get Stuck

1. **Templates not generating?**
   - Check `docs/JOURNEY_NO_WORKOUTS_IMPLEMENTATION.md` section 3 for complete generator code
   - Verify Node/TypeScript is installed

2. **API validation failing?**
   - Ensure import paths are correct
   - Check that `taskTypes.ts` is in the right location

3. **Migration errors?**
   - Check if tables exist: `SELECT * FROM stage_task_templates LIMIT 1;`
   - Verify supabase CLI is connected

---

## 📊 Progress Tracking

Update `docs/JOURNEY_NO_WORKOUTS_SUMMARY.md` after completing each task.

Current status sections to update:
- "### 📝 Templates" - Change to "✅ Templates (100% complete)"
- "### 📝 Backend Validation" - Change to "✅ Backend Validation (100% complete)"
- "### 📝 Database Migration" - Change to "✅ Database Migration (100% complete)"

---

## 🏁 When Complete

Run all verification steps from `docs/VERIFY_NO_WORKOUTS.md`:
```bash
# 5-step verification process
cd /Users/netanelhadad/Projects/gymbro
./docs/VERIFY_NO_WORKOUTS.md  # Follow all steps
```

All 5 steps should pass ✅

---

**Good luck! You've got comprehensive documentation to guide you through each step.**

Questions? See the detailed docs in `/docs/JOURNEY_NO_WORKOUTS_*.md`
