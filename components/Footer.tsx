import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SITE_MAX_WIDTH_CLASS } from '@/lib/layout';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-gray-200 dark:border-gray-800">
      {/* Main Content Area */}
      <div className="w-full px-6 md:px-10 lg:px-12 py-16">
        <div className="max-w-6xl mx-auto">
        </div>
      </div>

      {/* Bottom Section - Legal & Navigation */}
      <div className="border-t border-gray-200 dark:border-gray-800">
        <div className="w-full px-6 md:px-10 lg:px-12 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {/* Copyright */}
            <div>
              © {new Date().getFullYear()} The Manual Company. All Rights Reserved.
        </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-6">
              <Link href="/newsletter" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Newsletter
          </Link>
              <Link href="/about" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                About
          </Link>
              <Link href="/contact" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Contact
          </Link>
        </div>

            {/* Privacy Policy */}
            <div>
              <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Privacy Policy
              </Link>
        </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
