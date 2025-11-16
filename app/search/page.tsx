'use client';

import { Suspense } from 'react';
import { SearchPage } from '@/src/modules/search/public-api';
import { Skeleton } from '@/components/ui/skeleton';

export default function SearchRoute() {
  return (
    <Suspense
      fallback={
        <div className="px-6 md:px-10 py-10">
          <div className="text-sm text-neutral-500 mb-4">with our in-house travel intelligence…</div>
          <Skeleton className="h-4 w-48 rounded mb-6" />
          <Skeleton className="h-5 w-80 rounded mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        </div>
      }
    >
      <SearchPage />
    </Suspense>
  );
}
