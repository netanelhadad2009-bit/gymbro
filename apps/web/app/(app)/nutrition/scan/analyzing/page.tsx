"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { setMealReviewCache } from "@/lib/nutrition/temp-storage";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/components/ui/use-toast";
import { getVisionError } from "@/lib/i18n/he";
import type { VisionMealResult } from "@/lib/nutrition/types";
import * as storage from "@/lib/storage";

export default function AnalyzingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const analyze = async () => {
      // Get the pending scan from sessionStorage
      const pendingScanJson = sessionStorage.getItem('nutrition_pending_scan');
      if (!pendingScanJson) {
        console.error('[Analyzing] No pending scan found');
        router.replace('/nutrition');
        return;
      }

      const pendingScan = JSON.parse(pendingScanJson);
      const { imageDataUrl, fileName, fileSize } = pendingScan;

      setImageUrl(imageDataUrl);

      try {
        // Convert data URL back to File
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: "image/jpeg" });

        // Get fresh session token
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!currentSession?.access_token) {
          throw new Error("לא מחובר. אנא התחבר שוב.");
        }

        const formData = new FormData();
        formData.append("file", file);

        const apiResponse = await fetch("/api/ai/vision/nutrition", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${currentSession.access_token}`,
          },
          body: formData,
        });

        if (!apiResponse.ok) {
          const error = await apiResponse.json().catch(() => ({}));
          const errorCode = error.code || 'unknown';
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

        const result = await apiResponse.json();

        if (!result.ok || !result.meal) {
          throw new Error("Invalid response from AI vision API");
        }

        // Extract the meal result
        const mealResult: VisionMealResult = {
          meal_name: result.meal.name,
          calories: result.meal.calories,
          protein: result.meal.protein,
          carbs: result.meal.carbs,
          fat: result.meal.fat,
          confidence: result.meal.confidence,
          health_score: result.meal.health_score,
          ingredients: result.meal.ingredients,
          image_url: result.meal.image_url,
        };

        // Use Supabase URL if available, otherwise use local preview
        const finalImageUrl = mealResult.image_url || imageDataUrl;

        // Store result in temp cache
        const userId = await storage.getCurrentUserId();
        if (userId) {
          setMealReviewCache(userId, {
            result: mealResult,
            imageUrl: finalImageUrl,
            createdAt: Date.now(),
          });
        }

        // Clear pending scan
        sessionStorage.removeItem('nutrition_pending_scan');

        // Navigate to review page
        router.push("/nutrition/scan/review");
      } catch (error: any) {
        console.error("[Analyzing] Error:", error);

        // Clear pending scan
        sessionStorage.removeItem('nutrition_pending_scan');

        // Navigate back to nutrition page
        router.replace('/nutrition');
      }
    };

    analyze();
  }, [router, toast, user]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[10000] p-4">
      {/* Image Preview with Scanning Animation */}
      {imageUrl && (
        <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden mb-6">
          <img
            src={imageUrl}
            alt="סורק תמונה"
            className="w-full h-full object-cover"
          />

          {/* Scanning line animation */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-lime-400 to-transparent animate-scan-line shadow-[0_0_20px_rgba(190,242,100,0.5)]"></div>
          </div>

          {/* Scanning grid overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-lime-400/10 via-transparent to-lime-400/10 animate-pulse"></div>

          {/* Corner brackets */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-lime-400"></div>
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-lime-400"></div>
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-lime-400"></div>
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-lime-400"></div>
        </div>
      )}

      {/* Status Text */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-lime-400"></div>
          <p className="text-white font-medium text-lg">מנתח את התמונה...</p>
        </div>
        <p className="text-neutral-400 text-sm">זה עשוי לקחת כמה שניות</p>
      </div>
    </div>
  );
}
