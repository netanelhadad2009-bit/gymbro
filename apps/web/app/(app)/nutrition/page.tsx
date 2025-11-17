/**
 * Nutrition Page (Server Component Wrapper)
 * Wraps the client component in Suspense to prevent useSearchParams prerender errors
 */

import { Suspense } from 'react';
import NutritionPageClient from './NutritionPageClient';

// Force dynamic rendering (required for searchParams-dependent pages)
export const dynamic = 'force-dynamic';

export default function NutritionPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#0D0E0F]" />}>
      <NutritionPageClient />
    </Suspense>
  );
}
