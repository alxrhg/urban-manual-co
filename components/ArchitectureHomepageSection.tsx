/**
 * Architecture Homepage Section
 * Architecture-first sections for homepage
 */

'use client';

import { ArchitectSpotlight } from './ArchitectSpotlight';
import { DesignMovementSection } from './DesignMovementSection';
import { Sparkles, Building2 } from 'lucide-react';
import Link from 'next/link';

export function ArchitectureHomepageSection() {
  return (
    <>
      {/* Intelligence CTA */}
      <div className="bg-black dark:bg-white text-white dark:text-black border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6" />
              <span className="text-sm font-medium uppercase tracking-wide">Travel Intelligence</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Plan Your Architectural Journey
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Discover destinations through the lens of design. Intelligence-powered trip planning
              that understands architecture, movements, and design narratives.
            </p>
            <Link
              href="/intelligence"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-black text-black dark:text-white rounded-lg font-medium hover:opacity-80 transition"
            >
              Generate Intelligence
              <Building2 className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Architect Spotlight */}
      <ArchitectSpotlight />

      {/* Design Movements */}
      <DesignMovementSection />
    </>
  );
}

