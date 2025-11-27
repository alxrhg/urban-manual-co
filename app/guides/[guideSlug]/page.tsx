import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Destination } from '@/types/destination';
import { createServerClient } from '@/lib/supabase-server';
import { parseGuideSlug, resolveCategoryFilter } from '@/lib/guide';
import {
  generateGuideMetadata,
  generateGuideBreadcrumb,
} from '@/lib/metadata';
import { DestinationCard } from '@/components/DestinationCard';

type SupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

async function fetchGuideDestinations(
  supabase: SupabaseClient,
  options: {
    city?: string;
    category?: string;
    limit?: number;
  }
) {
  let query = supabase
    .from('destinations')
    .select(
      'id, slug, name, city, category, country, neighborhood, image, image_thumbnail, description, rating, price_level, tags'
    )
    .order('rating', { ascending: false })
    .order('name', { ascending: true })
    .limit(options.limit || 6);

  if (options.city && options.city !== 'global') {
    query = query.eq('city', options.city);
  }

  if (options.category) {
    query = query.ilike('category', `%${options.category}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[Guide Page] Destination fetch error:', error);
    return [] as Destination[];
  }

  return (data || []) as Destination[];
}

export async function generateMetadata({ params }: { params: Promise<{ guideSlug: string }> }): Promise<Metadata> {
  const { guideSlug } = await params;
  const { cityDisplayName, categoryLabel } = parseGuideSlug(guideSlug);

  return generateGuideMetadata({
    guideSlug,
    cityDisplayName,
    categoryLabel,
  });
}

export default async function GuidePage({ params }: { params: Promise<{ guideSlug: string }> }) {
  const { guideSlug } = await params;
  const {
    citySlug,
    cityDisplayName,
    categorySlug,
    categoryLabel,
    focusKeyword,
  } = parseGuideSlug(guideSlug);

  const categoryFilter = resolveCategoryFilter(categorySlug);
  const supabase = await createServerClient();

  const [heroDestinations, restaurants, hotels, cafes, shopping, beaches] = await Promise.all([
    fetchGuideDestinations(supabase, { city: citySlug, category: categoryFilter, limit: 6 }),
    fetchGuideDestinations(supabase, { city: citySlug, category: 'Restaurant', limit: 4 }),
    fetchGuideDestinations(supabase, { city: citySlug, category: 'Hotel', limit: 4 }),
    fetchGuideDestinations(supabase, { city: citySlug, category: 'Cafe', limit: 3 }),
    fetchGuideDestinations(supabase, { city: citySlug, category: 'Shopping', limit: 3 }),
    fetchGuideDestinations(supabase, { city: citySlug, category: 'Beach', limit: 3 }),
  ]);

  if (!heroDestinations.length && citySlug !== 'global') {
    notFound();
  }

  const heroImage = heroDestinations[0]?.image || heroDestinations[0]?.image_thumbnail;
  const galleryImages = heroDestinations
    .map(dest => dest.image_thumbnail || dest.image)
    .filter(Boolean)
    .slice(0, 5);
  const neighborhoods = Array.from(
    new Set(
      heroDestinations
        .map(dest => dest.neighborhood)
        .filter(Boolean)
        .slice(0, 3)
    )
  );

  const highlightNames = heroDestinations.slice(0, 3).map(dest => dest.name);
  const priceLevels = heroDestinations
    .map(dest => dest.price_level)
    .filter((level): level is number => typeof level === 'number');

  const minPrice = priceLevels.length ? Math.min(...priceLevels) : null;
  const maxPrice = priceLevels.length ? Math.max(...priceLevels) : null;

  const faqItems = [
    {
      question: `${cityDisplayName} is known for what makes its ${categoryLabel.toLowerCase()} scene special?`,
      answer: `We highlight ${highlightNames.length ? highlightNames.join(', ') : 'the most inspired names'} to capture the narrative of ${categoryLabel.toLowerCase()} in ${cityDisplayName}.`,
    },
    {
      question: `When is the best time to explore ${categoryLabel.toLowerCase()} in ${cityDisplayName}?`,
      answer: `Plan for shoulder seasons when the weather is mild and crowds thin so you can savor each experience without the waitlists.`,
    },
    {
      question: `Do I need to book in advance?`,
      answer: `Most of the curated entries require reservations, so lock in a table or room at least 2–4 weeks before you travel.`,
    },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  const relatedPlaces = Array.from(
    new Map(
      [...restaurants, ...hotels, ...cafes]
        .filter(place => place.slug)
        .map(place => [place.slug, place])
    ).values()
  ).slice(0, 6);

  const introParagraph = `Experience ${categoryLabel.toLowerCase()} in ${cityDisplayName} through this concise, data-driven guide. We pull Supabase-powered insights—neighborhood context, bookable favorites, and local flavor—so you can plan without toggling between tabs. Follow the sections below for curated top picks, location notes, seasonal guidance, and booking signals before you arrive.`;
  const locationParagraph = neighborhoods.length
    ? `These recommendations cluster around ${neighborhoods.join(', ')}, giving you direct access to the most vibrant ${categoryLabel.toLowerCase()} scenes.`
    : `Our selections are spread across the safest, most walkable pockets of ${cityDisplayName} for easy transitions between meals, rooms, and culture.`;
  const bestTimeParagraph = `${cityDisplayName} shines in shoulder seasons, when mild weather promises comfortable strolls and shorter queues at the most sought-after ${categoryLabel.toLowerCase()} addresses.`;
  const highlightsParagraph = highlightNames.length
    ? `${highlightNames.join(', ')} exemplify the elevated standards we seek: design-forward ambiance, flavorful kitchens, and consistently excellent hospitality.`
    : `Each entry was hand-verified for service, ambiance, and story.`;
  const pricingParagraph = priceLevels.length
    ? `Expect price levels from ${'$'.repeat(minPrice || 0)} to ${'$'.repeat(maxPrice || 0)}, so you can align this visit with your desired level of indulgence.`
    : `Pricing varies across the collection, with both approachable and high-end options on rotation.`;

  const breadcrumb = generateGuideBreadcrumb(citySlug, guideSlug, categoryLabel);

  return (
    <main className="min-h-screen px-6 py-12 sm:px-10 lg:px-14">
      {breadcrumb && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumb),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />

      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <section
          className="overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-8 shadow-lg dark:border-gray-800 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800"
          style={{
            backgroundImage: heroImage ? `linear-gradient(120deg, rgba(0,0,0,0.45), rgba(0,0,0,0.15)), url(${heroImage})` : undefined,
            backgroundSize: heroImage ? 'cover' : undefined,
            backgroundPosition: heroImage ? 'center' : undefined,
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Guide</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">
            {categoryLabel} in {cityDisplayName}
          </h1>
          <p className="mt-4 max-w-3xl text-base text-white/90">{introParagraph}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-white">
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">Top picks {heroDestinations.length}</span>
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">{focusKeyword}</span>
            <Link
              href={`/destinations/${citySlug}`}
              className="rounded-full bg-white/90 px-4 py-1 text-black transition hover:bg-white"
            >
              Plan a trip to {cityDisplayName}
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="space-y-4 rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/70">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Location &amp; Neighborhood</h2>
            <p className="text-base text-gray-600 dark:text-gray-300">{locationParagraph}</p>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-500">Best Time to Visit</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{bestTimeParagraph}</p>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-500">Highlights (food / rooms / vibe)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{highlightsParagraph}</p>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-500">Pricing or Booking Info</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{pricingParagraph}</p>
          </article>
          <article className="space-y-4 rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/70">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Gallery</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {galleryImages.map((src, index) => (
                <div
                  key={`${src}-${index}`}
                  className="relative min-w-[220px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800"
                >
                  <Image
                    src={src!}
                    alt={`${categoryLabel} in ${cityDisplayName}`}
                    width={360}
                    height={220}
                    className="h-44 w-full object-cover"
                    priority={index === 0}
                  />
                </div>
              ))}
              {galleryImages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                  Images coming soon.
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/60">
              <p>Map</p>
              <div className="mt-3 h-40 w-full overflow-hidden rounded-2xl">
                <iframe
                  src={`https://www.google.com/maps?q=${encodeURIComponent(cityDisplayName)}&output=embed`}
                  className="h-full w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map of ${cityDisplayName}`}
                />
              </div>
            </div>
          </article>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">Top picks</h2>
            <p className="text-sm text-gray-500">Curated straight from the database</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {heroDestinations.slice(0, 4).map((destination, index) => (
              <DestinationCard
                key={destination.slug}
                destination={destination}
                index={index}
                showQuickActions={false}
                showBadges={false}
                className="h-full"
              />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">Guide cards</h2>
          <p className="text-sm text-gray-500">Auto-populated recommendations, refreshed from Supabase.</p>
          <div className="grid gap-4 md:grid-cols-3">
            {relatedPlaces.length === 0 && (
              <p className="text-sm text-gray-500">More places will appear once we gather richer coverage.</p>
            )}
            {relatedPlaces.map(place => (
              <DestinationCard
                key={place.slug}
                destination={place}
                showQuickActions={false}
                showBadges={false}
                className="h-72"
              />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-dashed border-gray-300 bg-white/80 p-6 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/60">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Related links</h3>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href={`/destinations/${citySlug}`}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 dark:border-gray-700 dark:text-gray-200"
            >
              Destination hub
            </Link>
            {heroDestinations.slice(0, 3).map(dest => (
              <Link
                key={dest.slug}
                href={`/places/${dest.slug}`}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 dark:border-gray-700 dark:text-gray-200"
              >
                {dest.name}
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">FAQs</h2>
          <div className="space-y-4">
            {faqItems.map(faq => (
              <div key={faq.question} className="rounded-2xl border border-gray-200 bg-white/60 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{faq.question}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
