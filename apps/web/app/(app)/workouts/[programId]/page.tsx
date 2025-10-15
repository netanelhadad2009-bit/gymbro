export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Calendar, Dumbbell } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getProgramWithWorkouts } from "@/lib/db/normalizedPrograms";
import texts from "@/lib/assistantTexts";

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export default async function ProgramDetailPage({
  params,
}: {
  params: { programId: string };
}) {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }

  const programData = await getProgramWithWorkouts(params.programId);

  if (!programData) {
    return (
      <div className="min-h-screen bg-[#0e0f12] pb-24" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-[#15181c] rounded-xl p-8 border border-[#2a3036] text-center">
            <p className="text-red-400">{texts.programDetail.notFound}</p>
          </div>
        </div>
      </div>
    );
  }

  const { program, workouts, stats } = programData;

  const goalHe =
    program.goal === "gain"
      ? texts.goals.gain
      : program.goal === "loss"
      ? texts.goals.loss
      : program.goal === "recomp"
      ? texts.goals.recomp
      : null;

  const displayTitle = program.title || (goalHe ? `${texts.goals.programWithGoal} ${goalHe}` : texts.goals.myProgram);

  return (
    <div className="min-h-screen bg-[#0e0f12] pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-[#15181c] border-b border-[#2a3036] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/workouts"
            className="flex items-center gap-2 text-[#b7c0c8] hover:text-white transition-colors mb-4"
          >
            <ArrowRight size={20} />
            {texts.workouts.backToWorkouts}
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{displayTitle}</h1>
              {program.days_estimate && (
                <p className="text-[#b7c0c8] mt-1">
                  {texts.programDetail.programFor}{program.days_estimate} {texts.general.days}
                </p>
              )}
            </div>
            {program.days_estimate && (
              <span className="text-sm rounded-full border border-[#E2F163] text-[#0e0f12] bg-[#E2F163] px-3 py-1">
                {program.days_estimate} {texts.general.days}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-[#15181c] rounded-xl p-6 border border-[#2a3036]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">{texts.programDetail.progressTitle}</h2>
            <span className="text-[#b7c0c8]">
              {stats.completed} / {stats.total} {texts.workouts.workoutsLabel}
            </span>
          </div>
          <div className="w-full bg-[#2a3036] rounded-full h-3">
            <div
              className="bg-[#E2F163] h-3 rounded-full transition-all duration-300"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
          <p className="text-sm text-[#b7c0c8] mt-2">{stats.progress}% {texts.programDetail.completed}</p>
        </div>
      </div>

      {/* Workouts List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h2 className="text-2xl font-bold text-white mb-4">{texts.programDetail.workoutsTitle}</h2>
        {workouts.length === 0 ? (
          <div className="bg-[#15181c] rounded-xl p-8 border border-[#2a3036] text-center">
            <p className="text-[#b7c0c8]">{texts.programDetail.noWorkouts}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {workouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                programId={params.programId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface WorkoutCardProps {
  workout: {
    id: string;
    day_number: number;
    title: string;
    notes: string | null;
    completed: boolean;
    exercises: Array<{
      id: string;
      name: string;
      sets: number | null;
      reps: string | null;
    }>;
  };
  programId: string;
}

function WorkoutCard({ workout, programId }: WorkoutCardProps) {
  const exerciseCount = workout.exercises.length;

  return (
    <Link
      href={`/workouts/${programId}/workout/${workout.id}`}
      className="block bg-[#15181c] rounded-xl p-5 border border-[#2a3036] hover:border-[#E2F163] transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-[#E2F163] bg-[#E2F163]/10 px-2 py-1 rounded">
              {texts.programDetail.day} {workout.day_number}
            </span>
            {workout.completed && (
              <span className="text-xs text-green-400">✓ {texts.workouts.completed}</span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white">{workout.title}</h3>
          {workout.notes && (
            <p className="text-sm text-[#b7c0c8] mt-1">{workout.notes}</p>
          )}
        </div>
        <Dumbbell
          size={24}
          className={workout.completed ? "text-green-400" : "text-[#b7c0c8]"}
        />
      </div>

      <div className="flex items-center gap-4 text-sm text-[#b7c0c8]">
        <div className="flex items-center gap-1">
          <Calendar size={14} />
          <span>{exerciseCount} {texts.workouts.exercises}</span>
        </div>
      </div>

      {/* Exercise Preview */}
      {workout.exercises.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#2a3036]">
          <p className="text-xs text-[#b7c0c8] mb-2">{texts.workouts.exercisesLabel}</p>
          <div className="flex flex-wrap gap-2">
            {workout.exercises.slice(0, 3).map((exercise) => (
              <span
                key={exercise.id}
                className="text-xs bg-[#2a3036] text-[#b7c0c8] px-2 py-1 rounded"
              >
                {exercise.name}
                {exercise.sets && exercise.reps && ` (${exercise.sets}×${exercise.reps})`}
              </span>
            ))}
            {workout.exercises.length > 3 && (
              <span className="text-xs text-[#b7c0c8] px-2 py-1">
                +{workout.exercises.length - 3} {texts.workouts.more}
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}
