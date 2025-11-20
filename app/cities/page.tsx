'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Search, MapPin } from 'lucide-react';
import Link from 'next/link';

interface CityCard {
  city: string;
  country: string;
  places: number;
  image?: string;
}

const featuredCities: CityCard[] = [
  {
    city: 'New York',
    country: 'USA',
    places: 127,
    image:
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    city: 'Tokyo',
    country: 'Japan',
    places: 112,
    image:
      'https://images.unsplash.com/photo-1526481280695-3c469c2f88b8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    city: 'Taipei',
    country: 'Taiwan',
    places: 101,
    image:
      'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
  },
  {
    city: 'London',
    country: 'UK',
    places: 79,
    image:
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
  },
];

const countries = [
  'All Countries',
  'Australia',
  'Austria',
  'Belgium',
  'Czech Republic',
  'Denmark',
  'France',
  'Indonesia',
  'Italy',
  'Japan',
  'Mexico',
  'Portugal',
  'Singapore',
  'South Korea',
  'Spain',
  'Switzerland',
  'Taiwan',
  'Thailand',
  'UK',
  'USA',
  'Vietnam',
];

const allCities: CityCard[] = [
  { city: 'New York', country: 'USA', places: 127 },
  { city: 'Los Angeles', country: 'USA', places: 94 },
  { city: 'San Francisco', country: 'USA', places: 76 },
  { city: 'Austin', country: 'USA', places: 65 },
  { city: 'Tokyo', country: 'Japan', places: 112 },
  { city: 'Kyoto', country: 'Japan', places: 74 },
  { city: 'Osaka', country: 'Japan', places: 68 },
  { city: 'Sapporo', country: 'Japan', places: 54 },
  { city: 'Taipei', country: 'Taiwan', places: 101 },
  { city: 'Kaohsiung', country: 'Taiwan', places: 42 },
  { city: 'London', country: 'UK', places: 79 },
  { city: 'Edinburgh', country: 'UK', places: 51 },
  { city: 'Paris', country: 'France', places: 72 },
  { city: 'Lyon', country: 'France', places: 39 },
  { city: 'Sydney', country: 'Australia', places: 63 },
  { city: 'Melbourne', country: 'Australia', places: 58 },
  { city: 'Vienna', country: 'Austria', places: 47 },
  { city: 'Brussels', country: 'Belgium', places: 34 },
  { city: 'Prague', country: 'Czech Republic', places: 52 },
  { city: 'Copenhagen', country: 'Denmark', places: 41 },
  { city: 'Jakarta', country: 'Indonesia', places: 56 },
  { city: 'Bali', country: 'Indonesia', places: 62 },
  { city: 'Rome', country: 'Italy', places: 70 },
  { city: 'Milan', country: 'Italy', places: 59 },
  { city: 'Florence', country: 'Italy', places: 48 },
  { city: 'Mexico City', country: 'Mexico', places: 66 },
  { city: 'Lisbon', country: 'Portugal', places: 53 },
  { city: 'Porto', country: 'Portugal', places: 44 },
  { city: 'Singapore', country: 'Singapore', places: 60 },
  { city: 'Seoul', country: 'South Korea', places: 73 },
  { city: 'Busan', country: 'South Korea', places: 45 },
  { city: 'Barcelona', country: 'Spain', places: 69 },
  { city: 'Madrid', country: 'Spain', places: 64 },
  { city: 'Zurich', country: 'Switzerland', places: 46 },
  { city: 'Geneva', country: 'Switzerland', places: 37 },
  { city: 'Bangkok', country: 'Thailand', places: 71 },
  { city: 'Chiang Mai', country: 'Thailand', places: 49 },
  { city: 'Hanoi', country: 'Vietnam', places: 57 },
  { city: 'Ho Chi Minh City', country: 'Vietnam', places: 61 },
];

function CityCardBlock({ city, country, places, image }: CityCard) {
  return (
    <div className="group relative overflow-hidden rounded-[18px] bg-gradient-to-br from-white/10 via-white/5 to-white/10 border border-white/10 shadow-lg transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl">
      <div
        className="relative h-48 w-full overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(15, 22, 36, 0.7), rgba(15, 22, 36, 0.2)), url(${image ?? 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          <MapPin className="h-4 w-4" />
          <span>{country}</span>
        </div>
      </div>
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{city}</h3>
          <p className="text-sm text-white/70">{country}</p>
        </div>
        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">{places} places</div>
      </div>
    </div>
  );
}

