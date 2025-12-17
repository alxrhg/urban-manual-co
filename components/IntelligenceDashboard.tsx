/**
 * Intelligence Dashboard
 * Editorial-style travel intelligence results
 */

'use client';

import { useState } from 'react';
import { ArrowLeft, Calendar, MapPin, Clock, ChevronDown, Share2, Download } from 'lucide-react';
import { ArchitecturalJourney } from './ArchitecturalJourney';
import { IntelligenceItinerary } from './IntelligenceItinerary';
import { DesignInsights } from './DesignInsights';
import { IntelligenceAlerts } from './IntelligenceAlerts';
import type { TravelIntelligenceOutput } from '@/services/intelligence/engine';

interface IntelligenceDashboardProps {
  intelligence: TravelIntelligenceOutput;
  onReset?: () => void;
}

type ViewMode = 'overview' | 'journey' | 'itinerary' | 'insights';

export function IntelligenceDashboard({ intelligence, onReset }: IntelligenceDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [expandedSection, setExpandedSection] = useState<string | null>('journey');

  const journey = intelligence.architectural_journey;
  const itinerary = intelligence.optimized_itinerary;
  const totalDays = itinerary?.length || 0;
  const totalDestinations = journey?.destinations?.length || 0;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onReset && (
                <button
                  onClick={onReset}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>New Search</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors">
                <Share2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors">
                <Download className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              {journey?.title || 'Your Architectural Journey'}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
              {intelligence.design_narrative || journey?.narrative}
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{totalDays} {totalDays === 1 ? 'day' : 'days'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{totalDestinations} destinations</span>
              </div>
              {journey?.type && (
                <div className="px-3 py-1 bg-gray-100 dark:bg-gray-900 rounded-full text-xs font-medium capitalize">
                  {journey.focus || journey.type} journey
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Alerts Section */}
      {intelligence.real_time_adjustments && intelligence.real_time_adjustments.length > 0 && (
        <section className="border-b border-gray-100 dark:border-gray-900">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <IntelligenceAlerts adjustments={intelligence.real_time_adjustments} />
          </div>
        </section>
      )}

      {/* Main Content - Accordion Style */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="space-y-4">
          {/* Architectural Journey Section */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection('journey')}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
            >
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Architectural Journey
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {totalDestinations} curated destinations across the city
                </p>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-gray-400 transition-transform ${
                  expandedSection === 'journey' ? 'rotate-180' : ''
                }`}
              />
            </button>
            {expandedSection === 'journey' && (
              <div className="px-6 pb-6">
                <ArchitecturalJourney journey={journey} />
              </div>
            )}
          </div>

          {/* Itinerary Section */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection('itinerary')}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
            >
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Day-by-Day Itinerary
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Optimized schedule for {totalDays} {totalDays === 1 ? 'day' : 'days'} of exploration
                </p>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-gray-400 transition-transform ${
                  expandedSection === 'itinerary' ? 'rotate-180' : ''
                }`}
              />
            </button>
            {expandedSection === 'itinerary' && (
              <div className="px-6 pb-6">
                <IntelligenceItinerary itinerary={itinerary} />
              </div>
            )}
          </div>

          {/* Design Insights Section */}
          {intelligence.architectural_insights && intelligence.architectural_insights.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleSection('insights')}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
              >
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Design Insights
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {intelligence.architectural_insights.length} architectural connections discovered
                  </p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 transition-transform ${
                    expandedSection === 'insights' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedSection === 'insights' && (
                <div className="px-6 pb-6">
                  <DesignInsights insights={intelligence.architectural_insights} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recommendations Section */}
        {intelligence.recommendations && intelligence.recommendations.length > 0 && (
          <div className="mt-12 pt-12 border-t border-gray-100 dark:border-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              You might also like
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {intelligence.recommendations.slice(0, 3).map((rec, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                >
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {rec.type || 'Recommendation'}
                  </span>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mt-2">
                    {rec.title || rec.name}
                  </h4>
                  {rec.reason && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {rec.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Intelligence generated by Urban Manual. Routes and times are estimates and may vary.
          </p>
        </div>
      </footer>
    </div>
  );
}
