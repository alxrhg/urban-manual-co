'use client';

import { Brain, MapPin, Tag, Heart, TrendingUp, Calendar } from 'lucide-react';

interface ContextCardsProps {
  context: {
    city?: string;
    category?: string;
    preferences?: string[];
    favoriteCategories?: string[];
    favoriteCities?: string[];
    travelStyle?: string;
    recentSearches?: string[];
    budget?: { min?: number; max?: number };
  };
}

export function ContextCards({ context }: ContextCardsProps) {
  const cards: Array<{ icon: React.ReactNode; label: string; value: string; color: string }> = [];

  // Current city focus
  if (context.city) {
    cards.push({
      icon: <MapPin className="h-4 w-4" />,
      label: 'Exploring',
      value: context.city,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    });
  }

  // Current category
  if (context.category) {
    cards.push({
      icon: <Tag className="h-4 w-4" />,
      label: 'Looking for',
      value: context.category,
      color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    });
  }

  // Travel style
  if (context.travelStyle) {
    cards.push({
      icon: <TrendingUp className="h-4 w-4" />,
      label: 'Your style',
      value: context.travelStyle,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    });
  }

  // Favorite categories
  if (context.favoriteCategories && context.favoriteCategories.length > 0) {
    cards.push({
      icon: <Heart className="h-4 w-4" />,
      label: 'You love',
      value: context.favoriteCategories.slice(0, 2).join(', '),
      color: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
    });
  }

  // Preferences
  if (context.preferences && context.preferences.length > 0) {
    cards.push({
      icon: <Tag className="h-4 w-4" />,
      label: 'Preferences',
      value: context.preferences.slice(0, 2).join(', '),
      color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    });
  }

  // Budget
  if (context.budget) {
    const { min, max } = context.budget;
    let budgetText = '';
    if (min && max) budgetText = `$${min}-$${max}`;
    else if (min) budgetText = `$${min}+`;
    else if (max) budgetText = `Under $${max}`;

    if (budgetText) {
      cards.push({
        icon: <span className="text-sm">💰</span>,
        label: 'Budget',
        value: budgetText,
        color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      });
    }
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[2px] font-medium">
        <Brain className="h-3.5 w-3.5" />
        <span>What I know about you</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`inline-flex items-center gap-2 px-3 py-2 border rounded-xl ${card.color}`}
          >
            <div className="flex items-center justify-center">{card.icon}</div>
            <div className="text-xs">
              <div className="font-medium opacity-70">{card.label}</div>
              <div className="font-semibold">{card.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
