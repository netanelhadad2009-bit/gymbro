import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const isDev = process.env.NODE_ENV !== "production";

const isEnabled =
  typeof window !== "undefined" &&
  !!MIXPANEL_TOKEN &&
  process.env.NODE_ENV !== "test";

if (isEnabled) {
  mixpanel.init(MIXPANEL_TOKEN as string, {
    debug: isDev,
    track_pageview: false,

    // --- Session Replay Configuration ---
    // Dev/Preview: 100% sampling to verify setup
    // Production: controlled by env var (default 15%)
    record_sessions_percent: isDev
      ? 100
      : Number(process.env.NEXT_PUBLIC_MIXPANEL_REPLAY_SAMPLE ?? "15"),

    // 30 minute idle timeout (Mixpanel default)
    record_idle_timeout_ms: 30 * 60 * 1000,

    // Enable heatmaps, rage clicks, dead clicks for UX analysis
    record_heatmap_data: true,

    // PRIVACY: Keep Mixpanel's default masking for text/inputs
    // All text is masked and inputs are blocked by default
    // Do NOT set record_mask_text_selector or record_block_selector to empty
  });
}

export function track(event: string, props?: Record<string, any>) {
  if (!isEnabled) return;
  mixpanel.track(event, props);
}

export function identify(userId: string) {
  if (!isEnabled) return;
  mixpanel.identify(userId);
}

export function setUserProps(props: Record<string, any>) {
  if (!isEnabled) return;
  mixpanel.people.set(props);
}

// --- Session Replay Control Helpers ---
// Use these to manually stop/start recording on sensitive pages if needed

/**
 * Stop session recording (e.g., on sensitive pages like weight/measurements)
 * Call this on page mount if you want to pause recording
 */
export function stopReplay() {
  if (typeof window === "undefined" || !isEnabled) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mixpanel as any).stop_session_recording?.();
  } catch (e) {
    console.warn("[Mixpanel] stop_session_recording failed", e);
  }
}

/**
 * Start/resume session recording
 * Call this when leaving a sensitive page to resume recording
 */
export function startReplay() {
  if (typeof window === "undefined" || !isEnabled) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mixpanel as any).start_session_recording?.();
  } catch (e) {
    console.warn("[Mixpanel] start_session_recording failed", e);
  }
}
