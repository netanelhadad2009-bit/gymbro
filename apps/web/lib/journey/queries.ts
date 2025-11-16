/**
 * Journey Queries - Client-side API wrappers
 *
 * Type-safe wrappers for journey API endpoints.
 */

export interface JourneyNode {
  id: string;
  chapter_id: string | number; // Allow both for compatibility
  title: string;
  description: string | null;
  order_index: number;
  icon: string | null;
  points?: number; // Optional points field
  primary_task: string | null;
  conditions_json: any;
  progress: {
    state: "LOCKED" | "AVAILABLE" | "ACTIVE" | "COMPLETED";
    progress_json: Record<string, any>;
    completed_at: string | null;
    updated_at?: string | null;
    started_at?: string | null;
  };
}

export interface JourneyChapter {
  id: string | number; // Allow both for compatibility
  title: string;
  description?: string; // Optional description field
  order_index?: number; // Optional order index
  nodes: JourneyNode[];
}

export interface JourneyData {
  chapters: JourneyChapter[];
  total_points: number;
  total_badges: number;
}

export interface JourneyResponse {
  ok: boolean;
  auth: boolean;
  data?: JourneyData;
  error?: string;
  message?: string;
}

export interface TrackResponse {
  ok: boolean;
  can_complete?: boolean;
  satisfied?: string[];
  missing?: string[];
  error?: string;
  message?: string;
}

export interface CompleteResponse {
  ok: boolean;
  points_awarded?: number;
  next_node_id?: string | null;
  message?: string;
  error?: string;
  missing?: string[];
  satisfied?: string[];
}

/**
 * Fetch complete journey with user progress
 */
export async function fetchJourney(): Promise<JourneyResponse> {
  try {
    const response = await fetch("/api/journey", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        ok: false,
        auth: false,
        error: errorData.error || "FetchError",
        message: errorData.message || `HTTP ${response.status}`
      };
    }

    const data = await response.json();
    return data;

  } catch (err: any) {
    console.error("[JourneyQueries] fetchJourney error:", err.message);
    return {
      ok: false,
      auth: false,
      error: "NetworkError",
      message: err.message
    };
  }
}

/**
 * Track task progress
 *
 * @param task_key - The condition key being tracked (e.g., "weigh_in_today")
 * @param value - Optional value (defaults to true)
 * @param node_id - Optional specific node to track against
 */
export async function trackTask(
  task_key: string,
  value?: any,
  node_id?: string
): Promise<TrackResponse> {
  try {
    const response = await fetch("/api/journey/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        task_key,
        value,
        node_id
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        ok: false,
        error: errorData.error || "TrackError",
        message: errorData.message || `HTTP ${response.status}`
      };
    }

    const data = await response.json();
    return data;

  } catch (err: any) {
    console.error("[JourneyQueries] trackTask error:", err.message);
    return {
      ok: false,
      error: "NetworkError",
      message: err.message
    };
  }
}

/**
 * Complete a journey node
 *
 * @param node_id - The UUID of the node to complete
 */
export async function completeNode(node_id: string): Promise<CompleteResponse> {
  try {
    const response = await fetch("/api/journey/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        node_id
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        ok: false,
        error: errorData.error || "CompleteError",
        message: errorData.message || `HTTP ${response.status}`,
        missing: errorData.missing,
        satisfied: errorData.satisfied
      };
    }

    const data = await response.json();
    return data;

  } catch (err: any) {
    console.error("[JourneyQueries] completeNode error:", err.message);
    return {
      ok: false,
      error: "NetworkError",
      message: err.message
    };
  }
}

/**
 * Helper: Find current active node for user
 */
export function findActiveNode(data: JourneyData): JourneyNode | null {
  for (const chapter of data.chapters) {
    for (const node of chapter.nodes) {
      if (node.progress.state === "ACTIVE") {
        return node;
      }
    }
  }
  return null;
}

/**
 * Helper: Find next available node for user
 */
export function findNextAvailableNode(data: JourneyData): JourneyNode | null {
  for (const chapter of data.chapters) {
    for (const node of chapter.nodes) {
      if (node.progress.state === "AVAILABLE") {
        return node;
      }
    }
  }
  return null;
}

/**
 * Helper: Calculate completion percentage
 */
export function calculateProgress(data: JourneyData): number {
  let total = 0;
  let completed = 0;

  for (const chapter of data.chapters) {
    for (const node of chapter.nodes) {
      total++;
      if (node.progress.state === "COMPLETED") {
        completed++;
      }
    }
  }

  return total > 0 ? Math.round((completed / total) * 100) : 0;
}
