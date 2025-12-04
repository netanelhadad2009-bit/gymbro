import { NextResponse, NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const url = new URL(req.url);
  const path = url.pathname;
  const userAgent = req.headers.get('user-agent') || '';

  // Detect Capacitor native apps by User-Agent
  // Capacitor apps have custom User-Agent containing the app bundle ID
  // On iOS: "... Mobile/... com.fitjourney.app/..."
  // On Android: "... wv)..." (WebView) or contains bundle ID
  const isCapacitorApp = userAgent.includes('com.fitjourney.app') ||
    (userAgent.includes('Mobile') && (userAgent.includes('wv)') || userAgent.includes('Android')));

  console.log(`[Middleware] Request: ${path}`, {
    userAgent: userAgent.slice(0, 80),
    isCapacitorApp,
    timestamp: new Date().toISOString(),
  });

  // Skip auth check for native Capacitor apps
  // Native apps store session in Capacitor Preferences (not cookies)
  // Client-side auth is handled by the app itself
  if (isCapacitorApp) {
    console.log(`[Middleware] Native Capacitor app detected, skipping server-side auth check for: ${path}`);
    return res;
  }

  // Allow static assets, API calls, and mobile-boot without auth check
  if (
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.startsWith("/images") ||
    path === "/favicon.ico" ||
    path === "/mobile-boot" ||
    path === "/minimal-test" ||
    path === "/test" ||
    path === "/ios-test" ||
    // Skip static files (images, fonts, etc.)
    /\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$/i.test(path)
  ) {
    console.log(`[Middleware] Skipping auth check for: ${path}`);
    return res;
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) { return req.cookies.get(name)?.value; },
          set() {},
          remove() {},
        },
      }
    );

    // Check if user is logged in
    const { data: { session }, error } = await supabase.auth.getSession();

    // If there's an error getting session, let the request through
    // The client-side will handle auth state
    if (error) {
      console.warn("[Middleware] Error getting session:", error.message);
      return res;
    }

    if (!session) {
      // ❌ Not logged in → show landing page
      console.log(`[Middleware] No session detected for path: ${path}`);
      if (path === "/" || path.startsWith("/auth") || path.startsWith("/signup") || path.startsWith("/login") || path.startsWith("/onboarding")) {
        console.log(`[Middleware] Allowing unauthenticated access to: ${path}`);
        return res;
      }
      console.log(`[Middleware] Redirecting to / (no session, protected route attempted)`);
      return NextResponse.redirect(new URL("/", req.url));
    }

    // ✅ Logged in → always go to main app
    console.log(`[Middleware] Session found for user: ${session.user.id.slice(0, 8)}...`);

    // Allow /auth/processing to run post-auth flow before redirecting
    if (path === "/auth/processing" || path === "/auth/callback") {
      console.log(`[Middleware] Allowing authenticated user to access: ${path}`);
      return res;
    }

    if (path === "/" || path.startsWith("/onboarding") || path.startsWith("/auth") || path.startsWith("/signup")) {
      console.log(`[Middleware] Authenticated user accessing public route, redirecting to /journey`);
      return NextResponse.redirect(new URL("/journey", req.url));
    }

    console.log(`[Middleware] Allowing authenticated access to: ${path}`);

    return res;
  } catch (e) {
    // If middleware fails, let the request through
    console.error("[Middleware] Error:", e);
    return res;
  }
}

export const config = {
  matcher: [
    "/((?!_next|api|favicon.ico|images|assets).*)"
  ],
};