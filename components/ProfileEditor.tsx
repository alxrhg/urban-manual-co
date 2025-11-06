'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AvatarUpload } from './AvatarUpload';
import { Loader2, Save, X } from 'lucide-react';
import { cityCountryMap, countryOrder } from '@/data/cityCountryMap';

interface ProfileEditorProps {
  userId: string;
  onClose?: () => void;
  onSaveComplete?: () => void;
}

interface ProfileData {
  display_name: string;
  bio: string;
  location: string;
  website_url: string;
  birthday: string;
  username: string;
  avatar_url: string | null;
  is_public: boolean;
}

export function ProfileEditor({ userId, onClose, onSaveComplete }: ProfileEditorProps) {
  const [profile, setProfile] = useState<ProfileData>({
    display_name: '',
    bio: '',
    location: '',
    website_url: '',
    birthday: '',
    username: '',
    avatar_url: null,
    is_public: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    try {
      setLoading(true);
      const response = await fetch('/api/account/profile');

      if (!response.ok) {
        throw new Error('Failed to load profile');
      }

      const data = await response.json();

      if (data.profile) {
        setProfile({
          display_name: data.profile.display_name || '',
          bio: data.profile.bio || '',
          location: data.profile.location || '',
          website_url: data.profile.website_url || '',
          birthday: data.profile.birthday || '',
          username: data.profile.username || '',
          avatar_url: data.profile.avatar_url || null,
          is_public: data.profile.is_public ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarUpload(newAvatarUrl: string) {
    setProfile({ ...profile, avatar_url: newAvatarUrl });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Helper function to capitalize city names for display
  const capitalizeCity = (city: string): string => {
    return city
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get cities grouped by country
  const citiesByCountry = countryOrder.reduce((acc, country) => {
    const cities = Object.entries(cityCountryMap)
      .filter(([_, c]) => c === country)
      .map(([city, _]) => city);
    if (cities.length > 0) {
      acc[country] = cities;
    }
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-light">Edit Profile</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:opacity-60 transition-opacity"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-2xl text-sm text-black dark:text-white">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex justify-center py-4">
          <AvatarUpload
            currentAvatarUrl={profile.avatar_url}
            displayName={profile.display_name || 'User'}
            onUploadComplete={handleAvatarUpload}
          />
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">
            Display Name
          </label>
          <input
            type="text"
            value={profile.display_name}
            onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white text-sm transition-colors"
            placeholder="Your display name"
          />
        </div>

        {/* Username */}
        <div>
          <label className="block text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">
            Username
          </label>
          <input
            type="text"
            value={profile.username}
            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white text-sm transition-colors"
            placeholder="username"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Your profile URL: yoursite.com/user/{profile.username || 'username'}
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">
            Bio
          </label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            rows={4}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white resize-none text-sm transition-colors"
            placeholder="Tell us about yourself..."
          />
        </div>

        {/* Location - City Selector */}
        <div>
          <label className="block text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">
            Main City
          </label>
          <select
            value={profile.location}
            onChange={(e) => setProfile({ ...profile, location: e.target.value })}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white text-sm transition-colors appearance-none cursor-pointer"
          >
            <option value="">Select a city</option>
            {countryOrder.map((country) => {
              const cities = citiesByCountry[country];
              if (!cities) return null;
              return (
                <optgroup key={country} label={country}>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {capitalizeCity(city)}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Select your primary city from our curated list
          </p>
        </div>

        {/* Birthday */}
        <div>
          <label className="block text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">
            Birthday
          </label>
          <input
            type="date"
            value={profile.birthday}
            onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white text-sm transition-colors"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Optional - we'll keep this private
          </p>
        </div>

        {/* Website */}
        <div>
          <label className="block text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">
            Website
          </label>
          <input
            type="url"
            value={profile.website_url}
            onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white text-sm transition-colors"
            placeholder="https://yourwebsite.com"
          />
        </div>

        {/* Privacy Setting */}
        <div className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <input
            type="checkbox"
            id="is_public"
            checked={profile.is_public}
            onChange={(e) => setProfile({ ...profile, is_public: e.target.checked })}
            className="w-4 h-4 rounded border-gray-200 dark:border-gray-800"
          />
          <label htmlFor="is_public" className="text-xs font-medium cursor-pointer">
            Make my profile public
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium inline-flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
