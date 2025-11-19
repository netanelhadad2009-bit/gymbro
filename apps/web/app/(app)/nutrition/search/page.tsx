/**
 * Food Search Page (Server Component Wrapper)
 * Wraps the client component in Suspense to prevent useSearchParams prerender errors
 */

import { Suspense } from 'react';
import NutritionSearchPageClient from './NutritionSearchPageClient';

// Force dynamic rendering (required for pages using searchParams)
export const dynamic = 'force-dynamic';

export default function FoodSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-[100svh] bg-[#0e0f12]" />}>
      <NutritionSearchPageClient />
    </Suspense>
  );
}
