# Exercise Library - Complete Implementation Guide

This document contains all remaining code for the Exercise Library feature.

## Completed Files

✅ `/apps/web/supabase/migrations/002_exercise_library.sql` - Database tables and RLS
✅ `/apps/web/supabase/migrations/003_exercise_storage_buckets.sql` - Storage buckets
✅ `/apps/web/lib/schemas/exercise.ts` - Zod schemas and types
✅ `/apps/web/lib/storage/exerciseStorage.ts` - Upload helpers
✅ `/apps/web/app/(app)/exercises/_actions.ts` - Server actions
✅ `/apps/web/app/(app)/exercises/page.tsx` - Public browse page
✅ `/apps/web/app/(app)/exercises/_components/ExerciseBrowse.tsx` - Browse component

## Remaining Files

### 1. Exercise Details Page

**File:** `/apps/web/app/(app)/exercises/[id]/page.tsx`

```typescript
import { notFound } from "next/navigation";
import Link from "next/link";
import { Dumbbell, ChevronLeft, Video, Clock, Repeat, Zap } from "lucide-react";
import { getExerciseById } from "../_actions";

export const dynamic = "force-dynamic";

export default async function ExerciseDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const exercise = await getExerciseById(params.id);

  if (!exercise) {
    notFound();
  }

  const difficultyLabels: Record<string, string> = {
    beginner: "מתחיל",
    intermediate: "בינוני",
    advanced: "מתקדם",
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#0e0f12] text-white px-4 py-5 pb-24">
      {/* Header */}
      <header className="mb-6">
        <Link
          href="/exercises"
          className="inline-flex items-center gap-1 text-[#E2F163] text-sm font-semibold mb-4"
        >
          <ChevronLeft size={16} />
          <span>חזרה לספרייה</span>
        </Link>

        <h1 className="text-2xl font-bold mb-2">{exercise.name_he}</h1>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {exercise.primary_muscle && (
            <span className="bg-[#15181c] border border-[#2a3036] px-3 py-1 rounded-lg">
              {exercise.primary_muscle}
            </span>
          )}
          {exercise.difficulty && (
            <span className="bg-[#15181c] border border-[#2a3036] px-3 py-1 rounded-lg">
              {difficultyLabels[exercise.difficulty]}
            </span>
          )}
          {exercise.equipment && (
            <span className="bg-[#15181c] border border-[#2a3036] px-3 py-1 rounded-lg">
              {exercise.equipment}
            </span>
          )}
        </div>
      </header>

      {/* Video */}
      {exercise.video_url && (
        <div className="mb-6 rounded-lg overflow-hidden bg-[#15181c] border border-[#2a3036]">
          <video
            src={exercise.video_url}
            controls
            poster={exercise.thumb_url || undefined}
            className="w-full aspect-video"
          >
            הדפדפן שלך לא תומך בהצגת וידאו
          </video>
        </div>
      )}

      {/* Thumbnail Only (if no video) */}
      {!exercise.video_url && exercise.thumb_url && (
        <div className="mb-6 rounded-lg overflow-hidden bg-[#15181c] border border-[#2a3036]">
          <img
            src={exercise.thumb_url}
            alt={exercise.name_he}
            className="w-full aspect-video object-cover"
          />
        </div>
      )}

      {/* Description */}
      {exercise.description_he && (
        <section className="mb-6 rounded-lg bg-[#15181c] border border-[#2a3036] p-4">
          <h2 className="text-lg font-semibold mb-2">תיאור</h2>
          <p className="text-[#B7C0C8] leading-relaxed whitespace-pre-wrap">
            {exercise.description_he}
          </p>
        </section>
      )}

      {/* Defaults */}
      {(exercise.sets_default || exercise.reps_default || exercise.rest_seconds_default || exercise.tempo_default) && (
        <section className="mb-6 rounded-lg bg-[#15181c] border border-[#2a3036] p-4">
          <h2 className="text-lg font-semibold mb-3">הגדרות מומלצות</h2>
          <div className="grid grid-cols-2 gap-3">
            {exercise.sets_default && (
              <div className="flex items-center gap-2">
                <Repeat size={20} className="text-[#E2F163]" />
                <div>
                  <div className="text-xs text-[#B7C0C8]">סטים</div>
                  <div className="font-semibold">{exercise.sets_default}</div>
                </div>
              </div>
            )}
            {exercise.reps_default && (
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-[#E2F163]" />
                <div>
                  <div className="text-xs text-[#B7C0C8]">חזרות</div>
                  <div className="font-semibold">{exercise.reps_default}</div>
                </div>
              </div>
            )}
            {exercise.rest_seconds_default && (
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-[#E2F163]" />
                <div>
                  <div className="text-xs text-[#B7C0C8]">מנוחה</div>
                  <div className="font-semibold">{exercise.rest_seconds_default} שניות</div>
                </div>
              </div>
            )}
            {exercise.tempo_default && (
              <div className="flex items-center gap-2">
                <Video size={20} className="text-[#E2F163]" />
                <div>
                  <div className="text-xs text-[#B7C0C8]">טמפו</div>
                  <div className="font-semibold">{exercise.tempo_default}</div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Secondary Muscles */}
      {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
        <section className="mb-6 rounded-lg bg-[#15181c] border border-[#2a3036] p-4">
          <h2 className="text-lg font-semibold mb-2">שרירים משניים</h2>
          <div className="flex flex-wrap gap-2">
            {exercise.secondary_muscles.map((muscle, idx) => (
              <span
                key={idx}
                className="bg-[#0e0f12] px-3 py-1 rounded text-sm"
              >
                {muscle}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Tags */}
      {exercise.tags && exercise.tags.length > 0 && (
        <section className="mb-6 rounded-lg bg-[#15181c] border border-[#2a3036] p-4">
          <h2 className="text-lg font-semibold mb-2">תגיות</h2>
          <div className="flex flex-wrap gap-2">
            {exercise.tags.map((tag) => (
              <span
                key={tag.id}
                className="bg-[#E2F163]/10 text-[#E2F163] px-3 py-1 rounded text-sm"
              >
                {tag.name_he}
              </span>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
```

