/**
 * Travel Intelligence Page
 * Premium architectural journey planning experience
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, Sparkles, ArrowRight, Building2, Compass } from 'lucide-react';
import { IntelligenceDashboard } from '@/components/IntelligenceDashboard';
import { toast } from '@/ui/sonner';

const TRAVEL_STYLES = [
  { id: 'relaxed', label: 'Relaxed', description: 'Fewer stops, more time at each' },
  { id: 'balanced', label: 'Balanced', description: 'A curated mix of experiences' },
  { id: 'intensive', label: 'Intensive', description: 'Maximum architectural discovery' },
] as const;

const LOADING_MESSAGES = [
  'Analyzing architectural landscape...',
  'Mapping design connections...',
  'Optimizing your journey...',
  'Curating the perfect itinerary...',
  'Discovering hidden architectural gems...',
];

export default function IntelligencePage() {
  const [intelligence, setIntelligence] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [input, setInput] = useState({
    destination: '',
    dates: { start: '', end: '' },
    preferences: {
      architectural_interests: [] as string[],
      travel_style: 'balanced' as 'relaxed' | 'balanced' | 'intensive',
      budget_range: 'moderate' as const,
      group_size: 1,
    },
  });

  // Cycle through loading messages
  useEffect(() => {
    if (!loading) return;
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[index]);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async () => {
    if (!input.destination) {
      toast.error('Please enter a destination');
      return;
    }
    if (!input.dates.start || !input.dates.end) {
      toast.error('Please select your travel dates');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/intelligence/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: input.destination,
          dates: {
            start: input.dates.start,
            end: input.dates.end,
          },
          preferences: input.preferences,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate intelligence');
      }

      const data = await response.json();
      setIntelligence(data);
    } catch (error) {
      console.error('Error generating intelligence:', error);
      toast.error('Failed to generate intelligence. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setIntelligence(null);
    setInput({
      destination: '',
      dates: { start: '', end: '' },
      preferences: {
        architectural_interests: [],
        travel_style: 'balanced',
        budget_range: 'moderate',
        group_size: 1,
      },
    });
  };

  if (intelligence) {
    return <IntelligenceDashboard intelligence={intelligence} onReset={handleReset} />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950" />
        <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-16 md:pt-32 md:pb-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400 mb-6">
              <Sparkles className="h-3 w-3" />
              <span>AI-Powered Travel Intelligence</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Discover architecture
              <br />
              <span className="text-gray-400 dark:text-gray-500">like never before</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Our intelligence engine analyzes thousands of architectural destinations to craft
              your perfect journey—optimized for design discovery.
            </p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="max-w-2xl mx-auto px-6 pb-20">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-20"
            >
              <div className="relative inline-flex items-center justify-center w-20 h-20 mb-8">
                <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-gray-800" />
                <div className="absolute inset-0 rounded-full border-2 border-t-gray-900 dark:border-t-white animate-spin" />
                <Compass className="h-8 w-8 text-gray-900 dark:text-white" />
              </div>
              <p className="text-lg text-gray-900 dark:text-white font-medium mb-2">
                Generating your intelligence
              </p>
              <p className="text-gray-600 dark:text-gray-400 h-6">
                {loadingMessage}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Destination Input */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                  <MapPin className="h-4 w-4" />
                  Where are you going?
                </label>
                <input
                  type="text"
                  value={input.destination}
                  onChange={(e) => setInput({ ...input, destination: e.target.value })}
                  placeholder="Tokyo, New York, São Paulo..."
                  className="w-full px-4 py-4 text-lg border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white placeholder:text-gray-400"
                />
              </div>

              {/* Date Inputs */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                  <Calendar className="h-4 w-4" />
                  When are you traveling?
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">From</span>
                    <input
                      type="date"
                      value={input.dates.start}
                      onChange={(e) =>
                        setInput({
                          ...input,
                          dates: { ...input.dates, start: e.target.value },
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">To</span>
                    <input
                      type="date"
                      value={input.dates.end}
                      onChange={(e) =>
                        setInput({
                          ...input,
                          dates: { ...input.dates, end: e.target.value },
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                    />
                  </div>
                </div>
              </div>

              {/* Travel Style */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                  <Building2 className="h-4 w-4" />
                  How do you like to explore?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {TRAVEL_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() =>
                        setInput({
                          ...input,
                          preferences: { ...input.preferences, travel_style: style.id },
                        })
                      }
                      className={`p-4 border rounded-xl text-left transition-all ${
                        input.preferences.travel_style === style.id
                          ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-900'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <span className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {style.label}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {style.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!input.destination || !input.dates.start || !input.dates.end}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-medium rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Generate Intelligence</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* Features Callout */}
              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-gray-100 dark:border-gray-900">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-gray-900 dark:text-white">897+</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Destinations</span>
                </div>
                <div className="text-center">
                  <span className="block text-2xl font-bold text-gray-900 dark:text-white">AI</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Optimized Routes</span>
                </div>
                <div className="text-center">
                  <span className="block text-2xl font-bold text-gray-900 dark:text-white">Real-time</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Intelligence</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
