import Link from 'next/link'

// Disable static generation for 404 page
// Note: This is a workaround for Next.js 16 App Router bug with error page generation
export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0
export const runtime = 'nodejs'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--editorial-bg)] px-6">
      <div className="text-center max-w-md">
        <h1
          className="text-6xl font-normal text-[var(--editorial-text-primary)] mb-4"
          style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
        >
          404
        </h1>
        <p className="text-[var(--editorial-text-secondary)] mb-8">
          The page you're looking for doesn't exist.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[var(--editorial-accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--editorial-accent-hover)] transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}

