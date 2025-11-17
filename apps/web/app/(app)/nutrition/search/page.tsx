/**
 * Food Search Page (Server Component Wrapper)
 * Wraps the client component in Suspense to prevent useSearchParams prerender errors
 */

import { Suspense } from 'react';
import NutritionSearchPageClient from './NutritionSearchPageClient';

// Force dynamic rendering (required for searchParams-dependent pages)
export const dynamic = 'force-dynamic';

export default function FoodSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D0E0F]" />}>
      <NutritionSearchPageClient />
    </Suspense>
  );
}
