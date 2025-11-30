'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile, HomeBase } from '@/types/personalization';
import { Save, Loader2, MapPin, X } from 'lucide-react';
import { cityCountryMap } from '@/data/cityCountryMap';

const ALL_CITIES = Object.keys(cityCountryMap).map(city =>
  city.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
);

const CATEGORIES = ['Hotels', 'Restaurants', 'Cafes', 'Bars', 'Shops', 'Museums', 'Parks', 'Spas'];
const TRAVEL_STYLES = ['Luxury', 'Budget', 'Adventure', 'Relaxation', 'Balanced'];
const DIETARY_PREFERENCES = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Halal', 'Kosher'];
const INTERESTS = [
  'Michelin Stars', 'Rooftop Bars', 'Boutique Hotels', 'Street Food', 'Fine Dining',
  'Architecture', 'Art Galleries', 'Shopping', 'Nightlife', 'Spas', 'Beaches', 'Mountains'
];

interface PreferencesTabProps {
  userId: string;
}

interface LocationSuggestion {
  name: string;
  latitude: number;
  longitude: number;
}

export function PreferencesTab({ userId }: PreferencesTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    favorite_cities: [],
    favorite_categories: [],
    dietary_preferences: [],
    price_preference: 2,
    interests: [],
    travel_style: 'Balanced',
    home_base: undefined,
    privacy_mode: false,
    allow_tracking: true,
    email_notifications: true,
  });

  // Home base search state
  const [homeBaseSearch, setHomeBaseSearch] = useState('');
  const [homeBaseSuggestions, setHomeBaseSuggestions] = useState<LocationSuggestion[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search locations with debounce
  const searchLocations = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setHomeBaseSuggestions([]);
      return;
    }

    setSearchingLocation(true);
    try {
      // Use Mapbox geocoding API
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `types=place,locality,neighborhood&limit=5&access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`
      );
      const data = await response.json();

      if (data.features) {
        setHomeBaseSuggestions(
          data.features.map((f: { place_name: string; center: number[] }) => ({
            name: f.place_name,
            longitude: f.center[0],
            latitude: f.center[1],
          }))
        );
      }
    } catch (err) {
      console.error('Error searching locations:', err);
    } finally {
      setSearchingLocation(false);
    }
  }, []);

  const handleHomeBaseSearchChange = (value: string) => {
    setHomeBaseSearch(value);

    // Debounce the search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(value);
    }, 300);
  };

  const selectHomeBase = (location: LocationSuggestion) => {
    setProfile({
      ...profile,
      home_base: {
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
      },
    });
    setHomeBaseSearch('');
    setHomeBaseSuggestions([]);
  };

  const clearHomeBase = () => {
    setProfile({ ...profile, home_base: undefined });
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          ...profile,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function toggleArrayItem(array: string[] | undefined, item: string): string[] {
    const arr = array || [];
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Home Base */}
      <section className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Home Base</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Set your home location for better trip routing and travel time estimates
        </p>

        {profile.home_base ? (
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {profile.home_base.name}
              </p>
              <p className="text-xs text-gray-400">
                {profile.home_base.latitude.toFixed(4)}, {profile.home_base.longitude.toFixed(4)}
              </p>
            </div>
            <button
              onClick={clearHomeBase}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={homeBaseSearch}
                onChange={(e) => handleHomeBaseSearchChange(e.target.value)}
                placeholder="Search for your city..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
              />
              {searchingLocation && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>

            {/* Suggestions Dropdown */}
            {homeBaseSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 overflow-hidden">
                {homeBaseSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => selectHomeBase(suggestion)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{suggestion.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Travel Style */}
      <section className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">Travel Style</h2>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_STYLES.map(style => (
            <button
              key={style}
              onClick={() => setProfile({ ...profile, travel_style: style as any })}
              className={`px-4 py-2 rounded-2xl border transition-all text-sm ${
                profile.travel_style === style
                  ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800 text-black dark:text-white font-medium'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </section>

      {/* Favorite Cities */}
      <section className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">Favorite Cities</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_CITIES.slice(0, 30).map(city => (
            <button
              key={city}
              onClick={() => setProfile({
                ...profile,
                favorite_cities: toggleArrayItem(profile.favorite_cities, city)
              })}
              className={`px-3 py-1.5 rounded-2xl text-xs border transition-all ${
                profile.favorite_cities?.includes(city)
                  ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800 text-black dark:text-white font-medium'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </section>

      {/* Favorite Categories */}
      <section className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">Favorite Categories</h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setProfile({
                ...profile,
                favorite_categories: toggleArrayItem(profile.favorite_categories, category)
              })}
              className={`px-3 py-1.5 rounded-2xl text-xs border transition-all ${
                profile.favorite_categories?.includes(category)
                  ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800 text-black dark:text-white font-medium'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* Price Preference */}
      <section className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">Price Preference</h2>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(level => (
            <button
              key={level}
              onClick={() => setProfile({ ...profile, price_preference: level })}
              className={`flex-1 px-4 py-3 rounded-2xl border font-medium transition-all text-sm ${
                profile.price_preference === level
                  ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800 text-black dark:text-white'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              {'$'.repeat(level)}
            </button>
          ))}
        </div>
      </section>

      {/* Dietary Preferences */}
      <section className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">Dietary Preferences</h2>
        <div className="flex flex-wrap gap-2">
          {DIETARY_PREFERENCES.map(pref => (
            <button
              key={pref}
              onClick={() => setProfile({
                ...profile,
                dietary_preferences: toggleArrayItem(profile.dietary_preferences, pref)
              })}
              className={`px-3 py-1.5 rounded-2xl text-xs border transition-all ${
                profile.dietary_preferences?.includes(pref)
                  ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800 text-black dark:text-white font-medium'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              {pref}
            </button>
          ))}
        </div>
      </section>

      {/* Interests */}
      <section className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">Interests</h2>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map(interest => (
            <button
              key={interest}
              onClick={() => setProfile({
                ...profile,
                interests: toggleArrayItem(profile.interests, interest)
              })}
              className={`px-3 py-1.5 rounded-2xl text-xs border transition-all ${
                profile.interests?.includes(interest)
                  ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800 text-black dark:text-white font-medium'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </section>

      {/* Save Button */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={saveProfile}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );
}
