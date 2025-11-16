"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/lib/supabase";
import { MealReviewCard } from "@/components/nutrition/MealReviewCard";
import {
  getMealReviewCache,
  clearMealReviewCache,
  setMealReviewCache,
} from "@/lib/nutrition/temp-storage";
import type {
  VisionMealResult,
  MealInsertPayload,
} from "@/lib/nutrition/types";
import { todayISO } from "@/lib/date";
import { toast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { getVisionError } from "@/lib/i18n/he";

const LOG_CACHE = process.env.NEXT_PUBLIC_LOG_CACHE === "1";

export default function MealReviewPage() {
  const { user, session } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [result, setResult] = useState<VisionMealResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [servings, setServings] = useState<number>(1);
  const [mealName, setMealName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Track edited base macro values
  const [baseMacros, setBaseMacros] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  // Load cached result on mount
  useEffect(() => {
    if (!user?.id) return;

    const cache = getMealReviewCache(user.id);

    if (LOG_CACHE) {
      console.log("[MealReview] Mounted, hasResult:", !!cache);
    }

    if (!cache) {
      // No cache found - redirect back to nutrition page
      toast({
        title: "לא נמצא סריקה",
        description: "אנא סרוק ארוחה שוב",
        variant: "destructive",
      });
      router.replace("/nutrition");
      return;
    }

    setResult(cache.result);
    setImageUrl(cache.imageUrl);
    setMealName(cache.result.meal_name);
    setBaseMacros({
      calories: cache.result.calories,
      protein: cache.result.protein || 0,
      carbs: cache.result.carbs || 0,
      fat: cache.result.fat || 0,
    });
    setHasMounted(true);
  }, [user, router]);

  const handleAddMeal = async () => {
    if (!result || !user?.id) return;

    setIsLoading(true);

    try {
      // Get fresh session token
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!currentSession?.access_token) {
        throw new Error("לא מחובר. אנא התחבר שוב.");
      }

      // Build payload with scaled macros (using edited base values)
      const payload: MealInsertPayload = {
        user_id: user.id,
        date: todayISO(),
        name: mealName,
        calories: Math.round(baseMacros.calories * servings),
        protein: Math.round(baseMacros.protein * servings),
        carbs: Math.round(baseMacros.carbs * servings),
        fat: Math.round(baseMacros.fat * servings),
        source: "ai_vision",
        image_url: result.image_url, // Use Supabase URL if available
        confidence: result.confidence,
      };

      if (LOG_CACHE) {
        console.log("[MealReview] Adding meal:", {
          name: payload.name,
          calories: payload.calories,
          servings,
        });
      }

      // Insert into database
      const { error: dbErr } = await supabase
        .from("meals")
        .insert(payload)
        .select()
        .single();

      if (dbErr) {
        console.error("[MealReview] DB insert error:", {
          code: dbErr.code,
          message: dbErr.message,
          details: dbErr.details,
          hint: dbErr.hint,
        });

        // Show detailed error
        const errorMsg = [
          dbErr.message || "שגיאה בשמירת הארוחה",
          dbErr.hint ? `\n💡 ${dbErr.hint}` : "",
          dbErr.code ? `\n(Code: ${dbErr.code})` : "",
        ]
          .filter(Boolean)
          .join("");

        throw new Error(errorMsg);
      }

      // Success!
      toast({
        title: "✓ הארוחה נוספה בהצלחה",
        description: `${payload.name} - ${payload.calories} קלוריות`,
      });

      // Clear cache
      clearMealReviewCache(user.id);

      // Navigate back to nutrition page
      router.push("/nutrition");

      // Trigger a soft refresh to reload meals list
      router.refresh();
    } catch (error: any) {
      console.error("[MealReview] Add meal error:", {
        message: error.message,
        hasSession: !!session,
        hasToken: !!session?.access_token,
      });

      toast({
        title: "שגיאה בהוספת הארוחה",
        description: error.message || "אנא נסה שוב",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanPhoto = async (file: File) => {
    if (!user?.id || !session?.access_token) return;

    setUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      let res;
      try {
        res = await fetch("/api/ai/vision/nutrition", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        });
      } catch (networkError) {
        console.error("[MealReview] Network error:", networkError);
        const hebrewError = getVisionError('network_error');

        // Haptic feedback for error
        if (navigator.vibrate) {
          navigator.vibrate([30, 30, 30]);
        }

        toast({
          title: hebrewError.title,
          description: hebrewError.description,
          variant: 'destructive',
          duration: 5000,
        });

        throw new Error(hebrewError.title);
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));

        // Log error for debugging
        console.error("[MealReview] API error:", {
          code: errData.code,
          message: errData.message,
        });

        // Get Hebrew error message from code
        const errorCode = errData.code || 'unknown';
        const hebrewError = getVisionError(errorCode);

        // Haptic feedback for error
        if (navigator.vibrate) {
          navigator.vibrate([30, 30, 30]);
        }

        toast({
          title: hebrewError.title,
          description: hebrewError.description,
          variant: 'destructive',
          duration: 5000,
        });

        throw new Error(hebrewError.title);
      }

      const data = await res.json();

      if (!data.ok || !data.meal) {
        throw new Error("Invalid response from server");
      }

      // Create object URL for local preview
      const localImageUrl = URL.createObjectURL(file);

      // Build result object
      const visionResult: VisionMealResult = {
        meal_name: data.meal.name,
        calories: data.meal.calories,
        protein: data.meal.protein,
        carbs: data.meal.carbs,
        fat: data.meal.fat,
        confidence: data.meal.confidence,
        health_score: data.meal.health_score,
        ingredients: data.meal.ingredients,
        image_url: data.meal.image_url, // Supabase URL from server
      };

      // Cache the result
      setMealReviewCache(user.id, {
        result: visionResult,
        imageUrl: localImageUrl,
        createdAt: Date.now(),
      });

      // Update state to show new scan
      setResult(visionResult);
      setImageUrl(localImageUrl);
      setMealName(visionResult.meal_name);
      setServings(1);
      setBaseMacros({
        calories: visionResult.calories,
        protein: visionResult.protein || 0,
        carbs: visionResult.carbs || 0,
        fat: visionResult.fat || 0,
      });

      toast({
        title: "✓ תמונה נותחה בהצלחה",
        description: visionResult.meal_name,
      });
    } catch (error: any) {
      console.error("[MealReview] Photo scan error:", error);

      // If error wasn't already handled by toast above, show generic error
      if (error.message && !error.message.includes('לא הצלחנו') && !error.message.includes('שגיאה')) {
        const genericError = getVisionError('unknown');

        // Haptic feedback for error
        if (navigator.vibrate) {
          navigator.vibrate([30, 30, 30]);
        }

        toast({
          title: genericError.title,
          description: error.message || genericError.description,
          variant: 'destructive',
          duration: 5000,
        });
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleScanPhoto(file);
    }
    e.target.value = ""; // Reset input
  };

  const handleScanAgain = () => {
    if (!user?.id) return;

    if (LOG_CACHE) {
      console.log("[MealReview] Scan again clicked - opening file picker");
    }

    // Trigger file input to open camera/gallery picker
    fileInputRef.current?.click();
  };

  const handleBack = () => {
    if (!user?.id) return;

    if (LOG_CACHE) {
      console.log("[MealReview] Back clicked - clearing cache and navigating");
    }

    // Clear cache and navigate back to nutrition page
    clearMealReviewCache(user.id);
    router.push("/nutrition");
  };

  // Loading state while checking cache
  if (!hasMounted || !result) {
    return (
      <div className="min-h-screen bg-[#0A0B0C] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-white text-lg"
        >
          טוען...
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Hidden file input for camera/gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInput}
      />

      <MealReviewCard
        result={result}
        imageUrl={imageUrl}
        servings={servings}
        onServingsChange={setServings}
        onNameChange={setMealName}
        onMacrosChange={setBaseMacros}
        onAddMeal={handleAddMeal}
        onScanAgain={handleScanAgain}
        onBack={handleBack}
        isLoading={isLoading || uploadingPhoto}
      />

      {/* Loading overlay for photo upload */}
      {uploadingPhoto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70]">
          <div className="bg-neutral-900 rounded-2xl p-6 space-y-4 max-w-sm mx-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
            </div>
            <p className="text-white text-center">מנתח את התמונה...</p>
            <p className="text-neutral-400 text-sm text-center">זה עשוי לקחת כמה שניות</p>
          </div>
        </div>
      )}
    </>
  );
}
