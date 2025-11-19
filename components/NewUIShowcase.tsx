"use client";

import Link from "next/link";
import { LayoutGrid, Map, Sparkles, Compass } from "lucide-react";
import React from "react";

const highlights = [
  {
    title: "Streamlined hero",
    description:
      "Search, saved sessions, and intent chips now sit together so you can resume or start fresh instantly.",
    icon: Sparkles,
  },
  {
    title: "Map-first clarity",
    description:
      "The grid pairs with a responsive map layout, making it easy to scan neighborhoods before opening details.",
    icon: Map,
  },
  {
    title: "Editorial grid",
    description:
      "Square cover imagery, uppercase labeling, and measured spacing keep the guide feeling consistent and calm.",
    icon: LayoutGrid,
  },
];

export function NewUIShowcase() {
  return (
    <section className="bg-white/70 dark:bg-black/30 border-y border-neutral-200 dark:border-neutral-800 px-6 md:px-10 py-12 md:py-14">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6">
          <div className="space-y-3 md:space-y-4">
            <p className="text-xs uppercase tracking-[2px] text-gray-500 dark:text-gray-400 font-medium">
              Introducing the new interface
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold leading-tight">
              Faster to the good stuff, calmer to explore.
            </h2>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
              We simplified the hero, tightened filters, and aligned the map + grid layout so the guide feels even more
              intentional.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="#search-section"
              className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-black/10 dark:border-white/20 text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Jump to search
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Browse cities
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-3">
          {highlights.map(highlight => (
            <article
              key={highlight.title}
              className="h-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-950/50 p-5 md:p-6 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3 text-sm font-semibold">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white">
                  <highlight.icon className="h-4 w-4" />
                </span>
                <span className="uppercase tracking-[1.5px] text-xs text-gray-600 dark:text-gray-300">
                  {highlight.title}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {highlight.description}
              </p>
            </article>
          ))}
        </div>

        <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400 font-medium">
              What to expect
            </p>
            <p className="text-sm md:text-base text-gray-700 dark:text-gray-200 leading-relaxed">
              Cleaner typography, consistent spacing, and calmer surfaces keep focus on the destinations—not the UI chrome.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <Compass className="h-4 w-4" aria-hidden />
            <span>Optimized for both grid-first and map-first browsing</span>
          </div>
        </div>
      </div>
    </section>
  );
}
