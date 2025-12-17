import { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, ChevronRight } from 'lucide-react';
import { generateItemListSchema } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Luxury Hotels Worldwide | The Urban Manual',
  description:
    'Discover exceptional luxury hotels and boutique accommodations around the world. From iconic five-star properties to design-forward hideaways.',
  alternates: {
    canonical: 'https://www.urbanmanual.co/luxury-hotels',
  },
  openGraph: {
    title: 'Luxury Hotels Worldwide | The Urban Manual',
    description:
      'Discover exceptional luxury hotels and boutique accommodations around the world. From iconic five-star properties to design-forward hideaways.',
    url: 'https://www.urbanmanual.co/luxury-hotels',
    siteName: 'The Urban Manual',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Luxury Hotels Worldwide | The Urban Manual',
    description:
      'Discover exceptional luxury hotels and boutique accommodations around the world.',
  },
};

export const revalidate = 3600;

function formatCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default async function LuxuryHotelsPage() {
  const supabase = await createServerClient();

  const { data: hotels } = await supabase
    .from('destinations')
    .select('*')
    .eq('category', 'hotel')
    .gte('price_level', 3)
    .order('rating', { ascending: false })
    .order('price_level', { ascending: false });

  const fiveStarEquivalent = hotels?.filter(h => h.price_level === 4 || h.rating >= 4.5) || [];
  const fourStarEquivalent = hotels?.filter(h => h.price_level === 3 && (!h.rating || h.rating < 4.5)) || [];

  const schema = generateItemListSchema(
    hotels?.slice(0, 20).map(h => ({
      name: h.name,
      slug: h.slug,
      image: h.image,
      description: h.micro_description || h.content,
    })) || [],
    'Luxury Hotels Worldwide',
    'https://www.urbanmanual.co/luxury-hotels'
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
            <h1 className="text-3xl md:text-4xl font-light mb-4">
              Luxury Hotels
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Discover {hotels?.length || 0} exceptional hotels and boutique accommodations.
              From iconic grand properties to intimate design-forward hideaways.
            </p>
          </div>

          {/* Featured Luxury Hotels */}
          {fiveStarEquivalent.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <h2 className="text-xl font-medium">Five-Star Luxury</h2>
                <span className="text-sm text-gray-500">({fiveStarEquivalent.length})</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                The pinnacle of hospitality excellence
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {fiveStarEquivalent.slice(0, 12).map((hotel) => (
                  <Link
                    key={hotel.slug}
                    href={`/destination/${hotel.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg mb-3">
                      {hotel.image ? (
                        <Image
                          src={hotel.image}
                          alt={`${hotel.name} - Luxury hotel in ${formatCity(hotel.city)}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 dark:bg-gray-800" />
                      )}
                      {hotel.rating && (
                        <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {hotel.rating.toFixed(1)}
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
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Upscale Hotels */}
          {fourStarEquivalent.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex">
                  {[1, 2, 3, 4].map(i => (
                    <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <h2 className="text-xl font-medium">Upscale Properties</h2>
                <span className="text-sm text-gray-500">({fourStarEquivalent.length})</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Refined accommodations with exceptional service
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {fourStarEquivalent.slice(0, 16).map((hotel) => (
                  <Link
                    key={hotel.slug}
                    href={`/destination/${hotel.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg mb-2">
                      {hotel.image ? (
                        <Image
                          src={hotel.image}
                          alt={`${hotel.name} - Upscale hotel in ${formatCity(hotel.city)}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 dark:bg-gray-800" />
                      )}
                    </div>
                    <h3 className="text-sm font-medium truncate group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                      {hotel.name}
                    </h3>
                    <p className="text-xs text-gray-500">{formatCity(hotel.city)}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Browse by City */}
          <section className="border-t border-gray-100 dark:border-gray-800 pt-12">
            <h2 className="text-lg font-medium mb-4">Browse Luxury Hotels by City</h2>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(hotels?.map(h => h.city) || []))
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
        </div>
      </main>
    </>
  );
}
