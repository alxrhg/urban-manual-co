import { Suspense } from 'react';
import { Metadata } from 'next';
import { PortfolioPageClient } from './page-client';
import { SAMPLE_PROJECTS } from '@/data/sample-projects';
import {
  parseFiltersFromPath,
  PROJECT_CATEGORIES,
  PROJECT_LOCATIONS,
  INDUSTRY_TYPES,
} from '@/types/portfolio';

// Revalidate every 5 minutes
export const revalidate = 300;

interface PortfolioPageProps {
  params: Promise<{
    filters?: string[];
  }>;
}

export async function generateMetadata({ params }: PortfolioPageProps): Promise<Metadata> {
  const { filters: filterSegments = [] } = await params;
  const filters = parseFiltersFromPath(filterSegments);

  const filterParts: string[] = [];
  if (filters.category) filterParts.push(filters.category);
  if (filters.location) filterParts.push(filters.location);
  if (filters.industryType) filterParts.push(filters.industryType);

  const title = filterParts.length > 0
    ? `${filterParts.join(' | ')} Projects | Portfolio`
    : 'Portfolio | Urban Manual';

  const description = filterParts.length > 0
    ? `Browse our ${filterParts.join(', ').toLowerCase()} projects and discover exceptional design work.`
    : 'Explore our curated portfolio of architecture, interior design, and graphic design projects from around the world.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

// Generate static paths for common filter combinations
export async function generateStaticParams() {
  const params: { filters: string[] }[] = [
    { filters: [] }, // Base portfolio page
  ];

  // Add category paths
  PROJECT_CATEGORIES.forEach((cat) => {
    params.push({
      filters: ['category', cat.value.toLowerCase().replace(/\s+/g, '-')],
    });
  });

  // Add location paths
  PROJECT_LOCATIONS.forEach((loc) => {
    params.push({
      filters: ['location', loc.value.toLowerCase().replace(/\s+/g, '-')],
    });
  });

  // Add industry type paths
  INDUSTRY_TYPES.forEach((ind) => {
    params.push({
      filters: ['industry-type', ind.value.toLowerCase().replace(/\s+/g, '-')],
    });
  });

  return params;
}

function PortfolioSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Filter skeleton */}
      <div className="mb-8 h-14 rounded-lg bg-neutral-200 dark:bg-neutral-800" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[4/3] rounded-lg bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function PortfolioPage({ params }: PortfolioPageProps) {
  const { filters: filterSegments = [] } = await params;
  const initialFilters = parseFiltersFromPath(filterSegments);

  // In production, fetch from Supabase
  // const { data: projects } = await supabase.from('projects').select('*');
  const projects = SAMPLE_PROJECTS;

  return (
    <main className="min-h-screen bg-[var(--editorial-bg)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--editorial-text-primary)] sm:text-4xl">
            Portfolio
          </h1>
          <p className="mt-2 text-base text-[var(--editorial-text-secondary)]">
            Discover our curated collection of architecture, interior, and graphic design projects
          </p>
        </header>

        {/* Portfolio content */}
        <Suspense fallback={<PortfolioSkeleton />}>
          <PortfolioPageClient
            projects={projects}
            initialFilters={initialFilters}
          />
        </Suspense>
      </div>
    </main>
  );
}
