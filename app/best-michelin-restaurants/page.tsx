import { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, ChevronRight } from 'lucide-react';
import { generateItemListSchema } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Best Michelin-Starred Restaurants Worldwide | The Urban Manual',
  description:
    'Discover the finest Michelin-starred restaurants around the world. From 3-star temples of gastronomy to hidden 1-star gems, explore our curated collection of exceptional dining.',
  alternates: {
    canonical: 'https://www.urbanmanual.co/best-michelin-restaurants',
  },
  openGraph: {
    title: 'Best Michelin-Starred Restaurants Worldwide | The Urban Manual',
    description:
      'Discover the finest Michelin-starred restaurants around the world. From 3-star temples of gastronomy to hidden gems.',
    url: 'https://www.urbanmanual.co/best-michelin-restaurants',
    siteName: 'The Urban Manual',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Michelin-Starred Restaurants Worldwide | The Urban Manual',
    description:
      'Discover the finest Michelin-starred restaurants around the world. From 3-star temples of gastronomy to hidden gems.',
  },
};

export const revalidate = 3600; // Revalidate every hour

function formatCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default async function BestMichelinRestaurantsPage() {
  const supabase = await createServerClient();

  const { data: restaurants } = await supabase
    .from('destinations')
    .select('*')
    .in('category', ['restaurant', 'Restaurant'])
    .gt('michelin_stars', 0)
    .order('michelin_stars', { ascending: false })
    .order('rating', { ascending: false });

  const threeStars = restaurants?.filter(r => r.michelin_stars === 3) || [];
  const twoStars = restaurants?.filter(r => r.michelin_stars === 2) || [];
  const oneStar = restaurants?.filter(r => r.michelin_stars === 1) || [];

  // Generate schema for SEO
  const schema = generateItemListSchema(
    restaurants?.slice(0, 20).map(r => ({
      name: r.name,
      slug: r.slug,
      image: r.image,
      description: r.micro_description || r.content,
    })) || [],
    'Best Michelin-Starred Restaurants',
    'https://www.urbanmanual.co/best-michelin-restaurants'
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
              Michelin-Starred Restaurants
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Discover {restaurants?.length || 0} exceptional restaurants honored by the Michelin Guide.
              From legendary 3-star establishments to rising 1-star gems.
            </p>
          </div>

          {/* 3 Stars Section */}
          {threeStars.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex">
                  {[1, 2, 3].map(i => (
                    <Star key={i} className="w-5 h-5 text-red-600 fill-red-600" />
                  ))}
                </div>
                <h2 className="text-xl font-medium">Three Michelin Stars</h2>
                <span className="text-sm text-gray-500">({threeStars.length})</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Exceptional cuisine, worth a special journey
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {threeStars.map((restaurant) => (
                  <Link
                    key={restaurant.slug}
                    href={`/destination/${restaurant.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg mb-3">
                      {restaurant.image ? (
                        <Image
                          src={restaurant.image}
                          alt={`${restaurant.name} - 3 Michelin star restaurant in ${formatCity(restaurant.city)}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 dark:bg-gray-800" />
                      )}
                    </div>
                    <h3 className="font-medium group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                      {restaurant.name}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {formatCity(restaurant.city)}
                      {restaurant.country && `, ${restaurant.country}`}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 2 Stars Section */}
          {twoStars.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex">
                  {[1, 2].map(i => (
                    <Star key={i} className="w-5 h-5 text-red-600 fill-red-600" />
                  ))}
                </div>
                <h2 className="text-xl font-medium">Two Michelin Stars</h2>
                <span className="text-sm text-gray-500">({twoStars.length})</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Excellent cooking, worth a detour
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {twoStars.map((restaurant) => (
                  <Link
                    key={restaurant.slug}
                    href={`/destination/${restaurant.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg mb-2">
                      {restaurant.image ? (
                        <Image
                          src={restaurant.image}
                          alt={`${restaurant.name} - 2 Michelin star restaurant in ${formatCity(restaurant.city)}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 dark:bg-gray-800" />
                      )}
                    </div>
                    <h3 className="text-sm font-medium truncate group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                      {restaurant.name}
                    </h3>
                    <p className="text-xs text-gray-500">{formatCity(restaurant.city)}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 1 Star Section */}
          {oneStar.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <Star className="w-5 h-5 text-red-600 fill-red-600" />
                <h2 className="text-xl font-medium">One Michelin Star</h2>
                <span className="text-sm text-gray-500">({oneStar.length})</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                High-quality cooking, worth a stop
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {oneStar.map((restaurant) => (
                  <Link
                    key={restaurant.slug}
                    href={`/destination/${restaurant.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg mb-2">
                      {restaurant.image ? (
                        <Image
                          src={restaurant.image}
                          alt={`${restaurant.name} - 1 Michelin star restaurant in ${formatCity(restaurant.city)}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 50vw, 20vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 dark:bg-gray-800" />
                      )}
                    </div>
                    <h3 className="text-sm font-medium truncate group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                      {restaurant.name}
                    </h3>
                    <p className="text-xs text-gray-500">{formatCity(restaurant.city)}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Browse by City */}
          <section className="border-t border-gray-100 dark:border-gray-800 pt-12">
            <h2 className="text-lg font-medium mb-4">Browse Michelin Restaurants by City</h2>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(restaurants?.map(r => r.city) || []))
                .slice(0, 20)
                .map((city) => (
                  <Link
                    key={city}
                    href={`/city/${city}?category=restaurant`}
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
