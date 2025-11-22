'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer id="footer" className="container-lovably py-12 md:py-16 relative z-[100]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-0">
        {/* Copyright */}
        <Link
          href="/#top"
          className="text-lovably-base link-lovably"
        >
          © {new Date().getFullYear()} The Manual Company. All Rights Reserved.
        </Link>

        {/* Links - Minimal like Lovably */}
        <div className="flex items-center gap-6 text-lovably-base">
          <Link href="/newsletter" className="link-lovably">
            Newsletter
          </Link>
          <Link href="/about" className="link-lovably">
            About
          </Link>
          <Link href="/contact" className="link-lovably">
            Contact
          </Link>
          <Link href="/privacy" className="link-lovably">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
