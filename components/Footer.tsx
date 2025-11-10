import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-neutral-800 dark:border-neutral-800 pt-12 pb-16 text-sm text-neutral-500 dark:text-neutral-500">
      <div className="container mx-auto px-4 flex flex-col gap-12">
        {/* Brand / Tagline */}
        <div className="flex flex-col gap-1">
          <div className="text-neutral-300 dark:text-neutral-300 font-medium">The Urban Manual</div>
          <div className="text-neutral-500 dark:text-neutral-500">A curated index of places worth your time.</div>
        </div>

        {/* Explore */}
        <div className="flex flex-wrap gap-4 text-neutral-400 dark:text-neutral-400">
          <Link href="/cities" className="hover:text-neutral-200 dark:hover:text-neutral-200 transition-colors">
            Cities
          </Link>
          <Link href="/collections" className="hover:text-neutral-200 dark:hover:text-neutral-200 transition-colors">
            Collections
          </Link>
          <Link href="/recent" className="hover:text-neutral-200 dark:hover:text-neutral-200 transition-colors">
            Recent
          </Link>
          <Link href="/saved" className="hover:text-neutral-200 dark:hover:text-neutral-200 transition-colors">
            Saved
          </Link>
        </div>

        {/* Social (Instagram only) */}
        <div className="flex flex-wrap gap-4 text-neutral-400 dark:text-neutral-400">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-200 dark:hover:text-neutral-200 transition-colors"
          >
            Instagram
          </a>
        </div>

        {/* Legal */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-neutral-800 dark:border-neutral-800">
          <div>© {new Date().getFullYear()} The Urban Manual. All rights reserved.</div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-neutral-200 dark:hover:text-neutral-200 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-neutral-200 dark:hover:text-neutral-200 transition-colors">
              Terms
            </Link>
            <Link href="/submit" className="hover:text-neutral-200 dark:hover:text-neutral-200 transition-colors">
              Submit a Place
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
