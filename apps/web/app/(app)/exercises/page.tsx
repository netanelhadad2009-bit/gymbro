import Link from "next/link";
import { Dumbbell, Search, Filter } from "lucide-react";
import { getExercises, getAllTags, checkIsAdmin } from "./_actions";
import { ExerciseBrowse } from "./_components/ExerciseBrowse";
import texts from "@/lib/assistantTexts";

export const dynamic = "force-dynamic";

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: { search?: string; muscle?: string; equipment?: string; difficulty?: string };
}) {
  const exercises = await getExercises({
    search: searchParams.search,
    primary_muscle: searchParams.muscle,
    equipment: searchParams.equipment,
    difficulty: searchParams.difficulty as any,
    is_active: true, // Only show active exercises to public
  });

  const tags = await getAllTags();
  const isAdmin = await checkIsAdmin();

  return (
    <main dir="rtl" className="min-h-screen bg-[#0D0E0F] text-white px-4 pb-24 main-safe">
      <header className="mb-6 pt-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Dumbbell size={28} className="text-[#E2F163]" />
            <h1 className="text-2xl font-bold">{texts.exercises.title}</h1>
          </div>
          {isAdmin && (
            <Link
              href="/exercises/admin"
              className="rounded-lg bg-[#E2F163] text-[#0e0f12] px-4 py-2 text-sm font-semibold"
            >
              {texts.exercises.manageExercises}
            </Link>
          )}
        </div>
        <p className="text-sm text-[#B7C0C8]">
          {texts.exercises.subtitle}
        </p>
      </header>

      <ExerciseBrowse
        initialExercises={exercises}
        tags={tags}
        initialFilters={{
          search: searchParams.search,
          muscle: searchParams.muscle,
          equipment: searchParams.equipment,
          difficulty: searchParams.difficulty,
        }}
      />
    </main>
  );
}
