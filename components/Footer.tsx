'use client';

import Link from 'next/link';
import { useState } from 'react';
import { openCookieSettings } from '@/components/CookieConsent';
import { ThemeToggle } from '@/components/ThemeToggle';

/**
 * NewsletterInput - Minimal editorial newsletter signup
 */
function NewsletterInput() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <p className="font-body text-sm text-gray-400">
        Thank you for subscribing.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      <div className="flex flex-col gap-3">
        <label htmlFor="newsletter-email" className="font-body text-xs uppercase tracking-widest text-gray-400">
          Newsletter
        </label>
        <div className="flex gap-2">
          <input
            id="newsletter-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 bg-transparent border-b border-gray-700 py-2 text-white placeholder:text-gray-600 focus:border-white focus:outline-none transition-colors font-body text-sm"
            required
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="font-body text-xs uppercase tracking-widest text-white hover:text-gray-400 transition-colors disabled:opacity-50"
          >
            {status === 'loading' ? '...' : 'Subscribe'}
          </button>
        </div>
        {status === 'error' && (
          <p className="text-xs text-red-400">Something went wrong. Please try again.</p>
        )}
      </div>
    </form>
  );
}

export function Footer() {
  return (
    <footer className="bg-black text-white" role="contentinfo">
      {/* Main Footer Content */}
      <div className="px-6 md:px-8 py-16 md:py-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20">
          {/* Left: Large Editorial Tagline */}
          <div>
            <h2 className="font-display text-5xl md:text-6xl lg:text-7xl leading-[0.9] tracking-tight">
              Design,<br />
              Travel,<br />
              Life.
            </h2>
          </div>

          {/* Right: Newsletter & Links */}
          <div className="flex flex-col justify-end items-start gap-10">
            <NewsletterInput />

            {/* Navigation Links */}
            <nav className="flex flex-wrap gap-x-8 gap-y-2 font-body text-xs uppercase tracking-widest text-gray-400">
              <Link href="/about" className="hover:text-white transition-colors">
                About
              </Link>
              <Link href="/explore" className="hover:text-white transition-colors">
                Explore
              </Link>
              <Link href="/trips" className="hover:text-white transition-colors">
                Trips
              </Link>
              <Link href="/cities" className="hover:text-white transition-colors">
                Cities
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <a href="mailto:hello@urbanmanual.co" className="hover:text-white transition-colors">
                Contact
              </a>
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-900 px-6 md:px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-body text-xs text-gray-500">
            &copy; {new Date().getFullYear()} The Manual Company. All Rights Reserved.
          </p>

          <div className="flex items-center gap-6">
            <ThemeToggle />
            <button
              onClick={openCookieSettings}
              className="font-body text-xs text-gray-500 hover:text-white transition-colors"
            >
              Cookie Settings
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
