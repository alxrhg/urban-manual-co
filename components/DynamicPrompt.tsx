'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface DynamicPromptProps {
  city: string;
  category?: string;
  className?: string;
}

interface PromptData {
  prompt: string;
  seasonality?: {
    text: string;
    event: string;
  } | null;
}

/**
 * DynamicPrompt component
 * Fetches and displays discovery prompts for a city
 * Caches results to avoid repeated API calls
 */
export default function DynamicPrompt({ city, category, className = '' }: DynamicPromptProps) {
  const [promptData, setPromptData] = useState<PromptData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!city) return;

    // Check cache first
    const cacheKey = `discovery-prompt-${city}-${category || 'all'}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Check if cache is still valid (1 hour)
        if (Date.now() - parsed.timestamp < 3600000) {
          setPromptData(parsed.data);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error parsing cached prompt:', error);
      }
    }

    // Fetch from API
    const fetchPrompt = async () => {
      try {
        const url = `/api/discovery-prompt?city=${encodeURIComponent(city)}${category ? `&category=${encodeURIComponent(category)}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch discovery prompt');
        }

        const data = await response.json();
        setPromptData({
          prompt: data.prompt,
          seasonality: data.seasonality,
        });

        // Cache the result
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: {
            prompt: data.prompt,
            seasonality: data.seasonality,
          },
          timestamp: Date.now(),
        }));
      } catch (error) {
        console.error('Error fetching discovery prompt:', error);
        // Set a fallback prompt
        setPromptData({
          prompt: `Explore ${city}${category ? `'s best ${category}` : ''} with our curated guide.`,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPrompt();
  }, [city, category]);

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (!promptData || !promptData.prompt) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 ${className}`}>
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed italic">
          {promptData.prompt}
        </p>
      </div>
      {promptData.seasonality && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 ml-6">
          {promptData.seasonality.text}
        </p>
      )}
      <div className="mt-2 ml-6">
        <span className="text-xs text-gray-500 dark:text-gray-500">AI-assisted</span>
      </div>
    </div>
  );
}