export default function CitiesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All Countries');
  const [displayCount, setDisplayCount] = useState(12);

  const filteredCities = useMemo(() => {
    return allCities.filter(city => {
      const matchesCountry =
        selectedCountry === 'All Countries' || city.country.toLowerCase() === selectedCountry.toLowerCase();
      const matchesSearch = city.city.toLowerCase().includes(searchTerm.trim().toLowerCase());
      return matchesCountry && matchesSearch;
    });
  }, [searchTerm, selectedCountry]);

  const visibleCities = filteredCities.slice(0, displayCount);
  const remaining = filteredCities.length - visibleCities.length;

  return (
    <main className="min-h-screen bg-[#0F1624] text-white">
      <div className="mx-auto w-full max-w-[1440px] px-5 pb-16 pt-12 sm:px-8 lg:px-10">
        <div className="mb-10 flex items-center gap-2 text-sm text-white/60">
          <ArrowLeft className="h-4 w-4" />
          <Link href="/" className="underline-offset-4 hover:underline">
            Back to home
          </Link>
        </div>

        <header className="mb-14 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Cities</p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Explore Cities Around the World</h1>
            <p className="max-w-2xl text-lg text-white/70">
              Discover top destinations curated by locals and travelers—hidden cafes, iconic landmarks, and everything in between.
            </p>
            <div className="flex flex-wrap gap-3">
              {['64 Cities', '21 Countries', 'Updated Weekly'].map(stat => (
                <span
                  key={stat}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur"
                >
                  {stat}
                </span>
              ))}
            </div>
            <div className="flex max-w-xl items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner focus-within:ring-2 focus-within:ring-white/40">
              <Search className="mr-3 h-4 w-4 text-white/60" />
              <input
                type="text"
                placeholder="Search a city…"
                value={searchTerm}
                onChange={event => {
                  setSearchTerm(event.target.value);
                  setDisplayCount(12);
                }}
                className="w-full bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/10 p-6 shadow-xl">
            <div className="flex items-center justify-between text-sm text-white/70">
              <span className="text-white">Trending Cities</span>
              <span>Updated weekly</span>
            </div>
            <div className="mt-4 space-y-3">
              {featuredCities.map(city => (
                <div
                  key={city.city}
                  className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/80"
                >
                  <div>
                    <p className="font-semibold text-white">{city.city}</p>
                    <p className="text-xs text-white/60">{city.country}</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{city.places} places</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="mb-14 space-y-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold">Featured Cities</h2>
            <p className="text-sm text-white/70">Most explored destinations this month</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {featuredCities.map(city => (
              <CityCardBlock key={city.city} {...city} />
            ))}
          </div>
        </section>

        <section className="mb-12 space-y-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold">Explore by Country</h2>
            <p className="text-sm text-white/70">Choose a country to discover its cities</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {countries.map(country => {
              const isActive = country === selectedCountry;
              return (
                <button
                  key={country}
                  onClick={() => {
                    setSelectedCountry(country);
                    setDisplayCount(12);
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/15 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {country}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold">All Cities</h2>
            <p className="text-sm text-white/70">Browse every destination in our collection</p>
          </div>

          {filteredCities.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/70">
              No cities found. Try another search or country.
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleCities.map(city => (
                  <CityCardBlock key={`${city.city}-${city.country}`} {...city} />
                ))}
              </div>

              {remaining > 0 && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setDisplayCount(count => count + 12)}
                    className="rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:border-white/25 hover:bg-white/15"
                  >
                    Show {Math.min(remaining, 12)} more cities
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <footer className="mt-16 border-t border-white/10 pt-8">
          <div className="flex flex-wrap gap-4 text-sm text-white/60">
            {['Newsletter', 'About', 'Contact', 'Sitemap', 'Cookie Settings', 'Privacy Policy'].map(link => (
              <span key={link} className="hover:text-white cursor-pointer transition-colors">
                {link}
              </span>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
