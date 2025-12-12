import { OnboardingData } from './onboarding-storage';
import { supabase } from './supabase';
import type { BarcodeProduct, BarcodeLookupResponse } from '../types/barcode';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// ==================== Vision API Types ====================

export type VisionMealResult = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: number;
  health_score?: number;
  ingredients?: string[];
  image_url?: string;
};

export type VisionAnalysisResponse = {
  ok: boolean;
  meal?: VisionMealResult;
  code?: string;
  error?: string;
  message?: string;
};

// ==================== Vision API Functions ====================

/**
 * Analyze a food photo using the AI Vision API
 * @param imageUri - Local URI of the image to analyze
 * @returns Analysis result with meal name and nutrition info
 */
export async function analyzeVisionMeal(
  imageUri: string,
  options?: { timeout?: number }
): Promise<VisionAnalysisResponse> {
  const timeout = options?.timeout || 60000; // 60 seconds default
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Get the current session for authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.warn('[Vision API] No valid session');
      return {
        ok: false,
        code: 'auth_error',
        error: 'Authentication required',
        message: 'Please sign in to analyze photos',
      };
    }

    console.log('[Vision API] Preparing image for analysis...');

    // Create FormData with the image
    const formData = new FormData();

    // Get the file extension from URI
    const uriParts = imageUri.split('.');
    const fileExtension = uriParts[uriParts.length - 1]?.toLowerCase() || 'jpg';
    const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';

    // Append image as file
    formData.append('file', {
      uri: imageUri,
      type: mimeType,
      name: `meal.${fileExtension}`,
    } as any);

    console.log('[Vision API] Sending request to:', `${API_BASE_URL}/api/ai/vision/nutrition`);

    const response = await fetch(`${API_BASE_URL}/api/ai/vision/nutrition`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      console.warn('[Vision API] Analysis failed:', data);
      return {
        ok: false,
        code: data.code || 'analysis_error',
        error: data.error || 'Analysis failed',
        message: getVisionErrorMessage(data.code),
      };
    }

    console.log('[Vision API] Analysis successful:', data.meal?.name);
    return data as VisionAnalysisResponse;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn('[Vision API] Analysis timed out');
      return {
        ok: false,
        code: 'timeout',
        error: 'TimeoutError',
        message: 'Analysis timed out. Please try again.',
      };
    }

    console.warn('[Vision API] Analysis error:', error);
    return {
      ok: false,
      code: 'network_error',
      error: 'NetworkError',
      message: error.message || 'Network error occurred',
    };
  }
}

/**
 * Get user-friendly error message for vision API errors
 */
function getVisionErrorMessage(code?: string): string {
  switch (code) {
    case 'missing_file':
      return 'No image was provided';
    case 'no_detection':
      return 'Could not detect food in this image. Try taking a clearer photo.';
    case 'no_ai_response':
      return 'AI service is temporarily unavailable. Please try again.';
    case 'invalid_ai_response':
      return 'Could not analyze this image. Please try another photo.';
    case 'ai_service_error':
      return 'AI service is temporarily unavailable. Please try again later.';
    case 'rate_limited':
      return 'Too many requests. Please wait a moment and try again.';
    default:
      return 'An error occurred while analyzing the photo.';
  }
}

// Send English values directly to API (API will convert to Hebrew internally)
// No mapping needed - just pass through the values from onboarding

function calculateAge(birthdate: string | undefined): number {
  if (!birthdate) return NaN;

  try {
    const birthDate = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : NaN;
  } catch {
    return NaN;
  }
}

export type NutritionRequest = {
  gender: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  activity: string;
  goal: string;
  diet: string;
  days: number;
};

export type NutritionPlan = {
  dailyTargets?: {
    calories_target?: number;
    protein_target_g?: number;
    carbs_target_g?: number;
    fat_target_g?: number;
  };
  days?: Array<{
    day: string;
    order: number;
    title: string;
    time: string;
    desc: string;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }>;
};

export type NutritionResponse = {
  ok: boolean;
  plan?: NutritionPlan;
  calories?: number | null;
  fingerprint?: string;
  error?: string;
  message?: string;
};

export type JourneyStage = {
  code: string;
  title_en: string;
  subtitle_en?: string;
  color_hex: string;
  tasks?: Array<{
    key_code: string;
    title_en: string;
    desc_en?: string;
    points?: number;
  }>;
};

export type StagesResponse = {
  ok: boolean;
  stages?: JourneyStage[];
  count?: number;
  message?: string;
  error?: string;
};

