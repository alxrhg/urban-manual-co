'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AvatarUpload } from './AvatarUpload';
import { Button } from '@/components/ui/button';
import { Loader2, Save, X } from 'lucide-react';

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

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Edit Profile</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
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
          <label className="block text-sm font-medium mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={profile.display_name}
            onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="Your display name"
          />
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Username
          </label>
          <input
            type="text"
            value={profile.username}
            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="username"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Your profile URL: yoursite.com/user/{profile.username || 'username'}
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Bio
          </label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            placeholder="Tell us about yourself..."
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Main City / Location
          </label>
          <input
            type="text"
            value={profile.location}
            onChange={(e) => setProfile({ ...profile, location: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="e.g. New York, USA"
          />
        </div>

        {/* Birthday */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Birthday
          </label>
          <input
            type="date"
            value={profile.birthday}
            onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Optional - we'll keep this private
          </p>
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Website
          </label>
          <input
            type="url"
            value={profile.website_url}
            onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="https://yourwebsite.com"
          />
        </div>

        {/* Privacy Setting */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <input
            type="checkbox"
            id="is_public"
            checked={profile.is_public}
            onChange={(e) => setProfile({ ...profile, is_public: e.target.checked })}
            className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="is_public" className="text-sm font-medium cursor-pointer">
            Make my profile public
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
          {onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
