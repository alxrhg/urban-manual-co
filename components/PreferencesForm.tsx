'use client';

import { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';

interface PreferencesFormProps {
  userId: string;
  className?: string;
}

const TRAVEL_STYLES = ['Luxury', 'Budget', 'Adventure', 'Relaxation', 'Balanced'] as const;
const INTERESTS = [
  'romantic', 'modernist', 'art lover', 'foodie', 'vegetarian', 'vegan',
  'wellness', 'nightlife', 'culture', 'architecture', 'nature', 'shopping',
  'hidden gems', 'luxury', 'affordable', 'trendy', 'traditional',
] as const;

export default function PreferencesForm({ userId, className = '' }: PreferencesFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    favoriteCities: [] as string[],
    favoriteCategories: [] as string[],
    travelStyle: null as string | null,
    interests: [] as string[],
    dietaryPreferences: [] as string[],
    pricePreference: null as number | null,
  });

  useEffect(() => {
    fetchPreferences();
  }, [userId]);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/account/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/account/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      // Show success feedback
      const button = document.querySelector('[data-save-preferences]');
      if (button) {
        button.textContent = 'Saved!';
        setTimeout(() => {
          if (button instanceof HTMLButtonElement) {
            button.textContent = 'Save Preferences';
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setPreferences(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const toggleDietary = (pref: string) => {
    setPreferences(prev => ({
      ...prev,
      dietaryPreferences: prev.dietaryPreferences.includes(pref)
        ? prev.dietaryPreferences.filter(p => p !== pref)
        : [...prev.dietaryPreferences, pref],
    }));
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Tell us what you love so we can tailor recommendations.
        </p>
      </div>

      {/* Travel Style */}
      <div>
        <label className="block text-sm font-medium mb-2">Travel Style</label>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_STYLES.map(style => (
            <button
              key={style}
              onClick={() => setPreferences(prev => ({ ...prev, travelStyle: prev.travelStyle === style ? null : style }))}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                preferences.travelStyle === style
                  ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                  : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className="block text-sm font-medium mb-2">Interests</label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map(interest => (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors flex items-center gap-2 ${
                preferences.interests.includes(interest)
                  ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                  : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
              }`}
            >
              {preferences.interests.includes(interest) && <Check className="h-3 w-3" />}
              {interest}
            </button>
          ))}
        </div>
      </div>

      {/* Dietary Preferences */}
      <div>
        <label className="block text-sm font-medium mb-2">Dietary Preferences</label>
        <div className="flex flex-wrap gap-2">
          {['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher'].map(pref => (
            <button
              key={pref}
              onClick={() => toggleDietary(pref)}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                preferences.dietaryPreferences.includes(pref)
                  ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                  : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
              }`}
            >
              {pref}
            </button>
          ))}
        </div>
      </div>

      {/* Price Preference */}
      <div>
        <label className="block text-sm font-medium mb-2">Price Preference</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(level => (
            <button
              key={level}
              onClick={() => setPreferences(prev => ({ ...prev, pricePreference: prev.pricePreference === level ? null : level }))}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                preferences.pricePreference === level
                  ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                  : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
              }`}
            >
              {'$'.repeat(level)}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        data-save-preferences
        onClick={savePreferences}
        disabled={saving}
        className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50 flex items-center gap-2"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Preferences'
        )}
      </button>
    </div>
  );
}

