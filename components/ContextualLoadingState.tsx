'use client';

import { Sparkles } from 'lucide-react';

interface ContextualLoadingStateProps {
  intent?: {
    primaryIntent?: string;
    city?: string | null;
    category?: string | null;
    modifiers?: string[];
    temporalContext?: {
      timeframe?: string;
    } | null;
  };
  query: string;
}

export function ContextualLoadingState({ intent, query }: ContextualLoadingStateProps) {
  // Generate contextual loading message based on intent
  const getMessage = (): string => {
    const category = intent?.category || '';
    const city = intent?.city || '';
    const modifiers = intent?.modifiers || [];
    const timeframe = intent?.temporalContext?.timeframe;
    const primaryIntent = intent?.primaryIntent;

    // Time-specific messages
    if (timeframe === 'now') {
      return `Finding places open right now${city ? ` in ${city}` : ''}...`;
    }

    // Intent-specific messages
    if (primaryIntent === 'compare') {
      return `Comparing options for you...`;
    }

    if (primaryIntent === 'plan') {
      return `Planning your perfect itinerary...`;
    }

    // Category-specific contextual messages
    if (category) {
      const categoryMessages: Record<string, string[]> = {
        restaurant: [
          'French or Japanese? Date night or casual?',
          'Michelin-starred or hidden gem?',
          'Fine dining or cozy bistro?',
        ],
        cafe: [
          'Cozy hideaway or trendy spot?',
          'Artisan coffee or people-watching?',
          'Quiet corner or buzzing atmosphere?',
        ],
        bar: [
          'Cocktails or craft beer? Upbeat or intimate?',
          'Speakeasy vibes or rooftop views?',
          'Wine bar or dive bar?',
        ],
        hotel: [
          'Luxury or boutique? Business or leisure?',
          'Historic charm or modern design?',
          'City center or quiet retreat?',
        ],
        museum: [
          'Classic or contemporary? Guided or self-paced?',
          'Modern art or ancient history?',
          'Interactive or contemplative?',
        ],
        gallery: [
          'Emerging artists or established masters?',
          'Contemporary or classical?',
          'Large institution or intimate space?',
        ],
        park: [
          'Active adventure or peaceful retreat?',
          'Urban oasis or nature escape?',
          'Family-friendly or romantic stroll?',
        ],
        shop: [
          'Designer or vintage? Mall or local markets?',
          'Boutique finds or flagship stores?',
          'Window shopping or serious hunting?',
        ],
      };

      const messages = categoryMessages[category.toLowerCase()];
      if (messages) {
        // Pick a random message for variety
        return messages[Math.floor(Math.random() * messages.length)];
      }
    }

    // Modifier-specific messages
    if (modifiers.length > 0) {
      const modifier = modifiers[0].toLowerCase();
      if (modifier.includes('romantic')) {
        return 'Finding intimate spots perfect for two...';
      }
      if (modifier.includes('cozy') || modifier.includes('comfortable')) {
        return 'Seeking warm, welcoming spaces...';
      }
      if (modifier.includes('luxury') || modifier.includes('upscale')) {
        return 'Curating premium experiences...';
      }
      if (modifier.includes('budget') || modifier.includes('cheap')) {
        return 'Finding great value options...';
      }
      if (modifier.includes('hidden') || modifier.includes('secret')) {
        return 'Uncovering hidden gems...';
      }
      if (modifier.includes('trendy') || modifier.includes('popular')) {
        return "Spotting what's hot right now...";
      }
    }

    // City-specific messages
    if (city) {
      return `Exploring ${city}'s best spots...`;
    }

    // Generic fallback with personality
    const fallbackMessages = [
      'Analyzing thousands of places...',
      'Consulting local experts...',
      'Finding perfect matches for you...',
      'Curating personalized recommendations...',
      'Searching our carefully curated collection...',
    ];

    return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="max-w-md mx-auto text-center space-y-4">
        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="relative">
            <Sparkles className="h-10 w-10 text-gray-400 dark:text-gray-600 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-12 border-2 border-gray-300 dark:border-dark-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>

        {/* Contextual message */}
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900 dark:text-white">{getMessage()}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">This will just take a moment</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          <div className="h-2 w-2 bg-gray-400 dark:bg-dark-blue-700 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="h-2 w-2 bg-gray-400 dark:bg-dark-blue-700 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="h-2 w-2 bg-gray-400 dark:bg-dark-blue-700 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
