'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, RefreshCw, Home, MessageCircle } from 'lucide-react'

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
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  const handleRetry = async () => {
    setIsRetrying(true)
    // Small delay to show the loading state
    await new Promise(resolve => setTimeout(resolve, 500))
    reset()
    setIsRetrying(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 px-6 py-12">
      <div className="text-center max-w-lg">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
            <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400" />
          </div>
        </div>

        {/* Main message */}
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
          Something went wrong
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          We hit an unexpected error. This has been logged and we're looking into it.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
          Try refreshing the page or come back in a few minutes.
        </p>

        {/* Primary actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Try again'}
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go home
          </Link>
        </div>

        {/* Help text */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            If this keeps happening, let us know
          </p>
          <a
            href="https://github.com/alxrhg/urban-manual-co/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Report an issue
          </a>
        </div>

        {/* Error digest for debugging (only in dev or if digest exists) */}
        {error.digest && (
          <p className="mt-6 text-xs text-gray-400 dark:text-gray-600 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}

