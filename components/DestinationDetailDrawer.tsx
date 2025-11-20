'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  Check,
  ChevronDown,
  MapPin,
  Plus,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DestinationDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const metaTags = ['Hotel', 'Crown', '⭐ 4.7'];
const actionButtons = [
  { id: 'save', label: 'Save' },
  { id: 'share', label: 'Share' },
  { id: 'mark_visited', label: 'Mark Visited' },
  { id: 'view_full_page', label: 'View Full Page' },
  { id: 'directions', label: 'Directions' },
];

const placeTags = ['establishment', 'lodging', 'point_of_interest'];

const similarPlaces = [
  { name: 'GINZA HOTEL by GRANBELL', location: 'Tokyo' },
  { name: 'Habita', location: 'Mexico City' },
  { name: "Airelles Saint-Tropez, Pan Dei Palais", location: "Provence Alpes Côte D'Azur" },
  { name: 'Hotel Josef', location: 'Prague' },
  { name: 'The Shilla Seoul', location: 'Seoul' },
  { name: 'The Westin Osaka', location: 'Osaka' },
];

export function DestinationDetailDrawer({ isOpen, onClose }: DestinationDetailDrawerProps) {
  const [statusOpen, setStatusOpen] = useState(true);
  const [waitTime, setWaitTime] = useState('');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/45 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.aside
            className="fixed inset-y-0 right-0 z-50 w-full md:w-[460px] lg:w-[520px] bg-[#0F1624] text-white shadow-2xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.26, ease: 'easeOut' }}
          >
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-7">
                <header className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 transition"
                    aria-label="Close"
                  >
                    <X className="size-5" />
                  </button>

                  <h2 className="flex-1 text-center text-[20px] font-semibold">Park Hyatt Chicago</h2>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 transition"
                      aria-label="Save"
                    >
                      <Bookmark className="size-5" />
                    </button>
                    <button
                      type="button"
                      className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 transition"
                      aria-label="Add to trip"
                    >
                      <Plus className="size-5" />
                    </button>
                  </div>
                </header>

                <section className="space-y-7">
                  <div className="relative overflow-hidden rounded-2xl shadow-[0px_6px_24px_rgba(0,0,0,0.3)] aspect-[16/9] bg-white/5">
                    <Image
                      src="https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80"
                      alt="Park Hyatt Chicago"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 520px"
                      priority
                    />
                    <div className="absolute left-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-sm font-medium backdrop-blur">
                      <MapPin className="size-4" />
                      <span>Chicago, USA</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xl font-semibold">Park Hyatt Chicago</div>
                    <div className="flex flex-wrap gap-2">
                      {metaTags.map(tag => (
                        <span
                          key={tag}
                          className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/90"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {actionButtons.map(button => (
                      <Button
                        key={button.id}
                        variant="secondary"
                        size="sm"
                        className="bg-white/10 text-white border border-white/15 hover:bg-white/20"
                      >
                        {button.label}
                      </Button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {placeTags.map(tag => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-white/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-4 text-left"
                      onClick={() => setStatusOpen(open => !open)}
                    >
                      <div>
                        <div className="text-base font-semibold">Report Current Status</div>
                        <p className="text-sm text-white/70">
                          Help others by sharing real-time information about Park Hyatt Chicago.
                        </p>
                      </div>
                      <ChevronDown
                        className={cn('size-5 transition-transform', statusOpen ? 'rotate-180' : '')}
                      />
                    </button>

                    {statusOpen && (
                      <div className="space-y-3 px-4 pb-4">
                        <label className="space-y-2 text-sm text-white/80" htmlFor="wait-time">
                          <span className="block">Current Wait Time (minutes)</span>
                          <Input
                            id="wait-time"
                            type="number"
                            min={0}
                            value={waitTime}
                            onChange={e => setWaitTime(e.target.value)}
                            className="border-white/15 bg-white/10 text-white placeholder:text-white/50"
                          />
                        </label>
                        <Button className="w-full" size="lg">
                          Submit Report
                        </Button>
                      </div>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed text-white/80">
                    Experience luxury at Park Hyatt Chicago, where elegance meets stunning views in the heart of the Magnificent Mile.
                  </p>

                  <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-base font-semibold">Architecture &amp; Design</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2">
                        <span className="text-sm text-white/70">Architect</span>
                        <a
                          href="https://www.google.com/search?q=Sheedy+DeLaRosa+Interiors"
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-white hover:underline"
                        >
                          Sheedy DeLaRosa Interiors
                        </a>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2">
                        <span className="text-sm text-white/70">Style</span>
                        <span className="text-sm font-semibold">Contemporary</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-base font-semibold">You might also like</div>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {similarPlaces.map(place => (
                        <div
                          key={place.name}
                          className="group relative w-60 shrink-0 overflow-hidden rounded-[14px] border border-white/10 bg-white/5 p-4 transition hover:border-white/30"
                          style={{ aspectRatio: '4 / 3' }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/30 opacity-0 transition group-hover:opacity-100" />
                          <div className="relative flex h-full flex-col justify-end">
                            <div className="text-sm text-white/70">{place.location}</div>
                            <div className="text-base font-semibold leading-snug">{place.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="sticky bottom-0 w-full border-t border-white/10 bg-[#0F1624] p-6">
              <div className="flex items-center gap-3">
                <Button className="flex-1" size="lg">
                  View Full Details
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1 bg-white/10 text-white border border-white/15 hover:bg-white/20"
                >
                  <Check className="size-4" />
                  Add to Trip
                </Button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
