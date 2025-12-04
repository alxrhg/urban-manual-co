import { Suspense } from 'react';
import SearchGridSkeleton from '@/components/search/SearchGridSkeleton';
import { Metadata } from 'next';
import ArchitectPageClient from './page-client';
import { slugToArchitectName } from '@/lib/architect-utils';

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const architectName = slugToArchitectName(slug);

  return {
    title: `${architectName} - Destinations | Urban Manual`,
    description: `Discover destinations designed by ${architectName}. Explore restaurants, hotels, and venues designed by this renowned architect.`,
    openGraph: {
      title: `${architectName} - Destinations`,
      description: `Discover destinations designed by ${architectName}`,
    },
  };
}

// Server component wrapper
export default async function ArchitectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<SearchGridSkeleton />}>
      <ArchitectPageClient />
    </Suspense>
  );
}

