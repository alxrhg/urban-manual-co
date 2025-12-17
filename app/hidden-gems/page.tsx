import { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ChevronRight, Gem, Coffee, Wine, Utensils } from 'lucide-react';
import { generateItemListSchema } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Hidden Gems & Local Favorites | The Urban Manual',
  description:
    'Discover off-the-beaten-path restaurants, cafes, and bars. Local favorites and hidden gems curated by travelers who know.',
  alternates: {
    canonical: 'https://www.urbanmanual.co/hidden-gems',
  },
  openGraph: {
    title: 'Hidden Gems & Local Favorites | The Urban Manual',
    description:
      'Discover off-the-beaten-path restaurants, cafes, and bars. Local favorites and hidden gems curated by travelers who know.',
    url: 'https://www.urbanmanual.co/hidden-gems',
    siteName: 'The Urban Manual',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hidden Gems & Local Favorites | The Urban Manual',
    description:
      'Discover off-the-beaten-path restaurants, cafes, and bars. Local favorites and hidden gems.',
  },
};

export const revalidate = 3600;

function formatCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const categoryIcons: Record<string, React.ElementType> = {
  restaurant: Utensils,
  cafe: Coffee,
  bar: Wine,
};

export default async function HiddenGemsPage() {
  const supabase = await createServerClient();

  // Fetch non-Michelin restaurants, cafes, and bars with good ratings
  // These are typically local favorites that aren't in the spotlight
  const { data: destinations } = await supabase
    .from('destinations')
    .select('*')
    .in('category', ['restaurant', 'Restaurant', 'cafe', 'bar', 'bakery'])
    .or('michelin_stars.is.null,michelin_stars.eq.0')
    .order('rating', { ascending: false });

  // Group by category
  const restaurants = destinations?.filter(d =>
    d.category?.toLowerCase() === 'restaurant'
  ) || [];
  const cafes = destinations?.filter(d =>
    ['cafe', 'bakery'].includes(d.category?.toLowerCase())
  ) || [];
  const bars = destinations?.filter(d =>
    d.category?.toLowerCase() === 'bar'
  ) || [];

  const schema = generateItemListSchema(
    destinations?.slice(0, 20).map(d => ({
      name: d.name,
      slug: d.slug,
      image: d.image,
      description: d.micro_description || d.content,
    })) || [],
    'Hidden Gems & Local Favorites',
    'https://www.urbanmanual.co/hidden-gems'
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
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 mb-4">
              <Gem className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-light mb-4">
              Hidden Gems
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Beyond the guidebooks and away from the crowds. Discover {destinations?.length || 0} local
              favorites, neighborhood spots, and hidden treasures curated by travelers who know.
            </p>
          </div>

          {/* Restaurants */}
          {restaurants.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <Utensils className="w-5 h-5 text-gray-400" />
                <h2 className="text-xl font-medium">Local Restaurants</h2>
                <span className="text-sm text-gray-500">({restaurants.length})</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {restaurants.slice(0, 12).map((dest) => (
                  <Link
                    key={dest.slug}
                    href={`/destination/${dest.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg mb-2">
                      {dest.image ? (
                        <Image
                          src={dest.image}
                          alt={`${dest.name} - Local restaurant in ${formatCity(dest.city)}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Utensils className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-medium truncate group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                      {dest.name}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {formatCity(dest.city)}
                    </p>
                  </Link>
                ))}
              </div>
              {restaurants.length > 12 && (
                <div className="mt-4 text-center">
                  <Link
                    href="/category/restaurant"
                    className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white inline-flex items-center gap-1"
                  >
                    View all restaurants
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* Cafes */}
          {cafes.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <Coffee className="w-5 h-5 text-gray-400" />
                <h2 className="text-xl font-medium">Neighborhood Cafes</h2>
                <span className="text-sm text-gray-500">({cafes.length})</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {cafes.slice(0, 8).map((dest) => (
                  <Link
                    key={dest.slug}
                    href={`/destination/${dest.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg mb-2">
                      {dest.image ? (
                        <Image
                          src={dest.image}
                          alt={`${dest.name} - Cafe in ${formatCity(dest.city)}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Coffee className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-medium truncate group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                      {dest.name}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {formatCity(dest.city)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Bars */}
          {bars.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <Wine className="w-5 h-5 text-gray-400" />
                <h2 className="text-xl font-medium">Secret Bars</h2>
                <span className="text-sm text-gray-500">({bars.length})</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {bars.slice(0, 8).map((dest) => (
                  <Link
                    key={dest.slug}
                    href={`/destination/${dest.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg mb-2">
                      {dest.image ? (
                        <Image
                          src={dest.image}
                          alt={`${dest.name} - Bar in ${formatCity(dest.city)}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Wine className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-medium truncate group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                      {dest.name}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {formatCity(dest.city)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Browse by City */}
          <section className="border-t border-gray-100 dark:border-gray-800 pt-12">
            <h2 className="text-lg font-medium mb-4">Explore Hidden Gems by City</h2>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(destinations?.map(d => d.city) || []))
                .slice(0, 20)
                .map((city) => (
                  <Link
                    key={city}
                    href={`/city/${city}`}
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
                href="/best-michelin-restaurants"
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <h3 className="font-medium mb-1">Michelin Restaurants</h3>
                <p className="text-xs text-gray-500">Starred dining worldwide</p>
              </Link>
              <Link
                href="/explore"
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <h3 className="font-medium mb-1">Explore All</h3>
                <p className="text-xs text-gray-500">Filter by category and city</p>
              </Link>
              <Link
                href="/map"
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <h3 className="font-medium mb-1">Map View</h3>
                <p className="text-xs text-gray-500">Find destinations nearby</p>
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
