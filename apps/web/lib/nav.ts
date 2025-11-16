// apps/web/utils/nav.ts
/**
 * Hardened navigation for WebView/browser environments
 * Uses multiple fallback mechanisms to ensure navigation happens
 */
export async function hardNavigate(router: any, url: string) {
  // Primary: Next.js router
  try {
    router.replace(url);
  } catch {}

  // Microtask retry (next event loop tick)
  setTimeout(() => {
    try {
      router.replace(url);
    } catch {}
  }, 0);

  // WebView/browser fallback (400ms delay to allow router to work first)
  setTimeout(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== url) {
      window.location.replace(url);
    }
  }, 400);
}
