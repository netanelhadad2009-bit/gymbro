/**
 * Frontend API client for calling plan generation endpoints
 * Calls the backend API at /ai/* routes
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

console.log("🌐 API Client initialized with base URL:", API_BASE);

export interface DaysProfile {
  gender: "male" | "female";
  age: number;
  weight: number;
  targetWeight: number;
  heightCm: number;
  goal: "loss" | "gain" | "muscle" | "maintain";
  activityLevel: "beginner" | "intermediate" | "advanced";
}

export interface WorkoutProfile {
  userId?: string;
  gender: "male" | "female";
  age: number;
  weight: number;
  targetWeight: number;
  heightCm: number;
  activityLevel: "beginner" | "intermediate" | "advanced";
  experienceLevel: string;
  goal: string;
  workoutsPerWeek: number;
}

export interface NutritionProfile {
  gender: string;
  age: number;
  heightCm: number;
  weight: number;
  targetWeight: number;
  activityDisplay: string;
  goalDisplay: string;
  startDateISO: string;
}

export interface ProgramPayload {
  userId: string;
  days: number;
  workoutText: string;
  nutritionJson: any;
}

/**
 * Robust POST helper with detailed error extraction
 */
async function safePost(url: string, payload: any): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    console.log("📡 POST", url);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log(`📥 Response from ${url}:`, {
      status: res.status,
      ok: res.ok,
      bodyLength: text.length
    });

    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (parseErr) {
      console.error("❌ JSON parse error:", parseErr);
      return {
        ok: false,
        error: `Invalid JSON response: ${text.slice(0, 200)}`
      };
    }

    if (!res.ok || !data?.ok) {
      // Extract the most specific error message
      const msg = data?.message || data?.error || data?.error_code || (text && text.slice(0, 200)) || `HTTP ${res.status}`;
      console.error("❌ API Error:", msg, data);
      return { ok: false, error: msg, data };
    }

    console.log("✅ Success from", url);
    return { ok: true, data };
  } catch (e: any) {
    console.error("❌ Fetch error:", e);
    return { ok: false, error: e?.message ?? 'שגיאת רשת - לא ניתן להתחבר לשרת' };
  }
}

/**
 * Calculate days to goal
 */
export async function getDays(profile: DaysProfile): Promise<{ ok: boolean; days?: number; error?: string }> {
  const result = await safePost(`${API_BASE}/ai/days`, profile);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, days: result.data.days };
}

/**
 * Generate workout plan
 */
export async function getWorkout(profile: WorkoutProfile): Promise<{ ok: boolean; text?: string; plan?: any; warnings?: any; error?: string }> {
  const result = await safePost(`${API_BASE}/ai/workout`, profile);
  if (!result.ok) {
    // Return detailed error from API
    return { ok: false, error: result.error };
  }

  // Return the plan object (new V2 API returns plan instead of text)
  return {
    ok: true,
    plan: result.data.plan,
    text: JSON.stringify(result.data.plan, null, 2), // For backwards compatibility
    warnings: result.data.warnings
  };
}

/**
 * Generate nutrition plan
 */
export async function getNutrition(profile: NutritionProfile): Promise<{ ok: boolean; json?: any; error?: string }> {
  const result = await safePost(`${API_BASE}/ai/nutrition`, profile);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, json: result.data.json };
}

/**
 * Commit program to database
 */
export async function commitProgram(payload: ProgramPayload): Promise<{ ok: boolean; id?: string; error?: string }> {
  const result = await safePost(`${API_BASE}/ai/commit`, payload);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, id: result.data.id };
}

/**
 * Fetch user's program
 */
export async function getProgram(userId: string): Promise<{ ok: boolean; program?: any; error?: string }> {
  try {
    console.log("📡 GET", `${API_BASE}/ai/program/${userId}`);
    const res = await fetch(`${API_BASE}/ai/program/${userId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }
    return { ok: true, program: data.program };
  } catch (err: any) {
    console.error("getProgram error:", err);
    return { ok: false, error: err.message };
  }
}
