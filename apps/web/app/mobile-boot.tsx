"use client";

// MobileBoot: Simple wrapper that just renders children
// Auth redirects are handled by middleware.ts
export default function MobileBoot({ children }: { children: React.ReactNode }) {
  // Just render children - let middleware handle auth redirects
  return <>{children}</>;
}