'use client';

import { useMemo } from 'react';
import { Destination } from '@/types/destination';

interface DestinationHighlightsProps {
  destination: Destination;
  reviews?: Array<{ text: string; rating: number }>;
}

// Category-specific highlight mappings
const CATEGORY_HIGHLIGHTS: Record<string, Array<{ key: string; emoji: string; label: string; keywords: string[] }>> = {
  restaurant: [
    { key: 'fine-dining', emoji: '🍽️', label: 'Fine Dining', keywords: ['fine dining', 'tasting menu', 'michelin', 'upscale', 'elegant'] },
    { key: 'rooftop', emoji: '🌅', label: 'Rooftop', keywords: ['rooftop', 'terrace', 'outdoor', 'patio'] },
    { key: 'chef', emoji: '👨‍🍳', label: 'Celebrity Chef', keywords: ['celebrity chef', 'chef', 'renowned', 'famous'] },
    { key: 'view', emoji: '🌆', label: 'Great Views', keywords: ['view', 'views', 'skyline', 'panoramic', 'overlook'] },
    { key: 'cocktails', emoji: '🍸', label: 'Craft Cocktails', keywords: ['cocktail', 'bar', 'drinks', 'mixology'] },
    { key: 'romantic', emoji: '💕', label: 'Romantic', keywords: ['romantic', 'intimate', 'candle', 'date night'] },
    { key: 'private', emoji: '🚪', label: 'Private Rooms', keywords: ['private', 'private room', 'private dining'] },
    { key: 'live-music', emoji: '🎵', label: 'Live Music', keywords: ['live music', 'jazz', 'live entertainment'] },
  ],
  hotel: [
    { key: 'luxury', emoji: '✨', label: 'Luxury', keywords: ['luxury', 'luxurious', '5-star', 'five star', 'world-class'] },
    { key: 'spa', emoji: '🧖', label: 'Spa & Wellness', keywords: ['spa', 'wellness', 'massage', 'sauna', 'pool'] },
    { key: 'rooftop', emoji: '🌅', label: 'Rooftop', keywords: ['rooftop', 'terrace', 'rooftop bar', 'rooftop pool'] },
    { key: 'historic', emoji: '🏛️', label: 'Historic', keywords: ['historic', 'heritage', 'landmark', 'century', 'restored'] },
    { key: 'boutique', emoji: '🏨', label: 'Boutique', keywords: ['boutique', 'intimate', 'personalized', 'unique'] },
    { key: 'design', emoji: '🎨', label: 'Design Hotel', keywords: ['design', 'contemporary', 'modern', 'architect', 'interior'] },
    { key: 'concierge', emoji: '👨‍💼', label: 'Personal Service', keywords: ['concierge', 'butler', 'personalized', 'service'] },
    { key: 'restaurant', emoji: '🍽️', label: 'Fine Dining', keywords: ['restaurant', 'dining', 'michelin', 'chef'] },
  ],
  bar: [
    { key: 'cocktails', emoji: '🍸', label: 'Craft Cocktails', keywords: ['cocktail', 'mixology', 'craft', 'drinks'] },
    { key: 'speakeasy', emoji: '🚪', label: 'Speakeasy', keywords: ['speakeasy', 'hidden', 'secret', 'prohibition'] },
    { key: 'rooftop', emoji: '🌅', label: 'Rooftop', keywords: ['rooftop', 'terrace', 'views', 'skyline'] },
    { key: 'wine', emoji: '🍷', label: 'Wine Bar', keywords: ['wine', 'sommelier', 'cellar', 'vintage'] },
    { key: 'live-music', emoji: '🎵', label: 'Live Music', keywords: ['live music', 'jazz', 'live band', 'dj'] },
    { key: 'whiskey', emoji: '🥃', label: 'Whiskey Selection', keywords: ['whiskey', 'bourbon', 'scotch', 'whisky'] },
    { key: 'tapas', emoji: '🍢', label: 'Bar Snacks', keywords: ['tapas', 'snacks', 'bites', 'appetizers'] },
    { key: 'late', emoji: '🌙', label: 'Late Night', keywords: ['late night', 'late', 'night owl', 'after hours'] },
  ],
  cafe: [
    { key: 'specialty', emoji: '☕', label: 'Specialty Coffee', keywords: ['specialty', 'single origin', 'third wave', 'roasted'] },
    { key: 'pastry', emoji: '🥐', label: 'Fresh Pastries', keywords: ['pastry', 'pastries', 'croissant', 'baked', 'bakery'] },
    { key: 'brunch', emoji: '🍳', label: 'Brunch Spot', keywords: ['brunch', 'breakfast', 'eggs', 'morning'] },
    { key: 'work', emoji: '💻', label: 'Work-Friendly', keywords: ['laptop', 'wifi', 'work', 'remote', 'coworking'] },
    { key: 'outdoor', emoji: '🌳', label: 'Outdoor Seating', keywords: ['outdoor', 'terrace', 'patio', 'garden'] },
    { key: 'cozy', emoji: '🛋️', label: 'Cozy Atmosphere', keywords: ['cozy', 'cosy', 'warm', 'intimate', 'charming'] },
    { key: 'art', emoji: '🎨', label: 'Art & Design', keywords: ['art', 'gallery', 'design', 'aesthetic', 'instagram'] },
  ],
  culture: [
    { key: 'historic', emoji: '🏛️', label: 'Historic', keywords: ['historic', 'heritage', 'landmark', 'century', 'ancient'] },
    { key: 'art', emoji: '🎨', label: 'Art', keywords: ['art', 'gallery', 'museum', 'exhibition', 'collection'] },
    { key: 'architecture', emoji: '🏗️', label: 'Architecture', keywords: ['architecture', 'architect', 'building', 'design'] },
    { key: 'guided', emoji: '🎧', label: 'Guided Tours', keywords: ['tour', 'guided', 'guide', 'audio'] },
    { key: 'interactive', emoji: '🖐️', label: 'Interactive', keywords: ['interactive', 'hands-on', 'experience', 'immersive'] },
    { key: 'free', emoji: '🎟️', label: 'Free Entry', keywords: ['free', 'no charge', 'complimentary'] },
  ],
};

