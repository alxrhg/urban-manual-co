import type { Metadata } from 'next';
import { generateSearchMetadata } from '@/lib/metadata';
import SearchPageClient from './page-client';

type SearchParams = Record<string, string | string[] | undefined>;

export function generateMetadata({ searchParams }: { searchParams: SearchParams }): Metadata {
  return generateSearchMetadata(searchParams);
}

export default function SearchPage() {
  return <SearchPageClient />;
}

