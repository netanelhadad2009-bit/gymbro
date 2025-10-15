# GymBro Normalized Schema Implementation Guide

## Overview
This document contains the complete implementation for migrating from blob-based workout storage to a normalized relational schema.

## Status: Ready for Implementation

### ✅ Completed
1. SQL Migration (001_normalized_programs.sql) - Ready to run in Supabase
2. Parser (workoutParser.ts) - Parses Hebrew text format
3. Backfill Script (backfillPrograms.ts) - Migrates legacy data
4. API Route (/api/programs/create) - Creates normalized programs

### 🔨 Remaining Implementation

---

## 4) Server Utility: getUserProgramsWithWorkouts

**File**: `apps/web/lib/db/normalizedPrograms.ts`

```typescript
/**
 * Server utilities for normalized program data
 */

import { createServerSupabaseClient } from "@/lib/supabase-server";

export interface WorkoutWithExercises {
  id: string;
  day_number: number;
  title: string;
  notes: string | null;
  completed: boolean;
  exercises: Array<{
    id: string;
    order_index: number;
    name: string;
    sets: number | null;
    reps: string | null;
    rest_seconds: number | null;
    tempo: string | null;
  }>;
}

export interface ProgramWithWorkouts {
  program: {
    id: string;
    user_id: string;
    title: string;
    goal: string | null;
    days_estimate: number;
    start_date: string | null;
    created_at: string;
  };
  workouts: WorkoutWithExercises[];
  stats: {
    total: number;
    completed: number;
    progress: number; // 0-100
  };
  nextWorkout: WorkoutWithExercises | null;
}

/**
 * Get all programs with their workouts for a user
 */
export async function getUserProgramsWithWorkouts(
  userId: string
): Promise<ProgramWithWorkouts[]> {
  const supabase = await createServerSupabaseClient();

  // Fetch programs
  const { data: programs, error: programsError } = await supabase
    .from("programs")
    .select("id, user_id, title, goal, days_estimate, start_date, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (programsError) {
    console.error("[Programs] Error fetching programs:", programsError);
    throw programsError;
  }

  if (!programs || programs.length === 0) {
    return [];
  }

  // Fetch workouts and exercises for all programs
  const results: ProgramWithWorkouts[] = [];

  for (const program of programs) {
    const { data: workouts, error: workoutsError } = await supabase
      .from("workouts")
      .select(`
        id,
        day_number,
        title,
        notes,
        completed,
        workout_exercises (
          id,
          order_index,
          name,
          sets,
          reps,
          rest_seconds,
          tempo
        )
      `)
      .eq("program_id", program.id)
      .order("day_number", { ascending: true });

    if (workoutsError) {
      console.error(`[Programs] Error fetching workouts for ${program.id}:`, workoutsError);
      continue;
    }

    const typedWorkouts: WorkoutWithExercises[] = (workouts || []).map((w: any) => ({
      id: w.id,
      day_number: w.day_number,
      title: w.title,
      notes: w.notes,
      completed: w.completed,
      exercises: (w.workout_exercises || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((e: any) => ({
          id: e.id,
          order_index: e.order_index,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          rest_seconds: e.rest_seconds,
          tempo: e.tempo,
        })),
    }));

    const completed = typedWorkouts.filter((w) => w.completed).length;
    const total = typedWorkouts.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const nextWorkout = typedWorkouts.find((w) => !w.completed) || null;

    results.push({
      program,
      workouts: typedWorkouts,
      stats: { total, completed, progress },
      nextWorkout,
    });
  }

  return results;
}

/**
 * Get a single program with workouts
 */
export async function getProgramWithWorkouts(
  programId: string
): Promise<ProgramWithWorkouts | null> {
  const supabase = await createServerSupabaseClient();

  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id, user_id, title, goal, days_estimate, start_date, created_at")
    .eq("id", programId)
    .single();

  if (programError || !program) {
    return null;
  }

  const { data: workouts } = await supabase
    .from("workouts")
    .select(`
      id,
      day_number,
      title,
      notes,
      completed,
      workout_exercises (
        id,
        order_index,
        name,
        sets,
        reps,
        rest_seconds,
        tempo
      )
    `)
    .eq("program_id", programId)
    .order("day_number", { ascending: true });

  const typedWorkouts: WorkoutWithExercises[] = (workouts || []).map((w: any) => ({
    id: w.id,
    day_number: w.day_number,
    title: w.title,
    notes: w.notes,
    completed: w.completed,
    exercises: (w.workout_exercises || [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((e: any) => ({
        id: e.id,
        order_index: e.order_index,
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        rest_seconds: e.rest_seconds,
        tempo: e.tempo,
      })),
  }));

  const completed = typedWorkouts.filter((w) => w.completed).length;
  const total = typedWorkouts.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const nextWorkout = typedWorkouts.find((w) => !w.completed) || null;

  return {
    program,
    workouts: typedWorkouts,
    stats: { total, completed, progress },
    nextWorkout,
  };
}
```

