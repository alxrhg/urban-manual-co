import { Metadata } from 'next';
import { Suspense } from 'react';
import { generateDestinationsCityMetadata, generateDestinationsBreadcrumb } from '@/lib/metadata';
import CityPageClient from '@/app/city/[city]/page-client';
import SearchGridSkeleton from '@/src/features/search/SearchGridSkeleton';

export async function generateMetadata({ params }: { params: Promise<{ citySlug: string }> }): Promise<Metadata> {
  const { citySlug } = await params;
  return generateDestinationsCityMetadata(citySlug);
}

export default async function DestinationsCityPage({ params }: { params: Promise<{ citySlug: string }> }) {
  const { citySlug } = await params;
  const breadcrumb = generateDestinationsBreadcrumb(citySlug);

  return (
    <>
      {breadcrumb && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumb),
          }}
        />
      )}

      <Suspense fallback={<SearchGridSkeleton />}>
        <CityPageClient />
      </Suspense>
    </>
  );
}
