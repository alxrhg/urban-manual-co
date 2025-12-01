/**
 * Intelligence Dashboard
 * Main interface for travel intelligence - this is the product
 */

'use client';

import { useState } from 'react';
import { Calendar, MapPin, Users, Sparkles } from 'lucide-react';
import { ArchitecturalJourney } from './ArchitecturalJourney';
import { IntelligenceItinerary } from './IntelligenceItinerary';
import { DesignInsights } from './DesignInsights';
import { IntelligenceAlerts } from './IntelligenceAlerts';
import type { TravelIntelligenceOutput, TravelIntelligenceInput } from '@/services/intelligence/engine';

interface IntelligenceDashboardProps {
  intelligence?: TravelIntelligenceOutput;
  onGenerate?: (input: Partial<TravelIntelligenceInput>) => void;
}

export function IntelligenceDashboard({ intelligence, onGenerate }: IntelligenceDashboardProps) {
  const [activeTab, setActiveTab] = useState<'journey' | 'itinerary' | 'insights'>('journey');

  if (!intelligence) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
          <Sparkles className="w-16 h-16 mx-auto mb-6 text-gray-400" />
          <h1 className="text-4xl font-bold mb-4">Travel Intelligence</h1>
          <p className="text-xl text-gray-600 mb-8">
            Plan your architectural journey with intelligent recommendations
          </p>
          {onGenerate && (
            <button
              onClick={() => onGenerate({})}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
            >
              Generate Intelligence
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold mb-2">Travel Intelligence</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {intelligence.design_narrative}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('journey')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'journey'
                  ? 'border-black dark:border-white text-black dark:text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Architectural Journey
            </button>
            <button
              onClick={() => setActiveTab('itinerary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'itinerary'
                  ? 'border-black dark:border-white text-black dark:text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Itinerary
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'insights'
                  ? 'border-black dark:border-white text-black dark:text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Design Insights
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'journey' && (
          <ArchitecturalJourney journey={intelligence.architectural_journey} />
        )}
        {activeTab === 'itinerary' && (
          <IntelligenceItinerary itinerary={intelligence.optimized_itinerary} />
        )}
        {activeTab === 'insights' && (
          <>
            <DesignInsights insights={intelligence.architectural_insights} />
            {intelligence.real_time_adjustments && intelligence.real_time_adjustments.length > 0 && (
              <div className="mt-8">
                <IntelligenceAlerts adjustments={intelligence.real_time_adjustments} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

