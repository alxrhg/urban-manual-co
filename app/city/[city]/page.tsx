import { Metadata } from 'next';
import { generateCityMetadata } from '@/lib/metadata';
import CityPageClient from './page-client';

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  return generateCityMetadata(city);
}

// Server component wrapper
export default function CityPage() {
  return <CityPageClient />;
}