export function buildNutritionRequest(onboarding: OnboardingData): NutritionRequest {
  const age = calculateAge(onboarding.birthdate);
  const goal = onboarding.goals?.[0] || 'loss';

  // Send English values directly - API will convert to Hebrew internally
  return {
    gender: onboarding.gender || 'male',
    age: age,
    height_cm: onboarding.height_cm || 170,
    weight_kg: onboarding.weight_kg || 70,
    target_weight_kg: onboarding.target_weight_kg || onboarding.weight_kg || 70,
    activity: onboarding.activity || 'sedentary',
    goal: goal,
    diet: onboarding.diet || 'none',
    days: 1, // Always 1 for onboarding
  };
}

export async function generateNutritionPlan(
  onboarding: OnboardingData,
  options?: { timeout?: number }
): Promise<NutritionResponse> {
  const timeout = options?.timeout || 90000; // 90 seconds default
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const payload = buildNutritionRequest(onboarding);

    console.log('[API] Generating nutrition plan with payload:', payload);

    const response = await fetch(`${API_BASE_URL}/api/ai/nutrition/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      console.warn('[API] Nutrition generation failed:', data);
      return {
        ok: false,
        error: data.error || 'GenerationError',
        message: data.message || 'Failed to generate nutrition plan',
      };
    }

    console.log('[API] Nutrition plan generated successfully');
    return data as NutritionResponse;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn('[API] Nutrition generation timed out');
      return {
        ok: false,
        error: 'TimeoutError',
        message: 'Generation timed out. Please try again.',
      };
    }

    console.warn('[API] Nutrition generation error:', error);
    return {
      ok: false,
      error: 'NetworkError',
      message: error.message || 'Network error occurred',
    };
  }
}

export async function generateJourneyStages(
  onboarding: OnboardingData,
  options?: { timeout?: number }
): Promise<StagesResponse> {
  const timeout = options?.timeout || 30000; // 30 seconds default
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const goal = onboarding.goals?.[0] || 'loss';

    const payload = {
      avatar: {
        id: 'temp-id',
        goal: goal,
        diet: onboarding.diet,
        experience: onboarding.experience,
        gender: onboarding.gender,
      },
    };

    console.log('[API] Generating journey stages with payload:', payload);

    const response = await fetch(`${API_BASE_URL}/api/journey/stages/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      console.warn('[API] Stages generation failed:', data);
      return {
        ok: false,
        error: data.error || 'GenerationError',
        message: data.message || 'Failed to generate journey stages',
      };
    }

    console.log('[API] Journey stages generated successfully:', data.count);
    return data as StagesResponse;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn('[API] Stages generation timed out');
      return {
        ok: false,
        error: 'TimeoutError',
        message: 'Generation timed out. Please try again.',
      };
    }

    console.warn('[API] Stages generation error:', error);
    return {
      ok: false,
      error: 'NetworkError',
      message: error.message || 'Network error occurred',
    };
  }
}

// ==================== Barcode API ====================

/**
 * Look up nutrition data for a barcode
 * Uses POST /api/barcode/lookup endpoint which supports:
 * - Israeli Ministry of Health (729-prefix barcodes)
 * - Open Food Facts (international, US)
 * - FatSecret (fallback)
 */
export async function lookupBarcode(
  barcode: string,
  options?: { timeout?: number }
): Promise<BarcodeLookupResponse> {
  const timeout = options?.timeout || 15000; // 15s default (faster than vision)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Get session for auth (optional but enables scan history)
    const { data: { session } } = await supabase.auth.getSession();

    console.log('[Barcode API] Looking up:', barcode);

    const response = await fetch(`${API_BASE_URL}/api/barcode/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session && { 'Authorization': `Bearer ${session.access_token}` }),
      },
      body: JSON.stringify({ barcode }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.warn('[Barcode API] Lookup failed:', data);
      return {
        ok: false,
        reason: data.reason || 'network',
        message: getBarcodeErrorMessage(data.reason),
      };
    }

    console.log('[Barcode API] Found product:', data.product?.name);
    return { ok: true, product: data.product };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn('[Barcode API] Lookup timed out');
      return { ok: false, reason: 'timeout', message: 'Request timed out. Please try again.' };
    }

    console.warn('[Barcode API] Error:', error);
    return { ok: false, reason: 'network', message: 'Network error. Please check your connection.' };
  }
}

/**
 * Get user-friendly error message for barcode lookup errors
 */
function getBarcodeErrorMessage(reason?: string): string {
  switch (reason) {
    case 'not_found':
      return 'Product not found in database';
    case 'bad_barcode':
    case 'invalid':
      return 'Invalid barcode format';
    case 'timeout':
      return 'Request timed out. Please try again.';
    case 'network':
      return 'Network error. Please check your connection.';
    default:
      return 'Could not look up product';
  }
}

// Re-export barcode types for convenience
export type { BarcodeProduct, BarcodeLookupResponse } from '../types/barcode';

// ==================== Progress API ====================

import type {
  ProgressRange,
  ProgressResponse,
  ProgressKPIs,
  WeightPoint,
  DailyNutrition,
} from '../types/progress';

/**
 * Fetch progress data for a given time range
 * Uses GET /api/progress/[range] endpoint
 */
export async function fetchProgress(
  range: ProgressRange = '30d',
  options?: { timeout?: number }
): Promise<ProgressResponse> {
  const timeout = options?.timeout || 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn('[Progress API] No session found');
      return { ok: false, error: 'Not authenticated' };
    }

    console.log('[Progress API] Fetching:', range);

    const response = await fetch(`${API_BASE_URL}/api/progress/${range}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.warn('[Progress API] Fetch failed:', data);
      return { ok: false, error: data.error || 'Failed to fetch progress data' };
    }

    console.log('[Progress API] Success:', {
      weightPoints: data.weight?.length || 0,
      nutritionDays: data.nutrition?.length || 0,
    });

    return {
      ok: true,
      kpis: data.kpis,
      weight: data.weight,
      nutrition: data.nutrition,
      latencyMs: data.latencyMs,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn('[Progress API] Request timed out');
      return { ok: false, error: 'Request timed out. Please try again.' };
    }

    console.warn('[Progress API] Error:', error);
    return { ok: false, error: 'Network error. Please check your connection.' };
  }
}