---

## 5) Updated Workouts Page

**File**: `apps/web/app/(app)/workouts/page.tsx`

```typescript
export const dynamic = "force-dynamic";

import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getUserProgramsWithWorkouts } from "@/lib/db/normalizedPrograms";
import { Dumbbell, Calendar, Plus, ChevronLeft, CheckCircle2 } from "lucide-react";

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export default async function WorkoutsPage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#0e0f12] text-white p-4">
        <div className="text-center mt-12">
          <p className="text-[#b7c0c8]">צריך להתחבר</p>
        </div>
      </main>
    );
  }

  let programsWithWorkouts = [];
  try {
    programsWithWorkouts = await getUserProgramsWithWorkouts(userId);
  } catch (e) {
    console.error("[Workouts] Error loading programs:", e);
    return (
      <main dir="rtl" className="min-h-screen bg-[#0e0f12] text-white p-4">
        <div className="rounded-xl border border-[#2a3036] bg-[#15181c] p-6 text-red-400 mt-4">
          שגיאה בטעינת התוכניות. בדקו הרשאות/מדיניות RLS.
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#0e0f12] text-white pb-24">
      {/* Header */}
      <header className="bg-[#15181c] border-b border-[#2a3036] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">האימונים שלי</h1>
              <p className="text-sm text-[#b7c0c8] mt-1">כל התוכניות שנוצרו עבורך</p>
            </div>
            <Link
              href="/onboarding"
              className="bg-[#E2F163] text-[#0e0f12] font-semibold px-4 py-2 rounded-lg hover:bg-[#d4e352] transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">תוכנית חדשה</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {programsWithWorkouts.length === 0 ? (
          <section className="mt-12 rounded-xl border border-[#2a3036] bg-[#15181c] p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#0e0f12] flex items-center justify-center border border-[#2a3036]">
              <Dumbbell size={36} className="text-[#E2F163]" />
            </div>
            <h2 className="text-xl font-bold mb-2">אין תוכניות אימון</h2>
            <p className="text-[#b7c0c8] mb-4">
              סיימת את השאלון? תן דקה לסנכרון, או צור תוכנית חדשה.
            </p>
            <Link
              href="/onboarding"
              className="inline-block rounded-lg bg-[#E2F163] text-[#0e0f12] px-6 py-2.5 font-semibold hover:bg-[#d4e352] transition-colors"
            >
              תוכנית חדשה
            </Link>
          </section>
        ) : (
          <section className="flex flex-col gap-4">
            {programsWithWorkouts.map((item) => (
              <ProgramCard key={item.program.id} data={item} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function ProgramCard({ data }: { data: any }) {
  const { program, stats, nextWorkout, workouts } = data;

  const createdDate = program.created_at
    ? new Date(program.created_at).toLocaleDateString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  return (
    <div className="rounded-xl border border-[#2a3036] bg-[#15181c] p-4 shadow-md hover:border-[#E2F163] transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#E2F163]/10 flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-5 h-5 text-[#E2F163]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold truncate">{program.title}</h3>
            <div className="flex items-center gap-2 text-sm text-[#b7c0c8] mt-0.5">
              <span>{stats.total} אימונים</span>
              <span>•</span>
              <span>נוצר {createdDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {stats.total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-[#b7c0c8]">התקדמות</span>
            <span className="text-[#E2F163] font-semibold">
              {stats.completed}/{stats.total} ({stats.progress}%)
            </span>
          </div>
          <div className="h-2 bg-[#0e0f12] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E2F163] transition-all"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Next Workout */}
      {nextWorkout && (
        <div className="flex items-start gap-2 text-sm text-[#b7c0c8] mb-4 p-3 rounded-lg bg-[#0e0f12]">
          <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#E2F163]/60" />
          <div>
            <p className="font-semibold text-white mb-1">אימון הבא:</p>
            <p>{nextWorkout.title}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/workouts/${program.id}`}
          className="flex-1 rounded-lg bg-[#E2F163] text-[#0e0f12] font-semibold py-2.5 text-center hover:bg-[#d4e352] transition-colors flex items-center justify-center gap-2"
        >
          פתיחת התוכנית
          <ChevronLeft className="w-4 h-4" />
        </Link>
        {nextWorkout && (
          <Link
            href={`/workouts/${program.id}/workout/${nextWorkout.id}`}
            className="flex-1 rounded-lg border-2 border-[#E2F163] text-[#E2F163] font-semibold py-2.5 text-center hover:bg-[#E2F163] hover:text-[#0e0f12] transition-colors"
          >
            המשך אימון
          </Link>
        )}
      </div>
    </div>
  );
}
```

---

## 6) Parser Tests

**File**: `apps/web/lib/db/__tests__/workoutParser.test.ts`

```typescript
import { describe, it, expect } from "@jest/globals";
import { parseWorkoutPlanText, validateParsedProgram } from "../workoutParser";

