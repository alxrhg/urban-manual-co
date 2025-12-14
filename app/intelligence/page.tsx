/**
 * Travel Intelligence Page
 * This is the product, not a feature
 */

'use client';

import { useState } from 'react';
import { IntelligenceDashboard } from '@/components/IntelligenceDashboard';
import { toast } from '@/ui/sonner';

export default function IntelligencePage() {
  const [intelligence, setIntelligence] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState({
    destination: '',
    dates: { start: '', end: '' },
    preferences: {
      architectural_interests: [] as string[],
      travel_style: 'balanced' as const,
      budget_range: 'moderate' as const,
      group_size: 1,
    },
  });

  const handleGenerate = async () => {
    if (!input.destination || !input.dates.start || !input.dates.end) {
      toast.error('Please fill in all required fields');
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

  if (intelligence) {
    return <IntelligenceDashboard intelligence={intelligence} />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-4 text-center">Travel Intelligence</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 text-center">
          Plan your architectural journey with intelligent recommendations
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Destination (City)</label>
            <input
              type="text"
              value={input.destination}
              onChange={(e) => setInput({ ...input, destination: e.target.value })}
              placeholder="e.g., Tokyo, New York, São Paulo"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <input
                type="date"
                value={input.dates.start}
                onChange={(e) =>
                  setInput({
                    ...input,
                    dates: { ...input.dates, start: e.target.value },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <input
                type="date"
                value={input.dates.end}
                onChange={(e) =>
                  setInput({
                    ...input,
                    dates: { ...input.dates, end: e.target.value },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Travel Style</label>
            <select
              value={input.preferences.travel_style}
              onChange={(e) =>
                setInput({
                  ...input,
                  preferences: {
                    ...input.preferences,
                    travel_style: e.target.value as any,
                  },
                })
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
            >
              <option value="relaxed">Relaxed</option>
              <option value="balanced">Balanced</option>
              <option value="intensive">Intensive</option>
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating Intelligence...' : 'Generate Intelligence'}
          </button>
        </div>
      </div>
    </div>
  );
}

