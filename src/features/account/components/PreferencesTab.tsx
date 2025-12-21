'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile, HomeBase } from '@/types/personalization';
import { Save, Loader2, MapPin, X } from 'lucide-react';
import { cityCountryMap } from '@/data/cityCountryMap';
import { toast } from '@/ui/sonner';

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
const DEFAULT_VIEW_OPTIONS = ['Grid', 'List', 'Map'];
const SORT_OPTIONS = ['Popularity', 'Rating', 'Distance', 'Price', 'Newest'];

interface PreferencesTabProps {
  userId: string;
}

interface LocationSuggestion {
  name: string;
  latitude: number;
  longitude: number;
}

// Extended preferences that may not be in UserProfile type yet
interface ExtendedPreferences {
  // Notification preferences
  notify_new_destinations: boolean;
  notify_trip_reminders: boolean;
  notify_weekly_digest: boolean;
  notify_price_changes: boolean;
  // Display preferences
  default_view: string;
  default_sort: string;
  show_user_reviews: boolean;
  show_user_photos: boolean;
  // Language preferences
  preferred_language: string;
  preferred_currency: string;
  distance_unit: string;
}

const defaultExtendedPrefs: ExtendedPreferences = {
  notify_new_destinations: true,
  notify_trip_reminders: true,
  notify_weekly_digest: false,
  notify_price_changes: false,
  default_view: 'Grid',
  default_sort: 'Popularity',
  show_user_reviews: true,
  show_user_photos: true,
  preferred_language: 'English',
  preferred_currency: 'USD',
  distance_unit: 'Miles',
};

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
  const [extendedPrefs, setExtendedPrefs] = useState<ExtendedPreferences>(defaultExtendedPrefs);

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
      toast.success('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save preferences. Please try again.');
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
              onClick={() => setProfile({ ...profile, travel_style: style as UserProfile['travel_style'] })}
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

      {/* Notification Preferences */}
      <section className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Notifications</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Control how we keep you updated about travel opportunities
        </p>
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={extendedPrefs.notify_new_destinations}
              onChange={(e) => setExtendedPrefs({ ...extendedPrefs, notify_new_destinations: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-black dark:accent-white"
            />
            <div>
              <p className="text-sm">New destinations matching my interests</p>
              <p className="text-xs text-gray-500">Get notified when we add places you might like</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={extendedPrefs.notify_trip_reminders}
              onChange={(e) => setExtendedPrefs({ ...extendedPrefs, notify_trip_reminders: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-black dark:accent-white"
            />
            <div>
              <p className="text-sm">Trip reminders</p>
              <p className="text-xs text-gray-500">Reminders before your upcoming trips</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={extendedPrefs.notify_weekly_digest}
              onChange={(e) => setExtendedPrefs({ ...extendedPrefs, notify_weekly_digest: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-black dark:accent-white"
            />
            <div>
              <p className="text-sm">Weekly recommendations</p>
              <p className="text-xs text-gray-500">Curated picks based on your preferences</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={extendedPrefs.notify_price_changes}
              onChange={(e) => setExtendedPrefs({ ...extendedPrefs, notify_price_changes: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-black dark:accent-white"
            />
            <div>
              <p className="text-sm">Price changes on saved places</p>
              <p className="text-xs text-gray-500">Alert me when prices drop at saved destinations</p>
            </div>
          </label>
        </div>
      </section>

      {/* Display Preferences */}
      <section className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">Search & Display</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm mb-2">Default view</label>
            <div className="flex gap-2">
              {DEFAULT_VIEW_OPTIONS.map(view => (
                <button
                  key={view}
                  onClick={() => setExtendedPrefs({ ...extendedPrefs, default_view: view })}
                  className={`px-4 py-2 rounded-xl border text-sm transition-all ${
                    extendedPrefs.default_view === view
                      ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800 font-medium'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2">Sort destinations by</label>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map(sort => (
                <button
                  key={sort}
                  onClick={() => setExtendedPrefs({ ...extendedPrefs, default_sort: sort })}
                  className={`px-3 py-1.5 rounded-xl border text-xs transition-all ${
                    extendedPrefs.default_sort === sort
                      ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800 font-medium'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  {sort}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={extendedPrefs.show_user_reviews}
                onChange={(e) => setExtendedPrefs({ ...extendedPrefs, show_user_reviews: e.target.checked })}
                className="h-4 w-4 accent-black dark:accent-white"
              />
              <span className="text-sm">Show user reviews</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={extendedPrefs.show_user_photos}
                onChange={(e) => setExtendedPrefs({ ...extendedPrefs, show_user_photos: e.target.checked })}
                className="h-4 w-4 accent-black dark:accent-white"
              />
              <span className="text-sm">Show user photos</span>
            </label>
          </div>
        </div>
      </section>

      {/* Language & Region */}
      <section className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">Language & Region</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2">Language</label>
            <select
              value={extendedPrefs.preferred_language}
              onChange={(e) => setExtendedPrefs({ ...extendedPrefs, preferred_language: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-black dark:focus:border-white"
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="German">German</option>
              <option value="Japanese">Japanese</option>
              <option value="Chinese">Chinese</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">Currency</label>
            <select
              value={extendedPrefs.preferred_currency}
              onChange={(e) => setExtendedPrefs({ ...extendedPrefs, preferred_currency: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-black dark:focus:border-white"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="CHF">CHF</option>
              <option value="AUD">AUD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">Distance unit</label>
            <div className="flex gap-2">
              {['Miles', 'Kilometers'].map(unit => (
                <button
                  key={unit}
                  onClick={() => setExtendedPrefs({ ...extendedPrefs, distance_unit: unit })}
                  className={`px-4 py-2 rounded-xl border text-sm transition-all ${
                    extendedPrefs.distance_unit === unit
                      ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800 font-medium'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
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
