import Link from 'next/link';
import { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase-server';
import { generateDestinationsIndexMetadata } from '@/lib/metadata';
import { formatCityName, toKebabCase } from '@/lib/slug';

export async function generateMetadata(): Promise<Metadata> {
  return generateDestinationsIndexMetadata();
}

interface CityRecord {
  slug: string;
  displayName: string;
  country?: string | null;
  total: number;
}

export default async function DestinationsIndexPage() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('destinations')
    .select('city, country')
    .order('city', { ascending: true });

  if (error) {
    console.error('[Destinations Index] Failed to fetch cities:', error);
  }

  const cityMap = new Map<string, CityRecord>();
  (data || []).forEach(row => {
    if (!row.city) return;
    const slug = toKebabCase(row.city);
    if (!slug) return;

    const existing = cityMap.get(slug);
    if (existing) {
      existing.total += 1;
    } else {
      cityMap.set(slug, {
        slug,
        displayName: formatCityName(row.city),
        country: row.country,
        total: 1,
      });
    }
  });

  const cities = Array.from(cityMap.values()).slice(0, 32);

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-5xl space-y-10">
        <section className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Destinations</p>
          <h1 className="text-4xl font-semibold text-gray-900 dark:text-white">Where to next?</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Browse curated city collections populated from Supabase so you can quickly land on every
            thoughtfully selected restaurant, hotel, and cultural spot. Each listing follows a
            consistent city-first slug structure to keep URLs clean for search engines and travelers.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Cities with guides</h2>
            <span className="text-sm text-gray-500">{cities.length} highlights</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {cities.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
                No destinations available yet.
              </div>
            ) : (
              cities.map(city => (
                <Link
                  key={city.slug}
                  href={`/destinations/${city.slug}`}
                  className="rounded-3xl border border-gray-200 bg-white/70 p-6 shadow-sm transition hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/70"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">{city.displayName}</p>
                    <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                      {city.total}+ spots
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{city.country || 'Multiple countries'}</p>
                  <p className="mt-4 text-sm font-semibold text-blue-600 dark:text-blue-400">Explore →</p>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
