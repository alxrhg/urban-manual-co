'use client';

import { useMemo } from 'react';
import { Destination } from '@/types/destination';
import { cn } from '@/lib/utils';

interface PerfectForProps {
  destination: Destination;
  reviews?: Array<{ text: string; rating: number }>;
  compact?: boolean;
}

interface Occasion {
  key: string;
  emoji: string;
  label: string;
  description: string;
  keywords: string[];
  categoryBoost?: string[];
}

const OCCASIONS: Occasion[] = [
  {
    key: 'romantic',
    emoji: '💕',
    label: 'Romantic Getaway',
    description: 'Perfect for couples and special occasions',
    keywords: ['romantic', 'intimate', 'couples', 'honeymoon', 'anniversary', 'date night', 'candlelit', 'private'],
    categoryBoost: ['hotel', 'restaurant'],
  },
  {
    key: 'family',
    emoji: '👨‍👩‍👧‍👦',
    label: 'Family Trip',
    description: 'Family-friendly with activities for all ages',
    keywords: ['family', 'kids', 'children', 'family-friendly', 'kid-friendly', 'spacious', 'suite'],
    categoryBoost: ['hotel'],
  },
  {
    key: 'business',
    emoji: '💼',
    label: 'Business Travel',
    description: 'Great for work trips and meetings',
    keywords: ['business', 'work', 'meeting', 'conference', 'corporate', 'wifi', 'desk', 'executive'],
    categoryBoost: ['hotel', 'cafe'],
  },
  {
    key: 'celebration',
    emoji: '🎉',
    label: 'Special Celebration',
    description: 'Ideal for birthdays and celebrations',
    keywords: ['celebration', 'birthday', 'party', 'milestone', 'champagne', 'toast', 'special occasion'],
    categoryBoost: ['restaurant', 'bar'],
  },
  {
    key: 'solo',
    emoji: '🎒',
    label: 'Solo Travel',
    description: 'Welcoming atmosphere for solo travelers',
    keywords: ['solo', 'single', 'welcoming', 'bar seating', 'counter', 'alone'],
    categoryBoost: ['bar', 'cafe'],
  },
  {
    key: 'friends',
    emoji: '👯',
    label: 'Friends Getaway',
    description: 'Fun vibes for groups of friends',
    keywords: ['friends', 'group', 'fun', 'lively', 'party', 'social', 'gathering'],
    categoryBoost: ['bar', 'restaurant'],
  },
  {
    key: 'foodie',
    emoji: '🍴',
    label: 'Foodie Experience',
    description: 'A must for culinary enthusiasts',
    keywords: ['tasting', 'menu', 'culinary', 'chef', 'michelin', 'gastronomic', 'foodie', 'cuisine'],
    categoryBoost: ['restaurant'],
  },
  {
    key: 'wellness',
    emoji: '🧘',
    label: 'Wellness Retreat',
    description: 'Relaxation and rejuvenation focus',
    keywords: ['spa', 'wellness', 'yoga', 'massage', 'relax', 'retreat', 'peaceful', 'serene', 'tranquil'],
    categoryBoost: ['hotel'],
  },
  {
    key: 'culture',
    emoji: '🎭',
    label: 'Culture Seeker',
    description: 'Rich in history and cultural significance',
    keywords: ['historic', 'museum', 'art', 'culture', 'heritage', 'landmark', 'architecture', 'cultural'],
    categoryBoost: ['culture', 'hotel'],
  },
];

export function PerfectFor({ destination, reviews = [], compact = false }: PerfectForProps) {
  const matchedOccasions = useMemo(() => {
    const category = destination.category?.toLowerCase() || '';
    const searchText = [
      destination.content || '',
      destination.description || '',
      destination.micro_description || '',
      destination.architectural_significance || '',
      destination.design_story || '',
      ...reviews.map((r) => r.text || ''),
    ]
      .join(' ')
      .toLowerCase();

    const scored = OCCASIONS.map((occasion) => {
      let score = 0;

      // Check keyword matches
      occasion.keywords.forEach((keyword) => {
        if (searchText.includes(keyword)) {
          score += 2;
        }
      });

      // Category boost
      if (occasion.categoryBoost?.includes(category)) {
        score += 1;
      }

      // Michelin star boost for foodie
      if (occasion.key === 'foodie' && destination.michelin_stars) {
        score += 3;
      }

      // Romantic boost for high-end places
      if (occasion.key === 'romantic' && destination.crown) {
        score += 2;
      }

      return { ...occasion, score };
    });

    return scored
      .filter((o) => o.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, compact ? 3 : 4);
  }, [destination, reviews, compact]);

  if (matchedOccasions.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {matchedOccasions.map((occasion) => (
          <span
            key={occasion.key}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-full text-sm text-blue-700 dark:text-blue-300"
          >
            <span>{occasion.emoji}</span>
            <span>{occasion.label}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
        Perfect For
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {matchedOccasions.map((occasion) => (
          <div
            key={occasion.key}
            className={cn(
              'p-4 rounded-xl border transition-colors',
              'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
              'hover:border-gray-300 dark:hover:border-gray-700'
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{occasion.emoji}</span>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {occasion.label}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {occasion.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
