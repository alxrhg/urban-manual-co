/**
 * Architectural Journey View
 * Visual narrative of the design story
 */

'use client';

import type { ArchitecturalJourney as ArchitecturalJourneyType } from '@/types/architecture';
import { Building2, MapPin, Calendar } from 'lucide-react';

interface ArchitecturalJourneyProps {
  journey: ArchitecturalJourneyType;
}

export function ArchitecturalJourney({ journey }: ArchitecturalJourneyProps) {
  return (
    <div className="space-y-8">
      {/* Journey Header */}
      <div>
        <h2 className="text-2xl font-bold mb-4">{journey.title}</h2>
        <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
          {journey.narrative}
        </p>
      </div>

      {/* Journey Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Destinations</span>
          </div>
          <div className="text-2xl font-bold">{journey.destinations.length}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Type</span>
          </div>
          <div className="text-2xl font-bold capitalize">{journey.type}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Focus</span>
          </div>
          <div className="text-2xl font-bold capitalize">{journey.focus}</div>
        </div>
      </div>

      {/* Destinations Grid */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Destinations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {journey.destinations.map((destination) => {
            // Extract image URL from ArchitectureDestination
            const displayImage = 
              destination.image || 
              destination.hero_image || 
              destination.architectural_photos?.[0]?.url || 
              null;
            return (
              <div
                key={destination.id}
                className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition"
              >
                {displayImage && (
                  <img
                    src={displayImage}
                    alt={destination.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h4 className="font-semibold mb-2">{destination.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {destination.city}, {destination.country}
                  </p>
                  {destination.architect && (
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      by {destination.architect.name}
                    </p>
                  )}
                  {destination.architectural_significance && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                      {destination.architectural_significance}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights */}
      {journey.insights && journey.insights.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Architectural Insights</h3>
          <div className="space-y-4">
            {journey.insights.map((insight, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"
              >
                <h4 className="font-semibold mb-2">{insight.title}</h4>
                <p className="text-gray-700 dark:text-gray-300">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
