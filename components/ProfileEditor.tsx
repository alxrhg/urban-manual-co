'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AvatarUpload } from './AvatarUpload';
import { Save, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cityCountryMap, countryOrder } from '@/data/cityCountryMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

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
  const [success, setSuccess] = useState(false);

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

      setSuccess(true);
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
      
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to save profile');
      setSuccess(false);
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarUpload(newAvatarUrl: string) {
    setProfile({ ...profile, avatar_url: newAvatarUrl });
  }

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex justify-center py-8">
          <Skeleton className="h-24 w-24 rounded-full" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-2xl" />
            </div>
          ))}
        </div>
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
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light text-black dark:text-white">Edit Profile</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Update your profile information and preferences
          </p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert variant="default">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Profile updated successfully!</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex justify-center py-6 border-b border-gray-200 dark:border-gray-800">
          <AvatarUpload
            currentAvatarUrl={profile.avatar_url}
            displayName={profile.display_name || 'User'}
            onUploadComplete={handleAvatarUpload}
          />
        </div>

        {/* Personal Information Section */}
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-medium text-black dark:text-white mb-4">Personal Information</h3>
            <div className="space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">
                  Display Name
                </label>
                <Input
                  type="text"
                  value={profile.display_name}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  placeholder="Your display name"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">
                  Username
                </label>
                <Input
                  type="text"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  placeholder="username"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                  Your profile URL: urbanmanual.co/user/{profile.username || 'username'}
                </p>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">
                  Bio
                </label>
                <Textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={4}
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location & Details Section */}
        <div className="space-y-5 pt-6 border-t border-gray-200 dark:border-gray-800">
          <div>
            <h3 className="text-sm font-medium text-black dark:text-white mb-4">Location & Details</h3>
            <div className="space-y-4">
              {/* Location - City Selector */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">
                  Main City
                </label>
                <select
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  className="flex h-10 w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-black dark:text-white focus-visible:outline-none focus-visible:border-black dark:focus-visible:border-white transition-colors appearance-none cursor-pointer"
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
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                  Select your primary city from our curated list
                </p>
              </div>

              {/* Birthday */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">
                  Birthday
                </label>
                <Input
                  type="date"
                  value={profile.birthday}
                  onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                  Optional - we'll keep this private
                </p>
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">
                  Website
                </label>
                <Input
                  type="url"
                  value={profile.website_url}
                  onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Setting */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50">
            <input
              type="checkbox"
              id="is_public"
              checked={profile.is_public}
              onChange={(e) => setProfile({ ...profile, is_public: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-0 cursor-pointer"
            />
            <div className="flex-1">
              <label htmlFor="is_public" className="text-sm font-medium text-black dark:text-white cursor-pointer block">
                Make my profile public
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Allow others to view your profile and saved destinations
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
            variant="default"
          >
            {saving ? (
              <>
                <Spinner className="size-4" />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Changes
              </>
            )}
          </Button>
          {onClose && (
            <Button
              onClick={onClose}
              disabled={saving}
              variant="outline"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
