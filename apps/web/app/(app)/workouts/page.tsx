export const dynamic = "force-dynamic";

import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getUserProgramsWithWorkouts } from "@/lib/db/normalizedPrograms";
import { WorkoutsHeader } from "@/components/workouts/WorkoutsHeader";
import WorkoutDayCard from "@/components/workouts/WorkoutDayCard";
import texts from "@/lib/assistantTexts";

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
      <main dir="rtl" className="min-h-screen bg-[#0D0E0F] text-white p-4 main-safe">
        {texts.workouts.needToLogin}
      </main>
    );
  }

  let programsWithWorkouts = [];
  try {
    programsWithWorkouts = await getUserProgramsWithWorkouts(userId);
    console.log(`[Workouts] User ${userId} has ${programsWithWorkouts.length} programs:`,
      programsWithWorkouts.map(p => ({ id: p.program.id, workouts: p.workouts.length, progress: p.stats.progress })));
  } catch (e) {
    console.error("[Workouts] Error loading programs:", e);
    return (
      <main dir="rtl" className="min-h-screen bg-[#0D0E0F] text-white p-4 main-safe">
        <div className="rounded-xl border border-[#2a3036] bg-[#15181c] p-6 text-red-400">
          {texts.workouts.loadError}
        </div>
      </main>
    );
  }

  // Get the latest program's workouts
  const latestProgram = programsWithWorkouts.length > 0 ? programsWithWorkouts[0] : null;

  return (
    <>
      <WorkoutsHeader />
      <main dir="rtl" className="min-h-screen bg-[#0D0E0F] text-white px-4 pb-24 main-offset">
        {!latestProgram || latestProgram.workouts.length === 0 ? (
          <section className="mt-8 rounded-xl border border-[#2a3036] bg-[#15181c] p-8 text-center">
            <div className="text-xl mb-2">{texts.workouts.noPrograms}</div>
            <p className="text-[#B7C0C8] mb-4">
              {texts.workouts.noProgramsDescription}
            </p>
            <Link
              href="/onboarding"
              className="inline-block rounded-lg border border-[#E2F163] text-[#0e0f12] bg-[#E2F163] px-4 py-2 font-semibold"
            >
              {texts.workouts.newProgram}
            </Link>
          </section>
        ) : (
          <section className="flex flex-col gap-3">
            {latestProgram.workouts.map((workout) => (
              <WorkoutDayCard
                key={workout.id}
                dayNumber={workout.day_number}
                title={workout.title || texts.workouts.dayDefaultTitle.replace("{n}", String(workout.day_number))}
                completed={workout.completed}
                exercisesCount={workout.exercises.length}
                href={`/workouts/${latestProgram.program.id}/workout/${workout.id}`}
              />
            ))}
          </section>
        )}
      </main>
    </>
  );
}