describe("workoutParser", () => {
  it("should parse a Hebrew workout plan correctly", () => {
    const sampleText = `
יום 1: Upper Body
1. לחיצת חזה במשקולות - 3 סטים × 10-12 חזרות
2. משיכות גב - 3 סטים × 8-10 חזרות
3. כתפיים לחיצה - 3 סטים × 12-15 חזרות
סה"כ סטים באימון: 9
order: 1

יום 2: Lower Body
1. סקוואט - 4 סטים × 8-10 חזרות
2. דדליפט רומני - 3 סטים × 10-12 חזרות
סה"כ סטים באימון: 7
order: 2
    `.trim();

    const result = parseWorkoutPlanText(sampleText);

    expect(result.totalDays).toBe(2);
    expect(result.workouts).toHaveLength(2);

    // Day 1
    expect(result.workouts[0].dayNumber).toBe(1);
    expect(result.workouts[0].title).toBe("Upper Body");
    expect(result.workouts[0].exercises).toHaveLength(3);
    expect(result.workouts[0].exercises[0]).toEqual({
      name: "לחיצת חזה במשקולות",
      sets: 3,
      reps: "10-12",
      orderIndex: 1,
    });

    // Day 2
    expect(result.workouts[1].dayNumber).toBe(2);
    expect(result.workouts[1].title).toBe("Lower Body");
    expect(result.workouts[1].exercises).toHaveLength(2);
  });

  it("should validate parsed program", () => {
    const validParsed = {
      workouts: [
        {
          dayNumber: 1,
          title: "Test",
          exercises: [{ name: "Exercise", sets: 3, reps: "10", orderIndex: 1 }],
        },
      ],
      totalDays: 1,
    };

    const validation = validateParsedProgram(validParsed);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("should detect invalid program", () => {
    const invalidParsed = {
      workouts: [],
      totalDays: 0,
    };

    const validation = validateParsedProgram(invalidParsed);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});
```

---

## 7) Example JSON Payload for API

```json
{
  "user_id": "fdfae177-64c7-49d6-bd6c-dfef35f39f08",
  "title": "תוכנית אימון – חיטוב",
  "goal": "loss",
  "days_estimate": 3,
  "start_date": "2025-10-11",
  "workouts": [
    {
      "day_number": 1,
      "title": "Upper Body",
      "exercises": [
        {
          "name": "לחיצת חזה במשקולות",
          "sets": 3,
          "reps": "10-12"
        },
        {
          "name": "משיכות גב",
          "sets": 3,
          "reps": "8-10"
        }
      ]
    },
    {
      "day_number": 2,
      "title": "Lower Body",
      "exercises": [
        {
          "name": "סקוואט",
          "sets": 4,
          "reps": "8-10"
        }
      ]
    }
  ],
  "nutrition_meta": {
    "goal": "loss",
    "start_date": "2025-10-11",
    "days": 3
  }
}
```

---

## Deployment Steps

1. **Run SQL Migration**:
   ```bash
   # In Supabase SQL Editor
   # Copy and run: apps/web/supabase/migrations/001_normalized_programs.sql
   ```

2. **Backfill Existing Data** (optional - for legacy programs):
   ```typescript
   // Create a script or server action
   import { backfillAllPrograms } from '@/lib/db/backfillPrograms';
   const result = await backfillAllPrograms();
   console.log(result);
   ```

3. **Update Onboarding Flow**:
   - Modify LLM prompt to return JSON format (see example above)
   - Call `/api/programs/create` instead of saving text blob

4. **Deploy & Test**:
   - Test new program creation
   - Verify workouts page displays correctly
   - Check RLS policies are working

---

## Testing Checklist

- [ ] SQL migration runs without errors
- [ ] Parser correctly handles Hebrew text
- [ ] Backfill script migrates legacy programs
- [ ] API route creates normalized programs
- [ ] Workouts page displays programs with progress
- [ ] RLS policies prevent unauthorized access
- [ ] New onboarding creates normalized data
- [ ] No random/demo content shown

---

## Key Benefits

1. **Relational Integrity**: Foreign keys, proper normalization
2. **Query Performance**: Indexed joins, efficient queries
3. **Workout Tracking**: Individual workout completion status
4. **Exercise Details**: Full exercise metadata (sets, reps, tempo)
5. **Progress Tracking**: Real-time completion statistics
6. **Scalability**: Easy to add features (workout notes, exercise substitutions, etc.)
7. **Data Safety**: RLS policies enforce owner-only access

---

## Files Created

1. `apps/web/supabase/migrations/001_normalized_programs.sql`
2. `apps/web/lib/db/workoutParser.ts`
3. `apps/web/lib/db/backfillPrograms.ts`
4. `apps/web/app/api/programs/create/route.ts`
5. `apps/web/lib/db/normalizedPrograms.ts` (see above)
6. `apps/web/app/(app)/workouts/page.tsx` (updated - see above)
7. `apps/web/lib/db/__tests__/workoutParser.test.ts` (see above)
