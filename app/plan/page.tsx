'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { AIItineraryBuilder } from '@/components/AIItineraryBuilder';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Destination {
  id: number;
  name: string;
  city?: string;
  category?: string;
  slug?: string;
  image?: string;
}

export default function TripPlannerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedDestinations, setSelectedDestinations] = useState<Destination[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await supabase
        .from('destinations')
        .select('id, name, city, category, slug, image')
        .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addDestination = (dest: Destination) => {
    if (!selectedDestinations.find(d => d.id === dest.id)) {
      setSelectedDestinations([...selectedDestinations, dest]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeDestination = (id: number) => {
    setSelectedDestinations(selectedDestinations.filter(d => d.id !== id));
  };

  if (!user) {
    return (
      <main className="w-full px-6 md:px-10 lg:px-12 py-20 min-h-screen">
        <div className="max-w-4xl mx-auto text-center py-20">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-4">
            Sign in to use the AI Trip Planner
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please sign in to create personalized itineraries with AI
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-6 md:px-10 lg:px-12 py-20 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.push('/')}
          className="mb-6 text-xs text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-light text-black dark:text-white mb-2">
            AI Trip Planner
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select destinations and let AI create the perfect itinerary
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Destination Selection */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                1. Select Destinations
              </h3>
              
              {/* Search Input */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search destinations..."
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
                
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-64 overflow-y-auto z-10">
                    {searchResults.map((dest) => (
                      <button
                        key={dest.id}
                        onClick={() => addDestination(dest)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {dest.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {dest.city} {dest.category && `• ${dest.category}`}
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-gray-400 group-hover:text-purple-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Destinations */}
              {selectedDestinations.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {selectedDestinations.length} destination{selectedDestinations.length !== 1 ? 's' : ''} selected
                  </div>
                  {selectedDestinations.map((dest) => (
                    <div
                      key={dest.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {dest.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {dest.city} {dest.category && `• ${dest.category}`}
                        </div>
                      </div>
                      <button
                        onClick={() => removeDestination(dest.id)}
                        className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedDestinations.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Search and select destinations to begin
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: AI Builder */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              2. Build Your Itinerary
            </h3>
            
            <AIItineraryBuilder
              destinations={selectedDestinations}
              onItineraryGenerated={(itinerary) => {
                console.log('Generated itinerary:', itinerary);
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