---

### 2. Admin List Page

**File:** `/apps/web/app/(app)/exercises/admin/page.tsx`

```typescript
import Link from "next/link";
import { redirect } from "next/navigation";
import { Dumbbell, Plus, Upload, FileJson, FileText, ChevronLeft } from "lucide-react";
import { getExercises, checkIsAdmin } from "../_actions";
import { AdminExerciseList } from "../_components/AdminExerciseList";

export const dynamic = "force-dynamic";

export default async function AdminExercisesPage() {
  const isAdmin = await checkIsAdmin();

  if (!isAdmin) {
    redirect("/exercises");
  }

  const exercises = await getExercises({ is_active: undefined }); // Show all, including inactive

  return (
    <main dir="rtl" className="min-h-screen bg-[#0e0f12] text-white px-4 py-5 pb-24">
      <header className="mb-6">
        <Link
          href="/exercises"
          className="inline-flex items-center gap-1 text-[#E2F163] text-sm font-semibold mb-4"
        >
          <ChevronLeft size={16} />
          <span>חזרה לספרייה</span>
        </Link>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Dumbbell size={28} className="text-[#E2F163]" />
            <h1 className="text-2xl font-bold">ניהול תרגילים</h1>
          </div>
        </div>
        <p className="text-sm text-[#B7C0C8]">
          צור, ערוך או ייבא תרגילים לספרייה
        </p>
      </header>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/exercises/admin/new"
          className="flex items-center gap-2 rounded-lg bg-[#E2F163] text-[#0e0f12] px-4 py-2 font-semibold"
        >
          <Plus size={20} />
          <span>תרגיל חדש</span>
        </Link>
        <Link
          href="/exercises/admin/import-json"
          className="flex items-center gap-2 rounded-lg border border-[#E2F163] text-[#E2F163] px-4 py-2 font-semibold"
        >
          <FileJson size={20} />
          <span>ייבוא JSON</span>
        </Link>
        <Link
          href="/exercises/admin/import-csv"
          className="flex items-center gap-2 rounded-lg border border-[#E2F163] text-[#E2F163] px-4 py-2 font-semibold"
        >
          <FileText size={20} />
          <span>ייבוא CSV</span>
        </Link>
      </div>

      {/* Exercise List */}
      <AdminExerciseList exercises={exercises} />
    </main>
  );
}
```

---

### 3. Admin Exercise List Component

**File:** `/apps/web/app/(app)/exercises/_components/AdminExerciseList.tsx`

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { ExerciseWithTags } from "@/lib/schemas/exercise";
import { deleteExercise } from "../_actions";
import { useRouter } from "next/navigation";

interface AdminExerciseListProps {
  exercises: ExerciseWithTags[];
}

