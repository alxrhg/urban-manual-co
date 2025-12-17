import { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ChevronRight, Palette } from 'lucide-react';
import { generateItemListSchema } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Design Hotels & Boutique Stays | The Urban Manual',
  description:
    'Discover architecturally significant hotels and design-forward boutique accommodations. Properties where design meets hospitality.',
  alternates: {
    canonical: 'https://www.urbanmanual.co/design-hotels',
  },
  openGraph: {
    title: 'Design Hotels & Boutique Stays | The Urban Manual',
    description:
      'Discover architecturally significant hotels and design-forward boutique accommodations. Properties where design meets hospitality.',
    url: 'https://www.urbanmanual.co/design-hotels',
    siteName: 'The Urban Manual',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Design Hotels & Boutique Stays | The Urban Manual',
    description:
      'Discover architecturally significant hotels and design-forward boutique accommodations.',
  },
};

export const revalidate = 3600;

function formatCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default async function DesignHotelsPage() {
  const supabase = await createServerClient();

  // Fetch hotels that have design-related tags or are known design properties
  const { data: hotels } = await supabase
    .from('destinations')
    .select('*')
    .eq('category', 'hotel')
    .order('rating', { ascending: false });

  // Filter for design-focused hotels based on tags or description
  const designHotels = hotels?.filter(h => {
    const tags = h.tags?.map((t: string) => t.toLowerCase()) || [];
    const description = (h.content || h.micro_description || '').toLowerCase();
    const name = h.name.toLowerCase();

    return (
      tags.some((tag: string) =>
        ['design', 'boutique', 'architecture', 'modern', 'contemporary', 'minimalist', 'art'].includes(tag)
      ) ||
      description.includes('design') ||
      description.includes('architect') ||
      description.includes('boutique') ||
      name.includes('design') ||
      name.includes('boutique')
    );
  }) || hotels || [];

  const schema = generateItemListSchema(
    designHotels.slice(0, 20).map(h => ({
      name: h.name,
      slug: h.slug,
      image: h.image,
      description: h.micro_description || h.content,
    })),
    'Design Hotels & Boutique Stays',
    'https://www.urbanmanual.co/design-hotels'
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <main className="min-h-screen bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <Palette className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-light mb-4">
              Design Hotels
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Where architecture meets hospitality. Discover {designHotels.length} design-forward hotels
              and boutique properties that offer more than just a place to stay.
            </p>
          </div>

          {/* Hotels Grid */}
          <section className="mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {designHotels.slice(0, 24).map((hotel) => (
                <Link
                  key={hotel.slug}
                  href={`/destination/${hotel.slug}`}
                  className="group block"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg mb-3">
                    {hotel.image ? (
                      <Image
                        src={hotel.image}
                        alt={`${hotel.name} - Design hotel in ${formatCity(hotel.city)}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Palette className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                    {hotel.name}
                  </h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {formatCity(hotel.city)}
                    {hotel.country && `, ${hotel.country}`}
                  </p>
                  {hotel.micro_description && (
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                      {hotel.micro_description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>

          {/* Browse by City */}
          <section className="border-t border-gray-100 dark:border-gray-800 pt-12">
            <h2 className="text-lg font-medium mb-4">Browse Design Hotels by City</h2>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(designHotels.map(h => h.city)))
                .slice(0, 20)
                .map((city) => (
                  <Link
                    key={city}
                    href={`/city/${city}?category=hotel`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-full text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {formatCity(city)}
                  </Link>
                ))}
              <Link
                href="/cities"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                All cities
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </section>

          {/* Related Pages */}
          <section className="mt-12 pt-12 border-t border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-medium mb-4">Explore More</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/luxury-hotels"
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <h3 className="font-medium mb-1">Luxury Hotels</h3>
                <p className="text-xs text-gray-500">Five-star properties worldwide</p>
              </Link>
              <Link
                href="/movements"
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <h3 className="font-medium mb-1">Architectural Movements</h3>
                <p className="text-xs text-gray-500">Art Deco to Brutalism</p>
              </Link>
              <Link
                href="/architects"
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <h3 className="font-medium mb-1">Notable Architects</h3>
                <p className="text-xs text-gray-500">Designers behind the spaces</p>
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
