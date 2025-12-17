/**
 * Architectural Journey View
 * Curated destinations with editorial layout
 */

'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ArchitecturalJourney as ArchitecturalJourneyType } from '@/types/architecture';
import { Building2, ArrowUpRight, User } from 'lucide-react';

interface ArchitecturalJourneyProps {
  journey: ArchitecturalJourneyType;
}

export function ArchitecturalJourney({ journey }: ArchitecturalJourneyProps) {
  if (!journey?.destinations?.length) {
    return (
      <div className="py-12 text-center">
        <Building2 className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No destinations found for this journey</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Destinations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {journey.destinations.map((destination, index) => (
          <Link
            key={destination.id || index}
            href={`/destinations/${destination.slug}`}
            className="group block"
          >
            <div className="space-y-3">
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-900">
                {destination.image ? (
                  <Image
                    src={destination.image}
                    alt={destination.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-gray-300 dark:text-gray-700" />
                  </div>
                )}
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                {/* Arrow Icon */}
                <div className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-gray-900/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="h-3 w-3 text-gray-900 dark:text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="space-y-1">
                <h3 className="font-medium text-gray-900 dark:text-white group-hover:underline underline-offset-2">
                  {destination.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {destination.city}{destination.country ? `, ${destination.country}` : ''}
                </p>
                {destination.architect && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <User className="h-3 w-3" />
                    <span>
                      {typeof destination.architect === 'string'
                        ? destination.architect
                        : destination.architect.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Significance */}
              {destination.architectural_significance && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {destination.architectural_significance}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Journey Insights */}
      {journey.insights && journey.insights.length > 0 && (
        <div className="pt-8 border-t border-gray-100 dark:border-gray-900">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Journey Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {journey.insights.slice(0, 4).map((insight, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {insight.type}
                </span>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {insight.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {insight.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
