'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cityCountryMap, countryOrder } from '@/data/cityCountryMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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


  if (loading) {
    return (
      <div className="w-full space-y-6">
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
    <div className="w-full space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert variant="default" className="rounded-xl border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-200">Success</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">Profile updated successfully!</AlertDescription>
        </Alert>
      )}

      <div className="space-y-8">
        {/* Personal Information Section */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold mb-6 text-gray-900 dark:text-white">Personal Information</h3>
          <div className="space-y-5">
              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="display_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</Label>
                <Input
                  id="display_name"
                  type="text"
                  value={profile.display_name}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  placeholder="Your display name"
                  className="rounded-xl h-11"
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  placeholder="username"
                  className="rounded-xl h-11"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Your profile URL: <span className="font-mono text-gray-700 dark:text-gray-300">urbanmanual.co/user/{profile.username || 'username'}</span>
                </p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-medium text-gray-700 dark:text-gray-300">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={4}
                  placeholder="Tell us about yourself..."
                  className="rounded-xl resize-none"
                />
              </div>
            </div>
          </div>

        {/* Location & Details Section */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold mb-6 text-gray-900 dark:text-white">Location & Details</h3>
          <div className="space-y-5">
              {/* Location - City Selector */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-medium text-gray-700 dark:text-gray-300">Main City</Label>
                <Select
                  value={profile.location || undefined}
                  onValueChange={(value) => setProfile({ ...profile, location: value })}
                >
                  <SelectTrigger id="location" className="w-full h-11 rounded-xl">
                    <SelectValue placeholder="Select a city" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {countryOrder.map((country) => {
                      const cities = citiesByCountry[country];
                      if (!cities || cities.length === 0) return null;
                      return (
                        <SelectGroup key={country}>
                          <SelectLabel>{country}</SelectLabel>
                          {cities.map((city) => (
                            <SelectItem key={city} value={city}>
                              {capitalizeCity(city)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Select your primary city from our curated list
                </p>
              </div>

              {/* Birthday */}
              <div className="space-y-2">
                <Label htmlFor="birthday" className="text-sm font-medium text-gray-700 dark:text-gray-300">Birthday</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={profile.birthday}
                  onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
                  className="rounded-xl h-11"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Optional - we'll keep this private
                </p>
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website_url" className="text-sm font-medium text-gray-700 dark:text-gray-300">Website</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={profile.website_url}
                  onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
                  placeholder="https://yourwebsite.com"
                  className="rounded-xl h-11"
                />
              </div>
            </div>
          </div>

        {/* Privacy Setting */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold mb-6 text-gray-900 dark:text-white">Privacy & Visibility</h3>
          <div className="flex items-start gap-4 p-5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors">
            <Switch
              id="is_public"
              checked={profile.is_public}
              onCheckedChange={(checked) => setProfile({ ...profile, is_public: checked })}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor="is_public" className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer">
                Make my profile public
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Allow others to view your profile and saved destinations
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-11 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all"
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
                className="h-11 rounded-xl"
              >
                Cancel
              </Button>
            )}
          </div>
      </div>
    </div>
  );
}
