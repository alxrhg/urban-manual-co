'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface TripDrawerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const UPCOMING_TRIPS = [
  { name: 'Birthday', date: 'Dec 13, 2025', type: 'Event Trip', icon: '🎂' },
  { name: 'Winter in Asia', date: 'Multiple Cities', type: 'Seasonal Trip', icon: '❄️' },
];

const SUGGESTED_TRIPS = [
  { name: 'Quick Weekend Trip', icon: '🗓️' },
  { name: 'Food Tour', icon: '🍜' },
  { name: 'Shopping Guide', icon: '🛍️' },
];

const FOOTER_LINKS = [
  { label: 'View All Trips', href: '/trips' },
  { label: 'Manage Saved Places', href: '/saved' },
  { label: 'Account Settings', href: '/account' },
];

export function TripDrawerPanel({ isOpen, onClose }: TripDrawerPanelProps) {
  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/45 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 right-0 w-full max-w-[420px] transform transition-transform duration-300 ease-out bg-[#0F1624] text-white shadow-2xl flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '100%' }}
        role="dialog"
        aria-modal="true"
        aria-label="Trip drawer"
      >
        <div className="flex-1 overflow-y-auto px-6 py-7 space-y-7" style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 28, paddingBottom: 28 }}>
          {/* Header */}
          <header className="space-y-4 border-b border-white/10 pb-5">
            <button
              type="button"
              onClick={onClose}
              className="text-left text-sm font-medium text-white/80 hover:text-white flex items-center gap-2"
            >
              <span aria-hidden>←</span>
              <span>Back</span>
            </button>
            <div className="space-y-2">
              <h2 className="text-[22px] font-semibold leading-tight">Your Trips</h2>
              <p className="text-sm text-white/70">Access your upcoming trips or start a new one.</p>
            </div>
          </header>

          {/* Actions */}
          <section>
            <button
              type="button"
              className="w-full bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-4 py-3.5 font-semibold flex items-center gap-3"
            >
              <span className="text-lg" aria-hidden>
                ➕
              </span>
              <span className="text-base">New Trip</span>
            </button>
          </section>

          {/* Upcoming trips */}
          <section className="space-y-4">
            <div className="flex items-center justify-between text-sm text-white/85">
              <span className="text-[16px] font-medium">Upcoming Trips</span>
            </div>
            <div className="space-y-3">
              {UPCOMING_TRIPS.map((trip) => (
                <article
                  key={trip.name}
                  className="bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-3.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-lg leading-none" aria-hidden>
                      {trip.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold">{trip.name}</h3>
                        <span className="text-xs text-white/70">{trip.type}</span>
                      </div>
                      <p className="text-sm text-white/70 mt-1">{trip.date}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Suggested trips */}
          <section className="space-y-4">
            <div className="flex items-center justify-between text-sm text-white/85">
              <span className="text-[16px] font-medium">Suggested Trips</span>
              <span className="text-xs text-white/60">Explore ideas</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUGGESTED_TRIPS.map((suggestion) => (
                <div
                  key={suggestion.name}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors rounded-xl px-3.5 py-3"
                >
                  <span className="text-lg" aria-hidden>
                    {suggestion.icon}
                  </span>
                  <span className="text-sm font-medium">{suggestion.name}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer links */}
        <footer className="px-6 pb-7" style={{ paddingLeft: 24, paddingRight: 24, paddingBottom: 28 }}>
          <div className="flex flex-wrap gap-4 text-sm text-white/75">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-white underline-offset-4 hover:underline">
                {link.label}
              </Link>
            ))}
          </div>
        </footer>
      </aside>
    </>
  );
}

export default TripDrawerPanel;
