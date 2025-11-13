import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { FilterChip } from '@/components/design-system/Chip';
import { ResultsGrid } from '@/components/design-system/ResultsGrid';
import { SectionHeader } from '@/components/design-system/Section';

type SnapshotMap = Record<string, string>;

function generateSnapshots(): SnapshotMap {
  const filterChip = renderToStaticMarkup(
    <FilterChip label="Taipei" selected tone="gray" />
  );

  const filterChipInactive = renderToStaticMarkup(
    <FilterChip label="Michelin" selected={false} tone="default" />
  );

  const sectionHeader = renderToStaticMarkup(
    <SectionHeader
      eyebrow="Featured"
      title="Curated Destinations"
      description="Snapshot verification"
      actions={<button type="button">Action</button>}
    />
  );

  const resultsGrid = renderToStaticMarkup(
    <ResultsGrid
      items={[{ name: 'A' }, { name: 'B' }]}
      keyExtractor={(item) => item.name}
      renderItem={(item) => <div>{item.name}</div>}
    />
  );

  return {
    filterChip,
    filterChipInactive,
    sectionHeader,
    resultsGrid,
  };
}

const SNAPSHOTS: SnapshotMap = {
  filterChip:
    '<button class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 dark:focus-visible:ring-white bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/10 dark:bg-white dark:text-gray-900 dark:border-white dark:shadow-white/10" aria-pressed="true"><span class="truncate">Taipei</span></button>',
  filterChipInactive:
    '<button class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 dark:focus-visible:ring-white bg-white/80 text-gray-600 border-gray-200 hover:border-gray-300 dark:bg-gray-900/60 dark:text-gray-200 dark:border-gray-700 dark:hover:border-gray-600" aria-pressed="false"><span class="truncate">Michelin</span></button>',
  sectionHeader:
    '<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div class="space-y-2"><div class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Featured</div><div class="flex items-center gap-2"><h2 class="text-xl font-semibold text-gray-900 dark:text-white">Curated Destinations</h2></div><p class="text-sm text-gray-600 dark:text-gray-400 max-w-3xl">Snapshot verification</p></div><div class="flex flex-wrap items-center gap-3"><button type="button">Action</button></div></div>',
  resultsGrid:
    '<div class="grid items-start gap-4 md:gap-6 lg:gap-8 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"><div>A</div><div>B</div></div>',
};

const shouldPrint = process.argv.includes('--print');
const current = generateSnapshots();

if (shouldPrint) {
  console.log(JSON.stringify(current, null, 2));
  process.exit(0);
}

for (const [key, expected] of Object.entries(SNAPSHOTS)) {
  const actual = current[key];
  if (!actual) {
    throw new Error(`Missing snapshot for ${key}`);
  }
  if (actual !== expected) {
    throw new Error(`Snapshot mismatch for ${key}`);
  }
}

console.log('Design system snapshots verified.');
