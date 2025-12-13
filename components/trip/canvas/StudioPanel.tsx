'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useUrbanStudio } from './useUrbanStudio';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import DraggableSpotCard from './DraggableSpotCard';
import ItemEditor from './ItemEditor';
import type { Destination } from '@/types/destination';
import {
  Search,
  Loader2,
  Sparkles,
  UtensilsCrossed,
  Coffee,
  Building2,
  TreePine,
  Wine,
  ShoppingBag,
  Hotel,
  ChevronDown,
  MapPin,
  Star,
} from 'lucide-react';

interface StudioPanelProps {
  city: string;
  sourceDestinations?: Destination[];
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'restaurant', label: 'Dining', icon: UtensilsCrossed },
  { id: 'cafe', label: 'Cafes', icon: Coffee },
  { id: 'bar', label: 'Bars', icon: Wine },
  { id: 'museum', label: 'Culture', icon: Building2 },
  { id: 'park', label: 'Outdoors', icon: TreePine },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'hotel', label: 'Hotels', icon: Hotel },
];

// ============================================
// INSPECTOR COMPONENT (Mode B) - Uses ItemEditor
// ============================================

function Inspector() {
  const { selectedItem, openPalette } = useUrbanStudio();

  if (!selectedItem) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-900">
        <MapPin className="w-12 h-12 text-gray-600 mb-4" />
        <p className="text-sm text-gray-400">
          Select an item to view details
        </p>
      </div>
    );
  }

  return <ItemEditor item={selectedItem} onClose={openPalette} />;
}

// ============================================
// PALETTE COMPONENT (Mode A)
// ============================================

function Palette({ city, sourceDestinations }: { city: string; sourceDestinations?: Destination[] }) {
  const { activeTrip } = useTripBuilder();
  const [destinations, setDestinations] = useState<Destination[]>(sourceDestinations || []);
  const [loading, setLoading] = useState(!sourceDestinations?.length);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Get slugs of already-scheduled items
  const scheduledSlugs = useMemo(() => {
    if (!activeTrip) return new Set<string>();
    return new Set(
      activeTrip.days.flatMap(day => day.items.map(item => item.destination.slug))
    );
  }, [activeTrip]);

  // Fetch destinations for the city
  const fetchDestinations = useCallback(async () => {
    if (!city || sourceDestinations?.length) return;

    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from('destinations')
        .select('slug, name, city, neighborhood, category, description, micro_description, image, image_thumbnail, latitude, longitude, rating, michelin_stars, price_level')
        .ilike('city', city)
        .limit(100);

      if (error) throw error;
      setDestinations(data || []);
    } catch (error) {
      console.error('Error fetching destinations:', error);
    } finally {
      setLoading(false);
    }
  }, [city, sourceDestinations]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  // Filter destinations (excluding already scheduled)
  const filteredDestinations = useMemo(() => {
    let filtered = destinations.filter(d => !scheduledSlugs.has(d.slug));

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((d) => {
        const cat = (d.category || '').toLowerCase();
        if (selectedCategory === 'restaurant') {
          return cat.includes('restaurant') || cat.includes('dining');
        }
        if (selectedCategory === 'cafe') {
          return cat.includes('cafe') || cat.includes('coffee') || cat.includes('bakery');
        }
        if (selectedCategory === 'bar') {
          return cat.includes('bar') || cat.includes('cocktail') || cat.includes('wine');
        }
        if (selectedCategory === 'museum') {
          return cat.includes('museum') || cat.includes('gallery') || cat.includes('temple') || cat.includes('shrine');
        }
        if (selectedCategory === 'park') {
          return cat.includes('park') || cat.includes('garden') || cat.includes('nature');
        }
        if (selectedCategory === 'shopping') {
          return cat.includes('shopping') || cat.includes('store') || cat.includes('market');
        }
        if (selectedCategory === 'hotel') {
          return cat.includes('hotel') || cat.includes('resort') || cat.includes('ryokan');
        }
        return cat.includes(selectedCategory);
      });
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.neighborhood?.toLowerCase().includes(query) ||
          d.category?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [destinations, scheduledSlugs, selectedCategory, searchQuery]);

  const visibleCategories = showAllCategories ? CATEGORIES : CATEGORIES.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              The Guide
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {city ? `${filteredDestinations.length} spots in ${city}` : 'Curated spots'}
              {scheduledSlugs.size > 0 && (
                <span className="ml-1 text-green-600 dark:text-green-400">
                  • {scheduledSlugs.size} scheduled
                </span>
              )}
            </p>
          </div>
          <Sparkles className="w-5 h-5 text-amber-500" />
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search spots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:ring-offset-0"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {visibleCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                  ${isActive
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
          {!showAllCategories && CATEGORIES.length > 5 && (
            <button
              onClick={() => setShowAllCategories(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              More
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Spots List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading spots...
            </p>
          </div>
        ) : filteredDestinations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {scheduledSlugs.size > 0 && !searchQuery
                ? 'All spots are scheduled!'
                : 'No spots found'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {searchQuery ? 'Try a different search' : 'Check back later'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">
              Drag to add to your trip →
            </p>
            {filteredDestinations.map((destination) => (
              <DraggableSpotCard
                key={destination.slug}
                destination={destination}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          💡 Drag spots across to your timeline
        </p>
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN STUDIO PANEL
// ============================================

export default function StudioPanel({ city, sourceDestinations }: StudioPanelProps) {
  const { sidebarMode } = useUrbanStudio();

  return (
    <div className="h-full bg-white dark:bg-gray-900">
      <AnimatePresence mode="wait">
        {sidebarMode === 'inspector' ? (
          <Inspector key="inspector" />
        ) : (
          <Palette key="palette" city={city} sourceDestinations={sourceDestinations} />
        )}
      </AnimatePresence>
    </div>
  );
}
