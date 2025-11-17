/**
 * Onboarding Generating Page (Server Component Wrapper)
 * Wraps the client component in Suspense to prevent useSearchParams prerender errors
 */

import { Suspense } from 'react';
import OnboardingGeneratingClient from './OnboardingGeneratingClient';

// Force dynamic rendering (required for searchParams-dependent pages)
export const dynamic = 'force-dynamic';

export default function GeneratingPage() {
  return (
    <Suspense fallback={<div className="min-h-[100svh] bg-[#0e0f12]" />}>
      <OnboardingGeneratingClient />
    </Suspense>
  );
}
