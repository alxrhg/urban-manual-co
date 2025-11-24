'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/personalization';
import { Save, Loader2 } from 'lucide-react';
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
    privacy_mode: false,
    allow_tracking: true,
    email_notifications: true,
  });

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
