/**
 * Design Movement Page
 * Explore destinations by design movement
 */

import { Suspense } from 'react';
import { Metadata } from 'next';
import MovementPageClient from './page-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const movementName = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${movementName} Architecture | Urban Manual`,
    description: `Discover destinations designed in the ${movementName} style. Explore ${movementName} architecture around the world.`,
    openGraph: {
      title: `${movementName} Architecture`,
      description: `Explore ${movementName} architecture destinations`,
    },
  };
}

export default async function MovementPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MovementPageClient slug={slug} />
    </Suspense>
  );
}

