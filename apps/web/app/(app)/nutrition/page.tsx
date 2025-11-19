/**
 * Nutrition Page (Server Component Wrapper)
 * Wraps the client component in Suspense to prevent useSearchParams prerender errors
 */

import { Suspense } from 'react';
import NutritionPageClient from './NutritionPageClient';

// Force dynamic rendering (required for pages using searchParams)
export const dynamic = 'force-dynamic';

export default function NutritionPage() {
  return (
    <Suspense fallback={<div className="min-h-[100svh] bg-[#0e0f12]" />}>
      <NutritionPageClient />
    </Suspense>
  );
}
