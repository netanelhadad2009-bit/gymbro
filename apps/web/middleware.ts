/**
 * Middleware for auth and onboarding flow protection
 * Handles redirects for authenticated/unauthenticated users
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: req,
  });

  const { pathname } = req.nextUrl;

  // Allow onboarding pages without authentication (guest flow)
  // Skip all auth checks for onboarding to avoid Supabase calls
  if (pathname.startsWith("/onboarding")) {
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({
            request: req,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If accessing root path with a session
  if (pathname === "/" && session) {
    // Get onboarding progress
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const progress = user.user_metadata?.onboarding_progress || {
        lastCompletedIndex: -1,
      };
      const TOTAL_STEPS = 15; // Updated: added longterm and reminders pages

      // If onboarding not complete, redirect to next step
      if (progress.lastCompletedIndex < TOTAL_STEPS - 1) {
        const ONBOARDING_STEPS = [
          "gender",
          "goals",
          "frequency",
          "experience",
          "motivation",
          "longterm",
          "metrics",
          "birthdate",
          "target-weight",
          "goal-summary",
          "pace",
          "activity",
          "diet",
          "readiness",
          "reminders",
        ];

        const nextStepIndex = progress.lastCompletedIndex + 1;
        const nextStep = ONBOARDING_STEPS[nextStepIndex];
        return NextResponse.redirect(
          new URL(`/onboarding/${nextStep}`, req.url)
        );
      } else {
        // Onboarding complete, go to dashboard
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: ["/", "/onboarding/:path*"],
};
