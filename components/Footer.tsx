import Link from 'next/link';

export function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-[#E6E6E6]">
      <div className="container mx-auto max-w-[1320px] flex flex-col gap-12">
        {/* Brand / Tagline */}
        <div className="flex flex-col gap-1">
          <div className="text-[13px] text-[#111111] leading-[1.45] font-normal">The Urban Manual</div>
          <div className="text-[13px] text-[#999] leading-[1.45]">A curated index of places worth your time.</div>
        </div>

        {/* Explore - Vertical Stack */}
        <div className="flex flex-col gap-2">
          <Link href="/cities" className="text-[13px] text-[#999] leading-[1.45] hover:opacity-60 transition-opacity duration-200">
            Cities
          </Link>
          <Link href="/collections" className="text-[13px] text-[#999] leading-[1.45] hover:opacity-60 transition-opacity duration-200">
            Collections
          </Link>
          <Link href="/recent" className="text-[13px] text-[#999] leading-[1.45] hover:opacity-60 transition-opacity duration-200">
            Recent
          </Link>
          <Link href="/saved" className="text-[13px] text-[#999] leading-[1.45] hover:opacity-60 transition-opacity duration-200">
            Saved
          </Link>
        </div>

        {/* Social (Instagram only) - Vertical Stack */}
        <div className="flex flex-col gap-2">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-[#999] leading-[1.45] hover:opacity-60 transition-opacity duration-200"
          >
            Instagram
          </a>
        </div>

        {/* Legal */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6 border-t border-[#E6E6E6] mt-6">
          <div className="text-[13px] text-[#aaa] leading-[1.45]">© {new Date().getFullYear()} The Urban Manual. All rights reserved.</div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <Link href="/privacy" className="text-[13px] text-[#aaa] leading-[1.45] hover:opacity-60 transition-opacity duration-200">
              Privacy
            </Link>
            <Link href="/terms" className="text-[13px] text-[#aaa] leading-[1.45] hover:opacity-60 transition-opacity duration-200">
              Terms
            </Link>
            <Link href="/submit" className="text-[13px] text-[#aaa] leading-[1.45] hover:opacity-60 transition-opacity duration-200">
              Submit a Place
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