// Universal highlights that apply to all categories
const UNIVERSAL_HIGHLIGHTS = [
  { key: 'michelin', emoji: '⭐', label: 'Michelin Starred', condition: (d: Destination) => d.michelin_stars && d.michelin_stars > 0 },
  { key: 'crown', emoji: '👑', label: 'Crown', condition: (d: Destination) => d.crown },
  { key: 'walkable', emoji: '🚶', label: 'Walkable Location', keywords: ['walkable', 'walking distance', 'central', 'downtown'] },
  { key: 'reservation', emoji: '📅', label: 'Reservations Recommended', keywords: ['reservation', 'book ahead', 'book in advance'] },
];

export function DestinationHighlights({ destination, reviews = [] }: DestinationHighlightsProps) {
  const highlights = useMemo(() => {
    const result: Array<{ emoji: string; label: string }> = [];
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

    // Add universal highlights based on conditions
    UNIVERSAL_HIGHLIGHTS.forEach((highlight) => {
      if ('condition' in highlight && highlight.condition) {
        if (highlight.condition(destination)) {
          result.push({ emoji: highlight.emoji, label: highlight.label });
        }
      } else if ('keywords' in highlight && highlight.keywords) {
        if (highlight.keywords.some((kw) => searchText.includes(kw))) {
          result.push({ emoji: highlight.emoji, label: highlight.label });
        }
      }
    });

    // Get category-specific highlights
    const categoryHighlights = CATEGORY_HIGHLIGHTS[category] || CATEGORY_HIGHLIGHTS.restaurant;

    categoryHighlights.forEach((highlight) => {
      if (highlight.keywords.some((kw) => searchText.includes(kw))) {
        // Avoid duplicates
        if (!result.find((r) => r.label === highlight.label)) {
          result.push({ emoji: highlight.emoji, label: highlight.label });
        }
      }
    });

    // Add architect/design highlight if available
    if (destination.architect || destination.design_firm || destination.architectural_style) {
      if (!result.find((r) => r.label.includes('Design'))) {
        result.push({ emoji: '🎨', label: 'Notable Design' });
      }
    }

    // Add brand highlight if available
    if (destination.brand) {
      result.push({ emoji: '🏢', label: destination.brand });
    }

    return result.slice(0, 6); // Limit to 6 highlights
  }, [destination, reviews]);

  if (highlights.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {highlights.map((highlight, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300"
        >
          <span>{highlight.emoji}</span>
          <span>{highlight.label}</span>
        </span>
      ))}
    </div>
  );
}
