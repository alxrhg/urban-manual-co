import { Metadata } from 'next';
import { Suspense } from 'react';
import DetailSkeleton from '@/src/features/detail/DetailSkeleton';
import { generateDestinationMetadata, generateDestinationSchema } from '@/lib/metadata';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import DestinationPageClient from './page-client';

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return generateDestinationMetadata(slug);
}

// Server component wrapper
export default async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  // Fetch destination data on server for structured data
  let destination: Destination | null = null;
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!error && data) {
      destination = data as Destination;
    }
  } catch (error) {
    console.error('Error fetching destination for schema:', error);
  }

  // Generate structured data schema
  const schema = destination ? generateDestinationSchema(destination) : null;

  return (
    <>
      {/* Add structured data (Schema.org JSON-LD) */}
      {/* JSON.stringify() already escapes all special characters - safe for script tags */}
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema),
          }}
        />
      )}
      
      {/* Render client component */}
      <Suspense fallback={<DetailSkeleton />}>
        <DestinationPageClient />
      </Suspense>
    </>
  );
}
