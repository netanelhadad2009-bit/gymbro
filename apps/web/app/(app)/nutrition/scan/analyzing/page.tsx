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
  console.log('[Analyzing] 🎬 Component rendering/re-rendering');
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Analyzing] 🎯 useEffect triggered, deps:', { hasRouter: !!router, hasToast: !!toast, hasUser: !!user });
    const analyze = async () => {
      console.log('[Analyzing] Starting analysis...');

      // Get the pending scan from sessionStorage
      const pendingScanJson = sessionStorage.getItem('nutrition_pending_scan');
      console.log('[Analyzing] Pending scan JSON:', pendingScanJson ? 'found' : 'not found');

      if (!pendingScanJson) {
        console.error('[Analyzing] No pending scan found');
        router.replace('/nutrition');
        return;
      }

      let pendingScan;
      try {
        pendingScan = JSON.parse(pendingScanJson);
        console.log('[Analyzing] Parsed pending scan:', {
          hasImageDataUrl: !!pendingScan.imageDataUrl,
          fileName: pendingScan.fileName,
          fileSize: pendingScan.fileSize,
          imageDataUrlPrefix: pendingScan.imageDataUrl?.substring(0, 50)
        });
      } catch (parseError) {
        console.error('[Analyzing] Error parsing pending scan JSON:', parseError);
        router.replace('/nutrition');
        return;
      }

      const { imageDataUrl, fileName, fileSize } = pendingScan;

      setImageUrl(imageDataUrl);
      console.log('[Analyzing] Set image URL for display');

      try {
        console.log('[Analyzing] Converting data URL to File...');
        console.log('[Analyzing] Data URL length:', imageDataUrl?.length);

        // Extract base64 data from data URL (iOS WebView doesn't support fetch with data URLs)
        const base64Match = imageDataUrl.match(/^data:image\/\w+;base64,(.+)$/);
        if (!base64Match) {
          throw new Error('Invalid data URL format');
        }

        const base64Data = base64Match[1];
        console.log('[Analyzing] Extracted base64 data, length:', base64Data.length);

        // Convert base64 to Blob
        console.log('[Analyzing] Decoding base64...');
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/jpeg" });
        console.log('[Analyzing] Created blob, size:', blob.size, 'type:', blob.type);

        const file = new File([blob], fileName, { type: "image/jpeg" });
        console.log('[Analyzing] Created File:', file.name, file.size, file.type);

        // Get fresh session token
        console.log('[Analyzing] Getting Supabase session...');
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log('[Analyzing] Got session, has token:', !!currentSession?.access_token);

        if (!currentSession?.access_token) {
          throw new Error("לא מחובר. אנא התחבר שוב.");
        }

        console.log('[Analyzing] Creating FormData...');
        const formData = new FormData();
        formData.append("file", file);
        console.log('[Analyzing] FormData created, calling API...');

        const apiResponse = await fetch("/api/ai/vision/nutrition", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${currentSession.access_token}`,
          },
          body: formData,
        });

        console.log('[Analyzing] API response received, status:', apiResponse.status, 'ok:', apiResponse.ok);

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

        console.log('[Analyzing] Parsing API response JSON...');
        const result = await apiResponse.json();
        console.log('[Analyzing] Parsed result:', { ok: result.ok, hasMeal: !!result.meal });

        if (!result.ok || !result.meal) {
          console.error('[Analyzing] Invalid API response:', result);
          throw new Error("Invalid response from AI vision API");
        }

        // Extract the meal result
        console.log('[Analyzing] Extracting meal result...');
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

        console.log('[Analyzing] Meal result extracted successfully');

        // Use Supabase URL if available, otherwise use local preview
        const finalImageUrl = mealResult.image_url || imageDataUrl;
        console.log('[Analyzing] Final image URL:', finalImageUrl ? 'set' : 'missing');

        // Store result in temp cache
        console.log('[Analyzing] Getting user ID for cache...');
        const userId = await storage.getCurrentUserId();
        console.log('[Analyzing] User ID:', userId ? 'found' : 'not found');
        if (userId) {
          console.log('[Analyzing] Setting meal review cache...');
          setMealReviewCache(userId, {
            result: mealResult,
            imageUrl: finalImageUrl,
            createdAt: Date.now(),
          });
          console.log('[Analyzing] Cache set successfully');
        }

        // Clear pending scan
        console.log('[Analyzing] Clearing pending scan from sessionStorage...');
        sessionStorage.removeItem('nutrition_pending_scan');

        // Navigate to review page
        console.log('[Analyzing] Navigating to review page...');
        router.push("/nutrition/scan/review");
      } catch (error: any) {
        console.error("[Analyzing] Error caught:", {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
          errorObject: error,
          errorString: String(error),
          errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error))
        });

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