// Re-export progress types for convenience
export type { ProgressRange, ProgressResponse, ProgressKPIs, WeightPoint, DailyNutrition } from '../types/progress';

// ==================== Weight Logging API ====================

export type LogWeightRequest = {
  weight_kg: number;
  date?: string; // ISO date string (YYYY-MM-DD), defaults to today
  notes?: string;
};

export type LogWeightResponse = {
  ok: boolean;
  data?: {
    id: string;
    date: string;
    weight_kg: number;
    notes?: string;
  };
  error?: string;
};

/**
 * Log a weight measurement
 * Uses POST /api/weight endpoint
 */
export async function logWeight(
  request: LogWeightRequest,
  options?: { timeout?: number }
): Promise<LogWeightResponse> {
  const timeout = options?.timeout || 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn('[Weight API] No session found');
      return { ok: false, error: 'Not authenticated' };
    }

    console.log('[Weight API] Logging weight:', request.weight_kg, 'kg');

    const response = await fetch(`${API_BASE_URL}/api/weight`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.warn('[Weight API] Log failed:', data);
      return { ok: false, error: data.error || 'Failed to log weight' };
    }

    console.log('[Weight API] Weight logged successfully');
    return { ok: true, data: data.data };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn('[Weight API] Request timed out');
      return { ok: false, error: 'Request timed out. Please try again.' };
    }

    console.warn('[Weight API] Error:', error);
    return { ok: false, error: 'Network error. Please check your connection.' };
  }
}

// ==================== Weight Update/Delete API ====================

export type UpdateWeightRequest = {
  weight_kg?: number;
  date?: string;
  notes?: string | null;
};

export type UpdateWeightResponse = {
  ok: boolean;
  data?: {
    id: string;
    date: string;
    weight_kg: number;
    notes?: string | null;
  };
  error?: string;
};

/**
 * Update an existing weight entry
 * Uses PUT /api/weight/[id] endpoint
 */
export async function updateWeight(
  id: string,
  request: UpdateWeightRequest,
  options?: { timeout?: number }
): Promise<UpdateWeightResponse> {
  const timeout = options?.timeout || 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn('[Weight API] No session found');
      return { ok: false, error: 'Not authenticated' };
    }

    console.log('[Weight API] Updating weight:', id);

    const response = await fetch(`${API_BASE_URL}/api/weight/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.warn('[Weight API] Update failed:', data);
      return { ok: false, error: data.error || 'Failed to update weight' };
    }

    console.log('[Weight API] Weight updated successfully');
    return { ok: true, data: data.data };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn('[Weight API] Request timed out');
      return { ok: false, error: 'Request timed out. Please try again.' };
    }

    console.warn('[Weight API] Error:', error);
    return { ok: false, error: 'Network error. Please check your connection.' };
  }
}

export type DeleteWeightResponse = {
  ok: boolean;
  error?: string;
};

/**
 * Delete a weight entry
 * Uses DELETE /api/weight/[id] endpoint
 */
export async function deleteWeight(
  id: string,
  options?: { timeout?: number }
): Promise<DeleteWeightResponse> {
  const timeout = options?.timeout || 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn('[Weight API] No session found');
      return { ok: false, error: 'Not authenticated' };
    }

    console.log('[Weight API] Deleting weight:', id);

    const response = await fetch(`${API_BASE_URL}/api/weight/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.warn('[Weight API] Delete failed:', data);
      return { ok: false, error: data.error || 'Failed to delete weight' };
    }

    console.log('[Weight API] Weight deleted successfully');
    return { ok: true };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn('[Weight API] Request timed out');
      return { ok: false, error: 'Request timed out. Please try again.' };
    }

    console.warn('[Weight API] Error:', error);
    return { ok: false, error: 'Network error. Please check your connection.' };
  }
}

