"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Filter, Dumbbell, Eye } from "lucide-react";
import { ExerciseWithTags } from "@/lib/schemas/exercise";
import { PrimaryMuscleOptions, EquipmentOptions } from "@/lib/schemas/exercise";

interface ExerciseBrowseProps {
  initialExercises: ExerciseWithTags[];
  tags: Array<{ id: string; name_he: string }>;
  initialFilters: {
    search?: string;
    muscle?: string;
    equipment?: string;
    difficulty?: string;
  };
}

export function ExerciseBrowse({ initialExercises, tags, initialFilters }: ExerciseBrowseProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialFilters.search || "");
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    router.push(`/exercises?${params.toString()}`);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/exercises?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch("");
    router.push("/exercises");
  };

  const difficultyLabels: Record<string, string> = {
    beginner: "מתחיל",
    intermediate: "בינוני",
    advanced: "מתקדם",
  };

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B7C0C8]" size={20} />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="חיפוש תרגילים..."
            className="w-full bg-[#15181c] border border-[#2a3036] rounded-lg pr-10 pl-4 py-3 text-white placeholder:text-[#B7C0C8] focus:outline-none focus:border-[#E2F163]"
          />
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-[#E2F163] text-sm font-semibold"
        >
          <Filter size={16} />
          {showFilters ? "הסתר מסננים" : "הצג מסננים"}
        </button>
        {(initialFilters.muscle || initialFilters.equipment || initialFilters.difficulty || initialFilters.search) && (
          <button
            onClick={clearFilters}
            className="text-sm text-[#B7C0C8] hover:text-white"
          >
            נקה הכל
          </button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 rounded-lg bg-[#15181c] border border-[#2a3036] p-4 space-y-4">
          {/* Primary Muscle */}
          <div>
            <label className="block text-sm font-semibold mb-2">שריר ראשי</label>
            <select
              value={initialFilters.muscle || ""}
              onChange={(e) => handleFilterChange("muscle", e.target.value)}
              className="w-full bg-[#0e0f12] border border-[#2a3036] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#E2F163]"
            >
              <option value="">הכל</option>
              {PrimaryMuscleOptions.map((muscle) => (
                <option key={muscle} value={muscle}>
                  {muscle}
                </option>
              ))}
            </select>
          </div>

          {/* Equipment */}
          <div>
            <label className="block text-sm font-semibold mb-2">ציוד</label>
            <select
              value={initialFilters.equipment || ""}
              onChange={(e) => handleFilterChange("equipment", e.target.value)}
              className="w-full bg-[#0e0f12] border border-[#2a3036] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#E2F163]"
            >
              <option value="">הכל</option>
              {EquipmentOptions.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-semibold mb-2">דרגת קושי</label>
            <select
              value={initialFilters.difficulty || ""}
              onChange={(e) => handleFilterChange("difficulty", e.target.value)}
              className="w-full bg-[#0e0f12] border border-[#2a3036] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#E2F163]"
            >
              <option value="">הכל</option>
              <option value="beginner">מתחיל</option>
              <option value="intermediate">בינוני</option>
              <option value="advanced">מתקדם</option>
            </select>
          </div>
        </div>
      )}

      {/* Exercise Grid */}
      {initialExercises.length === 0 ? (
        <div className="text-center py-12">
          <Dumbbell size={48} className="mx-auto text-[#2a3036] mb-4" />
          <p className="text-[#B7C0C8]">לא נמצאו תרגילים</p>
          <button
            onClick={clearFilters}
            className="mt-4 text-[#E2F163] text-sm font-semibold"
          >
            נקה מסננים
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialExercises.map((exercise) => (
            <Link
              key={exercise.id}
              href={`/exercises/${exercise.id}`}
              className="group rounded-lg bg-[#15181c] border border-[#2a3036] p-4 hover:border-[#E2F163] transition-colors"
            >
              {/* Thumbnail or Placeholder */}
              <div className="aspect-video bg-[#0e0f12] rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {exercise.thumb_url ? (
                  <img
                    src={exercise.thumb_url}
                    alt={exercise.name_he}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Dumbbell size={48} className="text-[#2a3036]" />
                )}
              </div>

              {/* Exercise Info */}
              <h3 className="font-semibold mb-2 group-hover:text-[#E2F163] transition-colors">
                {exercise.name_he}
              </h3>

              <div className="flex items-center gap-2 text-xs text-[#B7C0C8] mb-2">
                {exercise.primary_muscle && (
                  <span className="bg-[#0e0f12] px-2 py-1 rounded">
                    {exercise.primary_muscle}
                  </span>
                )}
                {exercise.difficulty && (
                  <span className="bg-[#0e0f12] px-2 py-1 rounded">
                    {difficultyLabels[exercise.difficulty]}
                  </span>
                )}
              </div>

              {/* Tags */}
              {exercise.tags && exercise.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {exercise.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="text-xs bg-[#E2F163]/10 text-[#E2F163] px-2 py-0.5 rounded"
                    >
                      {tag.name_he}
                    </span>
                  ))}
                  {exercise.tags.length > 3 && (
                    <span className="text-xs text-[#B7C0C8]">
                      +{exercise.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* View Button */}
              <div className="flex items-center gap-1 text-[#E2F163] text-sm font-semibold mt-3">
                <Eye size={16} />
                <span>צפייה</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
