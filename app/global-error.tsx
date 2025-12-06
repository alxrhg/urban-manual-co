'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

/**
 * Global Error Boundary
 *
 * This component catches errors in the root layout.
 * It must include its own <html> and <body> tags since
 * the root layout may have failed.
 *
 * Note: global-error only catches production errors.
 * In development, the error overlay is shown instead.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body className="antialiased bg-white text-gray-900">
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="mb-8">
              <svg
                className="w-16 h-16 mx-auto text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-light text-black mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-2">
              We apologize for the inconvenience. An unexpected error has occurred.
            </p>
            {error.digest && (
              <p className="text-sm text-gray-400 mb-8">
                Error ID: {error.digest}
              </p>
            )}
            <div className="flex gap-4 justify-center">
              <button
                onClick={reset}
                className="inline-block px-6 py-3 bg-black text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Try again
              </button>
              <a
                href="/"
                className="inline-block px-6 py-3 border border-gray-300 text-gray-900 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