// ==================== Food Search API ====================

import type { FoodSearchRequest, FoodSearchResponse } from '../types/food-search';

/**
 * Search for foods across multiple databases
 * Uses POST /api/food/search endpoint which queries:
 * - Israeli Ministry of Health database
 * - Open Food Facts (international)
 * - USDA FoodData Central (US)
 * - User's custom foods and recent meals
 */
export async function searchFoods(
  query: string,
  options?: { limit?: number; includeRecent?: boolean; timeout?: number }
): Promise<FoodSearchResponse> {
  const timeout = options?.timeout || 15000; // 15 seconds default
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Get session for auth (optional - searches work without auth but won't include user foods)
    const { data: { session } } = await supabase.auth.getSession();

    console.log('[Food Search API] Searching for:', query);

    const requestBody: FoodSearchRequest = {
      query,
      limit: options?.limit ?? 30,
      includeRecent: options?.includeRecent ?? true,
    };

    const response = await fetch(`${API_BASE_URL}/api/food/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session && { 'Authorization': `Bearer ${session.access_token}` }),
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.warn('[Food Search API] Search failed:', data);
      return {
        ok: false,
        results: { recent: [], database: [] },
        sources: [],
      };
    }

    const recentCount = data.results.recent?.length || 0;
    const databaseCount = data.results.database?.length || 0;
    console.log(
      `[Food Search API] Found ${recentCount} recent, ${databaseCount} database results from sources:`,
      data.sources.join(', ')
    );

    return data as FoodSearchResponse;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn('[Food Search API] Request timed out');
      return {
        ok: false,
        results: { recent: [], database: [] },
        sources: [],
      };
    }

    console.warn('[Food Search API] Error:', error);
    return {
      ok: false,
      results: { recent: [], database: [] },
      sources: [],
    };
  }
}

// Re-export food search types for convenience
export type { FoodSearchRequest, FoodSearchResponse, FoodSearchResult, ServingOption } from '../types/food-search';

// ==================== AI Coach API ====================

export type CoachMessage = {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export type CoachChatRequest = {
  message: string;
};

export type CoachChatResponse = {
  ok: boolean;
  message?: string;
  reply?: string;
  userMessage?: CoachMessage;
  assistantMessage?: CoachMessage;
  error?: string;
};

export type CoachMessagesResponse = {
  ok: boolean;
  messages?: CoachMessage[];
  hasMore?: boolean;
  error?: string;
};

/**
 * Send a message to the AI coach and get a response
 * Uses POST /api/coach/chat endpoint
 */
export async function sendCoachMessage(
  message: string,
  options?: { timeout?: number }
): Promise<CoachChatResponse> {
  const timeout = options?.timeout || 60000; // 60 seconds for AI response
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn('[Coach API] No session found');
      return { ok: false, error: 'Not authenticated' };
    }

    console.log('[Coach API] Sending message...');

    const response = await fetch(`${API_BASE_URL}/api/coach/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.warn('[Coach API] Send failed:', data);
      return { ok: false, error: data.error || data.message || 'Failed to send message' };
    }

    console.log('[Coach API] Response received');
    return {
      ok: true,
      message: data.message || data.reply,
      reply: data.reply || data.message,
      userMessage: data.userMessage,
      assistantMessage: data.assistantMessage,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn('[Coach API] Request timed out');
      return { ok: false, error: 'Request timed out. Please try again.' };
    }

    console.warn('[Coach API] Error:', error);
    return { ok: false, error: 'Network error. Please check your connection.' };
  }
}

/**
 * Load chat history with the AI coach
 * Uses GET /api/coach/messages endpoint
 */
export async function loadCoachMessages(
  options?: { limit?: number; before?: string; timeout?: number }
): Promise<CoachMessagesResponse> {
  const timeout = options?.timeout || 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn('[Coach API] No session found');
      return { ok: false, error: 'Not authenticated' };
    }

    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.before) params.append('before', options.before);

    const url = `${API_BASE_URL}/api/coach/messages${params.toString() ? `?${params.toString()}` : ''}`;
    console.log('[Coach API] Loading messages...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.warn('[Coach API] Load failed:', data);
      return { ok: false, error: data.error || 'Failed to load messages' };
    }

    console.log('[Coach API] Loaded', data.messages?.length || 0, 'messages');
    return {
      ok: true,
      messages: data.messages || [],
      hasMore: data.hasMore || false,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn('[Coach API] Request timed out');
      return { ok: false, error: 'Request timed out. Please try again.' };
    }

    console.warn('[Coach API] Error:', error);
    return { ok: false, error: 'Network error. Please check your connection.' };
  }
}