export function AdminExerciseList({ exercises }: AdminExerciseListProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`האם למחוק את "${name}"?`)) return;

    setDeleting(id);
    const result = await deleteExercise(id);

    if (result.success) {
      router.refresh();
    } else {
      alert(`שגיאה: ${result.error}`);
    }
    setDeleting(null);
  };

  const difficultyLabels: Record<string, string> = {
    beginner: "מתחיל",
    intermediate: "בינוני",
    advanced: "מתקדם",
  };

  if (exercises.length === 0) {
    return (
      <div className="text-center py-12 rounded-lg bg-[#15181c] border border-[#2a3036]">
        <p className="text-[#B7C0C8] mb-4">אין תרגילים בספרייה</p>
        <Link
          href="/exercises/admin/new"
          className="inline-block rounded-lg bg-[#E2F163] text-[#0e0f12] px-4 py-2 font-semibold"
        >
          צור תרגיל ראשון
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {exercises.map((exercise) => (
        <div
          key={exercise.id}
          className="rounded-lg bg-[#15181c] border border-[#2a3036] p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{exercise.name_he}</h3>
                {!exercise.is_active && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                    לא פעיל
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-[#B7C0C8] mb-2">
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
                {exercise.equipment && (
                  <span className="bg-[#0e0f12] px-2 py-1 rounded">
                    {exercise.equipment}
                  </span>
                )}
              </div>

              {exercise.tags && exercise.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
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
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link
                href={`/exercises/${exercise.id}`}
                className="p-2 rounded hover:bg-[#0e0f12]"
                title="צפייה"
              >
                <Eye size={18} className="text-[#B7C0C8]" />
              </Link>
              <Link
                href={`/exercises/admin/${exercise.id}/edit`}
                className="p-2 rounded hover:bg-[#0e0f12]"
                title="עריכה"
              >
                <Edit size={18} className="text-[#E2F163]" />
              </Link>
              <button
                onClick={() => handleDelete(exercise.id, exercise.name_he)}
                disabled={deleting === exercise.id}
                className="p-2 rounded hover:bg-[#0e0f12] disabled:opacity-50"
                title="מחיקה"
              >
                <Trash2
                  size={18}
                  className={deleting === exercise.id ? "text-[#B7C0C8]" : "text-red-400"}
                />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### 4. Admin Create/Edit Form Component

**File:** `/apps/web/app/(app)/exercises/_components/ExerciseForm.tsx`

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader } from "lucide-react";
import { ExerciseInput, ExerciseWithTags, PrimaryMuscleOptions, EquipmentOptions } from "@/lib/schemas/exercise";
import { createExercise, updateExercise } from "../_actions";
import { uploadExerciseVideo, uploadExerciseThumbnail } from "@/lib/storage/exerciseStorage";

interface ExerciseFormProps {
  exercise?: ExerciseWithTags;
  mode: "create" | "edit";
}

export function ExerciseForm({ exercise, mode }: ExerciseFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<ExerciseInput>({
    name_he: exercise?.name_he || "",
    description_he: exercise?.description_he || "",
    primary_muscle: exercise?.primary_muscle || "",
    secondary_muscles: exercise?.secondary_muscles || [],
    equipment: exercise?.equipment || "",
    difficulty: exercise?.difficulty || "beginner",
    sets_default: exercise?.sets_default || null,
    reps_default: exercise?.reps_default || "",
    tempo_default: exercise?.tempo_default || "",
    rest_seconds_default: exercise?.rest_seconds_default || null,
    video_url: exercise?.video_url || "",
    thumb_url: exercise?.thumb_url || "",
    is_active: exercise?.is_active ?? true,
    tags: exercise?.tags?.map(t => t.name_he) || [],
  });

  const [secondaryMuscleInput, setSecondaryMuscleInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddSecondaryMuscle = () => {
    if (!secondaryMuscleInput.trim()) return;
    if (formData.secondary_muscles?.includes(secondaryMuscleInput.trim())) return;

    setFormData({
      ...formData,
      secondary_muscles: [...(formData.secondary_muscles || []), secondaryMuscleInput.trim()],
    });
    setSecondaryMuscleInput("");
  };

  const handleRemoveSecondaryMuscle = (muscle: string) => {
    setFormData({
      ...formData,
      secondary_muscles: formData.secondary_muscles?.filter(m => m !== muscle) || [],
    });
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (formData.tags?.includes(tagInput.trim())) return;

    setFormData({
      ...formData,
      tags: [...(formData.tags || []), tagInput.trim()],
    });
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(t => t !== tag) || [],
    });
  };

  const handleUploadFiles = async (exerciseId: string) => {
    let videoUrl = formData.video_url;
    let thumbUrl = formData.thumb_url;

    if (videoFile) {
      const videoResult = await uploadExerciseVideo(videoFile, exerciseId);
      if (videoResult.success && videoResult.url) {
        videoUrl = videoResult.url;
      } else {
        throw new Error(`העלאת וידאו נכשלה: ${videoResult.error}`);
      }
    }

    if (thumbFile) {
      const thumbResult = await uploadExerciseThumbnail(thumbFile, exerciseId);
      if (thumbResult.success && thumbResult.url) {
        thumbUrl = thumbResult.url;
      } else {
        throw new Error(`העלאת תמונה נכשלה: ${thumbResult.error}`);
      }
    }

    return { videoUrl, thumbUrl };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    try {
      // For create mode, handle file uploads after creating exercise
      if (mode === "create") {
        const result = await createExercise(formData);

        if (!result.success || !result.id) {
          setErrors({ submit: result.error || "שגיאה ביצירת תרגיל" });
          setSaving(false);
          return;
        }

        // Upload files if provided
        if (videoFile || thumbFile) {
          setUploading(true);
          const { videoUrl, thumbUrl } = await handleUploadFiles(result.id);

          // Update exercise with file URLs
          await updateExercise(result.id, {
            ...formData,
            video_url: videoUrl || formData.video_url,
            thumb_url: thumbUrl || formData.thumb_url,
          });
          setUploading(false);
        }

        router.push("/exercises/admin");
        router.refresh();
      } else {
        // Edit mode
        if (!exercise?.id) return;

        // Upload files if provided
        let finalData = { ...formData };
        if (videoFile || thumbFile) {
          setUploading(true);
          const { videoUrl, thumbUrl } = await handleUploadFiles(exercise.id);
          finalData = {
            ...finalData,
            video_url: videoUrl || formData.video_url,
            thumb_url: thumbUrl || formData.thumb_url,
          };
          setUploading(false);
        }

        const result = await updateExercise(exercise.id, finalData);

        if (!result.success) {
          setErrors({ submit: result.error || "שגיאה בעדכון תרגיל" });
          setSaving(false);
          return;
        }

        router.push("/exercises/admin");
        router.refresh();
      }
    } catch (error) {
      console.error("Submit error:", error);
      setErrors({ submit: error instanceof Error ? error.message : "שגיאה לא צפויה" });
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          שם התרגיל <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.name_he}
          onChange={(e) => setFormData({ ...formData, name_he: e.target.value })}
          className="w-full bg-[#15181c] border border-[#2a3036] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#E2F163]"
          placeholder="לחיצת חזה במשקולות"
          required
        />
        {errors.name_he && <p className="text-red-400 text-sm mt-1">{errors.name_he}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold mb-2">תיאור</label>
        <textarea
          value={formData.description_he || ""}
          onChange={(e) => setFormData({ ...formData, description_he: e.target.value })}
          className="w-full bg-[#15181c] border border-[#2a3036] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#E2F163] min-h-[120px]"
          placeholder="תיאור מפורט של ביצוע התרגיל..."
        />
      </div>

      {/* Primary Muscle */}
      <div>
        <label className="block text-sm font-semibold mb-2">שריר ראשי</label>
        <select
          value={formData.primary_muscle || ""}
          onChange={(e) => setFormData({ ...formData, primary_muscle: e.target.value })}
          className="w-full bg-[#15181c] border border-[#2a3036] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#E2F163]"
        >
          <option value="">בחר שריר</option>
          {PrimaryMuscleOptions.map((muscle) => (
            <option key={muscle} value={muscle}>
              {muscle}
            </option>
          ))}
        </select>
      </div>

      {/* Secondary Muscles */}
      <div>
        <label className="block text-sm font-semibold mb-2">שרירים משניים</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={secondaryMuscleInput}
            onChange={(e) => setSecondaryMuscleInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSecondaryMuscle())}
            className="flex-1 bg-[#15181c] border border-[#2a3036] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#E2F163]"
            placeholder="הוסף שריר משני..."
          />
          <button
            type="button"
            onClick={handleAddSecondaryMuscle}
            className="rounded-lg bg-[#E2F163] text-[#0e0f12] px-4 py-2 font-semibold"
          >
            הוסף
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.secondary_muscles?.map((muscle) => (
            <span
              key={muscle}
              className="inline-flex items-center gap-1 bg-[#15181c] border border-[#2a3036] px-3 py-1 rounded"
            >
              {muscle}
              <button
                type="button"
                onClick={() => handleRemoveSecondaryMuscle(muscle)}
                className="text-red-400"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div>
        <label className="block text-sm font-semibold mb-2">ציוד</label>
        <select
          value={formData.equipment || ""}
          onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
          className="w-full bg-[#15181c] border border-[#2a3036] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#E2F163]"
        >
          <option value="">בחר ציוד</option>
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
          value={formData.difficulty}
          onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
          className="w-full bg-[#15181c] border border-[#2a3036] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#E2F163]"
        >
          <option value="beginner">מתחיל</option>
          <option value="intermediate">בינוני</option>
          <option value="advanced">מתקדם</option>
        </select>
      </div>

      {/* Defaults Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">סטים</label>
          <input
            type="number"
            value={formData.sets_default || ""}
            onChange={(e) => setFormData({ ...formData, sets_default: e.target.value ? parseInt(e.target.value) : null })}
            className="w-full bg-[#15181c] border border-[#2a3036] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#E2F163]"
            placeholder="3"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">חזרות</label>
          <input
            type="text"
            value={formData.reps_default || ""}
            onChange={(e) => setFormData({ ...formData, reps_default: e.target.value })}
            className="w-full bg-[#15181c] border border-[#2a3036] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#E2F163]"
            placeholder="8-12"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">מנוחה (שניות)</label>
          <input
            type="number"
            value={formData.rest_seconds_default || ""}
            onChange={(e) => setFormData({ ...formData, rest_seconds_default: e.target.value ? parseInt(e.target.value) : null })}
            className="w-full bg-[#15181c] border border-[#2a3036] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#E2F163]"
            placeholder="90"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">טמפו</label>
          <input
            type="text"
            value={formData.tempo_default || ""}
            onChange={(e) => setFormData({ ...formData, tempo_default: e.target.value })}
            className="w-full bg-[#15181c] border border-[#2a3036] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#E2F163]"
            placeholder="3-1-1"
          />
        </div>
      </div>

      {/* Video Upload */}
      <div>
        <label className="block text-sm font-semibold mb-2">וידאו</label>
        {formData.video_url && !videoFile && (
          <div className="mb-2 text-sm text-[#B7C0C8]">
            קיים וידאו: <a href={formData.video_url} target="_blank" className="text-[#E2F163]">צפייה</a>
          </div>
        )}
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
          className="w-full bg-[#15181c] border border-[#2a3036] rounded-lg px-4 py-3 text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-[#E2F163] file:text-[#0e0f12] file:font-semibold"
        />
        {videoFile && <p className="text-sm text-[#E2F163] mt-1">נבחר: {videoFile.name}</p>}
      </div>

      {/* Thumbnail Upload */}
      <div>
        <label className="block text-sm font-semibold mb-2">תמונה ממוזערת</label>
        {formData.thumb_url && !thumbFile && (
          <div className="mb-2">
            <img src={formData.thumb_url} alt="Thumbnail" className="w-32 h-32 object-cover rounded" />
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setThumbFile(e.target.files?.[0] || null)}
          className="w-full bg-[#15181c] border border-[#2a3036] rounded-lg px-4 py-3 text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-[#E2F163] file:text-[#0e0f12] file:font-semibold"
        />
        {thumbFile && <p className="text-sm text-[#E2F163] mt-1">נבחר: {thumbFile.name}</p>}
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-semibold mb-2">תגיות</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
            className="flex-1 bg-[#15181c] border border-[#2a3036] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#E2F163]"
            placeholder="הוסף תג..."
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="rounded-lg bg-[#E2F163] text-[#0e0f12] px-4 py-2 font-semibold"
          >
            הוסף
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.tags?.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-[#E2F163]/10 text-[#E2F163] px-3 py-1 rounded"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="text-red-400"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Is Active */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="w-5 h-5 accent-[#E2F163]"
        />
        <label htmlFor="is_active" className="text-sm font-semibold">
          תרגיל פעיל (יוצג למשתמשים)
        </label>
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/50 p-4 text-red-400">
          {errors.submit}
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || uploading}
          className="flex-1 rounded-lg bg-[#E2F163] text-[#0e0f12] px-6 py-3 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {(saving || uploading) && <Loader size={20} className="animate-spin" />}
          {uploading ? "מעלה קבצים..." : saving ? "שומר..." : mode === "create" ? "צור תרגיל" : "עדכן תרגיל"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={saving || uploading}
          className="rounded-lg border border-[#2a3036] text-white px-6 py-3 font-semibold disabled:opacity-50"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
```

---

### 5. Admin Create Page

**File:** `/apps/web/app/(app)/exercises/admin/new/page.tsx`

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Dumbbell } from "lucide-react";
import { checkIsAdmin } from "../../_actions";
import { ExerciseForm } from "../../_components/ExerciseForm";

export default async function NewExercisePage() {
  const isAdmin = await checkIsAdmin();

  if (!isAdmin) {
    redirect("/exercises");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#0e0f12] text-white px-4 py-5 pb-24">
      <header className="mb-6">
        <Link
          href="/exercises/admin"
          className="inline-flex items-center gap-1 text-[#E2F163] text-sm font-semibold mb-4"
        >
          <ChevronLeft size={16} />
          <span>חזרה לניהול</span>
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <Dumbbell size={28} className="text-[#E2F163]" />
          <h1 className="text-2xl font-bold">תרגיל חדש</h1>
        </div>
        <p className="text-sm text-[#B7C0C8]">
          מלא את הפרטים ליצירת תרגיל חדש בספרייה
        </p>
      </header>

      <ExerciseForm mode="create" />
    </main>
  );
}
```

---

### 6. Admin Edit Page

**File:** `/apps/web/app/(app)/exercises/admin/[id]/edit/page.tsx`

```typescript
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Dumbbell } from "lucide-react";
import { checkIsAdmin, getExerciseById } from "../../../_actions";
import { ExerciseForm } from "../../../_components/ExerciseForm";

export default async function EditExercisePage({
  params,
}: {
  params: { id: string };
}) {
  const isAdmin = await checkIsAdmin();

  if (!isAdmin) {
    redirect("/exercises");
  }

  const exercise = await getExerciseById(params.id);

  if (!exercise) {
    notFound();
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#0e0f12] text-white px-4 py-5 pb-24">
      <header className="mb-6">
        <Link
          href="/exercises/admin"
          className="inline-flex items-center gap-1 text-[#E2F163] text-sm font-semibold mb-4"
        >
          <ChevronLeft size={16} />
          <span>חזרה לניהול</span>
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <Dumbbell size={28} className="text-[#E2F163]" />
          <h1 className="text-2xl font-bold">עריכת תרגיל</h1>
        </div>
        <p className="text-sm text-[#B7C0C8]">{exercise.name_he}</p>
      </header>

      <ExerciseForm mode="edit" exercise={exercise} />
    </main>
  );
}
```

---

### 7. JSON Import Page

**File:** `/apps/web/app/(app)/exercises/admin/import-json/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileJson, Upload, Loader } from "lucide-react";
import { bulkImportJSON } from "../../_actions";

export default function ImportJSONPage() {
  const router = useRouter();
  const [jsonText, setJsonText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);

  const handleImport = async () => {
    setImporting(true);
    setResult(null);

    const importResult = await bulkImportJSON(jsonText);
    setResult(importResult);
    setImporting(false);

    if (importResult.success) {
      setTimeout(() => {
        router.push("/exercises/admin");
        router.refresh();
      }, 2000);
    }
  };

  const exampleJSON = `{
  "exercises": [
    {
      "name_he": "לחיצת חזה במשקולות",
      "description_he": "שכבו על ספסל, רגליים על הרצפה, דחיפה עם שליטה.",
      "primary_muscle": "חזה",
      "secondary_muscles": ["יד אחורית", "כתפיים"],
      "equipment": "משקולות",
      "difficulty": "beginner",
      "sets_default": 3,
      "reps_default": "8-12",
      "rest_seconds_default": 90,
      "tags": ["לחיצה", "חזה"]
    }
  ]
}`;

  return (
    <main dir="rtl" className="min-h-screen bg-[#0e0f12] text-white px-4 py-5 pb-24">
      <header className="mb-6">
        <Link
          href="/exercises/admin"
          className="inline-flex items-center gap-1 text-[#E2F163] text-sm font-semibold mb-4"
        >
          <ChevronLeft size={16} />
          <span>חזרה לניהול</span>
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <FileJson size={28} className="text-[#E2F163]" />
          <h1 className="text-2xl font-bold">ייבוא JSON</h1>
        </div>
        <p className="text-sm text-[#B7C0C8]">
          הדבק JSON עם רשימת תרגילים בפורמט הנדרש
        </p>
      </header>

      {/* Example */}
      <section className="mb-6 rounded-lg bg-[#15181c] border border-[#2a3036] p-4">
        <h3 className="text-sm font-semibold mb-2">דוגמה לפורמט:</h3>
        <pre className="text-xs bg-[#0e0f12] p-3 rounded overflow-x-auto text-[#B7C0C8]">
          {exampleJSON}
        </pre>
      </section>

      {/* Input */}
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">הדבק JSON כאן:</label>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          className="w-full bg-[#15181c] border border-[#2a3036] rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#E2F163] min-h-[300px]"
          placeholder={exampleJSON}
        />
      </div>

      {/* Result */}
      {result && (
        <div
          className={`mb-4 rounded-lg border p-4 ${
            result.success
              ? "bg-green-500/10 border-green-500/50 text-green-400"
              : "bg-red-500/10 border-red-500/50 text-red-400"
          }`}
        >
          {result.success
            ? `✓ יובאו ${result.count} תרגילים בהצלחה! מעביר לניהול...`
            : `✗ שגיאה: ${result.error}`}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleImport}
          disabled={!jsonText.trim() || importing}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#E2F163] text-[#0e0f12] px-6 py-3 font-semibold disabled:opacity-50"
        >
          {importing ? (
            <>
              <Loader size={20} className="animate-spin" />
              <span>מייבא...</span>
            </>
          ) : (
            <>
              <Upload size={20} />
              <span>ייבוא</span>
            </>
          )}
        </button>
        <button
          onClick={() => router.back()}
          disabled={importing}
          className="rounded-lg border border-[#2a3036] text-white px-6 py-3 font-semibold disabled:opacity-50"
        >
          ביטול
        </button>
      </div>
    </main>
  );
}
```

---

### 8. CSV Import Page

**File:** `/apps/web/app/(app)/exercises/admin/import-csv/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText, Upload, Loader } from "lucide-react";
import { bulkImportCSV } from "../../_actions";

export default function ImportCSVPage() {
  const router = useRouter();
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);

  const handleImport = async () => {
    setImporting(true);
    setResult(null);

    const importResult = await bulkImportCSV(csvText);
    setResult(importResult);
    setImporting(false);

    if (importResult.success) {
      setTimeout(() => {
        router.push("/exercises/admin");
        router.refresh();
      }, 2000);
    }
  };

  const exampleCSV = `name_he;description_he;primary_muscle;secondary_muscles;equipment;difficulty;sets_default;reps_default;tempo_default;rest_seconds_default;video_url;thumb_url;tags
לחיצת חזה במשקולות;שכבו על ספסל...;חזה;יד אחורית|כתפיים;משקולות;beginner;3;8-12;;90;;;לחיצה|חזה`;

  return (
    <main dir="rtl" className="min-h-screen bg-[#0e0f12] text-white px-4 py-5 pb-24">
      <header className="mb-6">
        <Link
          href="/exercises/admin"
          className="inline-flex items-center gap-1 text-[#E2F163] text-sm font-semibold mb-4"
        >
          <ChevronLeft size={16} />
          <span>חזרה לניהול</span>
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <FileText size={28} className="text-[#E2F163]" />
          <h1 className="text-2xl font-bold">ייבוא CSV</h1>
        </div>
        <p className="text-sm text-[#B7C0C8]">
          הדבק CSV עם רשימת תרגילים (מופרד בנקודה-פסיק)
        </p>
      </header>

      {/* Instructions */}
      <section className="mb-6 rounded-lg bg-[#15181c] border border-[#2a3036] p-4">
        <h3 className="text-sm font-semibold mb-2">הנחיות:</h3>
        <ul className="text-sm text-[#B7C0C8] space-y-1 list-disc list-inside">
          <li>הפרדה בין עמודות: נקודה-פסיק (;)</li>
          <li>שרירים משניים ותגיות: הפרדה בסימן | (pipe)</li>
          <li>שדות חובה: name_he</li>
        </ul>
        <h3 className="text-sm font-semibold mt-4 mb-2">דוגמה:</h3>
        <pre className="text-xs bg-[#0e0f12] p-3 rounded overflow-x-auto text-[#B7C0C8]">
          {exampleCSV}
        </pre>
      </section>

      {/* Input */}
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">הדבק CSV כאן:</label>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          className="w-full bg-[#15181c] border border-[#2a3036] rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#E2F163] min-h-[300px]"
          placeholder={exampleCSV}
        />
      </div>

      {/* Result */}
      {result && (
        <div
          className={`mb-4 rounded-lg border p-4 ${
            result.success
              ? "bg-green-500/10 border-green-500/50 text-green-400"
              : "bg-red-500/10 border-red-500/50 text-red-400"
          }`}
        >
          {result.success
            ? `✓ יובאו ${result.count} תרגילים בהצלחה! מעביר לניהול...`
            : `✗ שגיאה: ${result.error}`}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleImport}
          disabled={!csvText.trim() || importing}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#E2F163] text-[#0e0f12] px-6 py-3 font-semibold disabled:opacity-50"
        >
          {importing ? (
            <>
              <Loader size={20} className="animate-spin" />
              <span>מייבא...</span>
            </>
          ) : (
            <>
              <Upload size={20} />
              <span>ייבוא</span>
            </>
          )}
        </button>
        <button
          onClick={() => router.back()}
          disabled={importing}
          className="rounded-lg border border-[#2a3036] text-white px-6 py-3 font-semibold disabled:opacity-50"
        >
          ביטול
        </button>
      </div>
    </main>
  );
}
```

---

### 9. Exercise Picker Component (Reusable)

**File:** `/apps/web/app/(app)/exercises/_components/ExercisePicker.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { Search, X, Dumbbell } from "lucide-react";
import { ExerciseWithTags } from "@/lib/schemas/exercise";
import { getExercises } from "../_actions";

interface ExercisePickerProps {
  onSelect: (exercise: ExerciseWithTags) => void;
  onClose: () => void;
}

export function ExercisePicker({ onSelect, onClose }: ExercisePickerProps) {
  const [exercises, setExercises] = useState<ExerciseWithTags[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExercises();
  }, [search]);

  const loadExercises = async () => {
    setLoading(true);
    const data = await getExercises({ search, is_active: true });
    setExercises(data);
    setLoading(false);
  };

  const difficultyLabels: Record<string, string> = {
    beginner: "מתחיל",
    intermediate: "בינוני",
    advanced: "מתקדם",
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center">
      <div
        dir="rtl"
        className="bg-[#0e0f12] w-full md:max-w-2xl md:rounded-lg max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a3036]">
          <h2 className="text-xl font-bold">בחר תרגיל</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#15181c] rounded"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#2a3036]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B7C0C8]" size={20} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש תרגילים..."
              className="w-full bg-[#15181c] border border-[#2a3036] rounded-lg pr-10 pl-4 py-3 text-white placeholder:text-[#B7C0C8] focus:outline-none focus:border-[#E2F163]"
              autoFocus
            />
          </div>
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-[#B7C0C8]">טוען...</div>
          ) : exercises.length === 0 ? (
            <div className="text-center py-8">
              <Dumbbell size={48} className="mx-auto text-[#2a3036] mb-2" />
              <p className="text-[#B7C0C8]">לא נמצאו תרגילים</p>
            </div>
          ) : (
            <div className="space-y-2">
              {exercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => onSelect(exercise)}
                  className="w-full text-right rounded-lg bg-[#15181c] border border-[#2a3036] p-4 hover:border-[#E2F163] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 bg-[#0e0f12] rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {exercise.thumb_url ? (
                        <img
                          src={exercise.thumb_url}
                          alt={exercise.name_he}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Dumbbell size={24} className="text-[#2a3036]" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{exercise.name_he}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#B7C0C8]">
                        {exercise.primary_muscle && (
                          <span className="bg-[#0e0f12] px-2 py-0.5 rounded">
                            {exercise.primary_muscle}
                          </span>
                        )}
                        {exercise.difficulty && (
                          <span className="bg-[#0e0f12] px-2 py-0.5 rounded">
                            {difficultyLabels[exercise.difficulty]}
                          </span>
                        )}
                        {exercise.sets_default && exercise.reps_default && (
                          <span className="text-[#E2F163]">
                            {exercise.sets_default} × {exercise.reps_default}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### 10. README for Content Management

**File:** `/apps/web/docs/EXERCISE_LIBRARY_GUIDE.md`

```markdown
# Exercise Library - Content Management Guide

This guide explains how to add exercises to the GymBro exercise library.

## Prerequisites

1. **Admin Access**: Your user profile must have `is_admin = true` in the `profiles` table.
2. **Database Setup**: Run migrations `002_exercise_library.sql` and `003_exercise_storage_buckets.sql`.

## Setting Up Admin Access

### Option 1: Via Supabase Dashboard

1. Go to Supabase Dashboard → Table Editor
2. Open the `profiles` table
3. Find your user row (by `id` matching your auth user ID)
4. Set `is_admin` = `true`

### Option 2: Via SQL

```sql
UPDATE public.profiles
SET is_admin = true
WHERE id = 'YOUR_USER_ID_HERE';
```

## Adding Exercises

Once you have admin access, navigate to `/exercises/admin` to manage exercises.

### Method 1: Manual Creation

1. Click **"תרגיל חדש"** (New Exercise)
2. Fill in the form:
   - **Name** (required): Exercise name in Hebrew
   - **Description**: Detailed execution instructions
   - **Primary Muscle**: Main muscle group targeted
   - **Secondary Muscles**: Additional muscles involved
   - **Equipment**: Required equipment
   - **Difficulty**: beginner / intermediate / advanced
   - **Defaults**: Sets, reps, rest time, tempo
   - **Video**: Upload demonstration video (optional)
   - **Thumbnail**: Upload preview image (optional)
   - **Tags**: Categorization tags
   - **Active**: Toggle visibility to users
3. Click **"צור תרגיל"** (Create Exercise)

### Method 2: JSON Import

1. Click **"ייבוא JSON"** (Import JSON)
2. Paste JSON in this format:

```json
{
  "exercises": [
    {
      "name_he": "לחיצת חזה במשקולות",
      "description_he": "שכבו על ספסל, רגליים על הרצפה, דחיפה עם שליטה.",
      "primary_muscle": "חזה",
      "secondary_muscles": ["יד אחורית", "כתפיים"],
      "equipment": "משקולות",
      "difficulty": "beginner",
      "sets_default": 3,
      "reps_default": "8-12",
      "rest_seconds_default": 90,
      "video_url": "https://example.com/video.mp4",
      "thumb_url": "https://example.com/thumb.jpg",
      "tags": ["לחיצה", "חזה"]
    },
    {
      "name_he": "סקוואט",
      "description_he": "עמידה עם רגליים ברוחב כתפיים, ירידה עד 90 מעלות.",
      "primary_muscle": "רגליים",
      "secondary_muscles": ["בטן", "גב תחתון"],
      "equipment": "משקל גוף",
      "difficulty": "beginner",
      "sets_default": 4,
      "reps_default": "12-15",
      "rest_seconds_default": 60,
      "tags": ["רגליים", "גוף תחתון"]
    }
  ]
}
```

3. Click **"ייבוא"** (Import)

### Method 3: CSV Import

1. Click **"ייבוא CSV"** (Import CSV)
2. Paste CSV with semicolon (`;`) separator:

```csv
name_he;description_he;primary_muscle;secondary_muscles;equipment;difficulty;sets_default;reps_default;tempo_default;rest_seconds_default;video_url;thumb_url;tags
לחיצת חזה במשקולות;שכבו על ספסל...;חזה;יד אחורית|כתפיים;משקולות;beginner;3;8-12;;90;;;לחיצה|חזה
סקוואט;עמידה עם רגליים...;רגליים;בטן|גב תחתון;משקל גוף;beginner;4;12-15;;60;;;רגליים|גוף תחתון
```

**Notes:**
- Use `|` (pipe) to separate multiple secondary muscles or tags
- Leave fields empty if not applicable
- Required field: `name_he`

3. Click **"ייבוא"** (Import)

## Video & Image Upload

### Video Guidelines
- **Format**: MP4, MOV, AVI, WebM
- **Max Size**: 100MB
- **Storage**: Private bucket with signed URLs (1-hour expiry)
- **Access**: Videos regenerate signed URLs automatically

### Thumbnail Guidelines
- **Format**: JPG, PNG, WebP, GIF
- **Max Size**: 5MB
- **Storage**: Public bucket
- **Aspect Ratio**: 16:9 recommended

## Using Exercises in Workouts

When creating/editing workouts, you can now:

1. Click "בחר מספרייה" (Select from Library)
2. Search and filter exercises
3. Select exercise → defaults auto-fill (sets, reps, rest, tempo)
4. Override defaults as needed for specific workout

The `workout_exercises` table now includes an `exercise_id` field that links to the catalog.

## Data Schema

### exercise_library
- `id`: UUID primary key
- `slug`: Auto-generated unique slug
- `name_he`: Exercise name (Hebrew)
- `description_he`: Detailed description
- `primary_muscle`: Main target muscle
- `secondary_muscles`: Array of additional muscles
- `equipment`: Required equipment
- `difficulty`: beginner | intermediate | advanced
- `sets_default`, `reps_default`, `tempo_default`, `rest_seconds_default`: Recommended defaults
- `video_url`, `thumb_url`: Media URLs
- `is_active`: Visibility flag
- `created_by`: Admin user ID
- `created_at`, `updated_at`: Timestamps

### exercise_tags
- `id`: UUID
- `name_he`: Tag name

### exercise_library_tags
- Many-to-many linking table

## Troubleshooting

### "אין הרשאות מנהל" (No admin permissions)
- Verify `is_admin = true` in your profile
- Re-login after granting admin access

### Upload Failed
- Check file size limits (100MB video, 5MB image)
- Verify Supabase storage buckets exist: `exercise-videos`, `exercise-thumbs`
- Check RLS policies allow admin uploads

### Exercises Not Appearing
- Check `is_active = true` for public visibility
- Verify RLS policies allow authenticated read access

## Support

For issues or questions, refer to:
- Supabase Dashboard → Storage → Buckets
- Supabase Dashboard → SQL Editor → Run RLS checks
- Application logs for detailed error messages
```

---

## Installation Requirements

Add `papaparse` package for CSV parsing:

```bash
pnpm add papaparse
pnpm add -D @types/papaparse
```

---

## Deployment Checklist

1. ✅ Run SQL migrations in Supabase SQL Editor:
   - `002_exercise_library.sql`
   - `003_exercise_storage_buckets.sql`

2. ✅ Verify storage buckets created:
   - `exercise-videos` (private)
   - `exercise-thumbs` (public)

3. ✅ Grant admin access to your user:
   ```sql
   UPDATE public.profiles SET is_admin = true WHERE id = 'YOUR_USER_ID';
   ```

4. ✅ Install dependencies:
   ```bash
   pnpm add papaparse @types/papaparse
   ```

5. ✅ Test the flow:
   - Navigate to `/exercises` (public browse)
   - Navigate to `/exercises/admin` (admin panel)
   - Create a test exercise manually
   - Try JSON import
   - Try CSV import
   - Upload video and thumbnail
   - View exercise details page

6. ✅ Integrate with workout builder:
   - Update workout creation UI to include ExercisePicker
   - Save `exercise_id` when exercise is selected from catalog
   - Display linked exercise info in workout view

---

## Summary

This implementation provides:
- ✅ Normalized database schema with RLS
- ✅ Admin-only write access
- ✅ Public read access for authenticated users
- ✅ CRUD operations via server actions
- ✅ Bulk import (JSON & CSV)
- ✅ Video and thumbnail uploads (Supabase Storage)
- ✅ Public browse/search/filter UI
- ✅ Exercise details pages
- ✅ Admin management UI (create/edit/delete/import)
- ✅ Reusable ExercisePicker component
- ✅ Complete Hebrew RTL interface
- ✅ GymBro brand styling (#0e0f12 bg, #E2F163 accent)
- ✅ No seed data (owner provides content)
- ✅ Comprehensive documentation

All files ready to deploy!
