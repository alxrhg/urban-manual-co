'use client'

import { useEffect } from 'react'
import Link from 'next/link'

// Disable static generation for error page
export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 px-6">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-light text-black dark:text-white mb-4">500</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Something went wrong.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-block px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-block px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}

