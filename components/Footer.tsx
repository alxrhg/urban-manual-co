import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-12 border-t border-[#E6E6E6] dark:border-[#E6E6E6] py-12 px-6 text-[13px] text-[#999] dark:text-[#999]">
      <div className="container mx-auto flex flex-col gap-12">
        {/* Brand / Tagline */}
        <div className="flex flex-col gap-1">
          <div className="text-[#aaa] dark:text-[#aaa] font-medium">The Urban Manual</div>
          <div className="text-[#999] dark:text-[#999]">A curated index of places worth your time.</div>
        </div>

        {/* Explore */}
        <div className="flex flex-col gap-2 text-[#aaa] dark:text-[#aaa]">
          <Link href="/cities" className="hover:opacity-60 transition-opacity">
            Cities
          </Link>
          <Link href="/collections" className="hover:opacity-60 transition-opacity">
            Collections
          </Link>
          <Link href="/recent" className="hover:opacity-60 transition-opacity">
            Recent
          </Link>
          <Link href="/saved" className="hover:opacity-60 transition-opacity">
            Saved
          </Link>
        </div>

        {/* Social (Instagram only) */}
        <div className="flex flex-col gap-2 text-[#aaa] dark:text-[#aaa]">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-60 transition-opacity"
          >
            Instagram
          </a>
        </div>

        {/* Legal */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-[#E6E6E6] dark:border-[#E6E6E6]">
          <div>© {new Date().getFullYear()} The Urban Manual. All rights reserved.</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/privacy" className="hover:opacity-60 transition-opacity">
              Privacy
            </Link>
            <Link href="/terms" className="hover:opacity-60 transition-opacity">
              Terms
            </Link>
            <Link href="/submit" className="hover:opacity-60 transition-opacity">
              Submit a Place
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
