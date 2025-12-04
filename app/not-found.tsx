import Link from 'next/link'
import { MapPin, Search, Compass, ArrowRight } from 'lucide-react'

// Disable static generation for 404 page
// Note: This is a workaround for Next.js 16 App Router bug with error page generation
export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0
export const runtime = 'nodejs'

const popularCities = [
  { name: 'Tokyo', slug: 'tokyo' },
  { name: 'Paris', slug: 'paris' },
  { name: 'New York', slug: 'new-york' },
  { name: 'London', slug: 'london' },
]

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 px-6 py-12">
      <div className="text-center max-w-lg">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
            <Compass className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
        </div>

        {/* Main message */}
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
          Page not found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          This page may have moved or doesn't exist. Let's get you back on track.
        </p>

        {/* Primary actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <MapPin className="w-4 h-4" />
            Explore destinations
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Search className="w-4 h-4" />
            Search
          </Link>
        </div>

        {/* Popular cities */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-8">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Popular destinations
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {popularCities.map((city) => (
              <Link
                key={city.slug}
                href={`/city/${city.slug}`}
                className="group inline-flex items-center gap-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300 transition-colors"
              >
                {city.name}
                <ArrowRight className="w-3 h-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

