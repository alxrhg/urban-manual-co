'use client';

import Link from 'next/link';
import { openCookieSettings } from '@/components/CookieConsent';

export function Footer() {
  return (
    <footer id="footer" className="container-lovably py-12 md:py-16 relative z-[100]">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-x-[22px] gap-y-4 items-center">
        {/* Copyright */}
        <div className="col-span-1 md:col-span-6">
          <Link
            href="/#top"
            className="text-lovably-base link-lovably"
          >
            © {new Date().getFullYear()} Lovably Inc. All Rights Reserved.
          </Link>
        </div>

        {/* Links - Grid layout like Lovably */}
        <div className="col-span-1 md:col-span-6 flex flex-wrap items-center gap-6 text-lovably-base">
          <Link href="/newsletter" className="link-lovably">
            Newsletter
          </Link>
          <Link href="/notes" className="link-lovably">
            Notes
          </Link>
          <Link href="/about" className="link-lovably">
            Information
          </Link>
          <Link href="/contact" className="link-lovably">
            Contact
          </Link>
          <Link href="/privacy" className="link-lovably">
            Privacy Policy
          </Link>
          <button
            onClick={openCookieSettings}
            className="link-lovably cursor-pointer"
          >
            Cookie Settings
          </button>
        </div>
      </div>
    </footer>
  );
}
