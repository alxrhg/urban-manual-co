'use client';

import React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Pencil } from "lucide-react";
import Image from "next/image";
import { PageLoader } from "@/components/LoadingStates";
import type { User } from "@supabase/supabase-js";
import { toast } from "@/lib/toast";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface ProfileData {
  display_name: string;
  email: string;
  phone: string;
  address: string;
  avatar_url: string | null;
  role: string;
}

export default function Account() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    display_name: '',
    email: '',
    phone: '',
    address: '',
    avatar_url: null,
    role: 'Member',
  });

  // Check authentication
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setAuthChecked(true);
        setIsLoadingData(false);
        return;
      }

      setUser(session.user);
      setAuthChecked(true);
    }

    checkAuth();
  }, []);

  // Load profile data
  const loadProfile = useCallback(async () => {
    if (!user) {
      setIsLoadingData(false);
      return;
    }

    try {
      setIsLoadingData(true);
      const response = await fetch('/api/account/profile');

      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setProfile({
            display_name: data.profile.display_name || user.user_metadata?.full_name || '',
            email: user.email || '',
            phone: data.profile.phone || '',
            address: data.profile.address || '',
            avatar_url: data.profile.avatar_url || user.user_metadata?.avatar_url || null,
            role: user.user_metadata?.role === 'admin' ? 'Administrator' : 'Member',
          });
        } else {
          // Set defaults from user metadata
          setProfile({
            display_name: user.user_metadata?.full_name || '',
            email: user.email || '',
            phone: '',
            address: '',
            avatar_url: user.user_metadata?.avatar_url || null,
            role: user.user_metadata?.role === 'admin' ? 'Administrator' : 'Member',
          });
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: profile.display_name,
          phone: profile.phone,
          address: profile.address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // Show loading
  if (!authChecked || isLoadingData) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <PageLoader />
      </main>
    );
  }

  // Show sign in screen
  if (!user) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-light mb-8">Account</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Sign in to save places, track visits, and create collections
            </p>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-full hover:opacity-80 transition-opacity"
            >
              Sign In
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-6 md:px-10 py-20 min-h-screen">
      <div className="w-full max-w-2xl">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-black dark:text-white">Account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your personal information and preferences
          </p>
        </div>

        {/* Divider */}
        <div className="border-b border-gray-200 dark:border-gray-800 mb-6" />

        {/* Profile Card */}
        <div className="flex items-center gap-4 mb-6">
          {/* Avatar with Edit Button */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name || 'Profile'}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600 text-xl font-medium">
                  {profile.display_name?.charAt(0)?.toUpperCase() || profile.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            {/* Edit Button Overlay */}
            <button
              className="absolute -bottom-1 -left-1 w-6 h-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              aria-label="Edit avatar"
            >
              <Pencil className="w-3 h-3 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h2 className="text-base font-semibold text-black dark:text-white">
              {profile.display_name || 'User'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {profile.email}
            </p>
            {/* Role Badge */}
            <span className="inline-block mt-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
              {profile.role}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-b border-gray-200 dark:border-gray-800 mb-6" />

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Full Name
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              This name will be shown to your contacts.
            </p>
            <input
              type="text"
              value={profile.display_name}
              onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Email Address
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Make sure to use an active email address you check regularly
            </p>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Phone Number
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Your phone number will be visible to your contacts
            </p>
            <div className="flex gap-2">
              {/* Country Code Selector */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                <span className="text-base">🇺🇸</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">+1</span>
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {/* Phone Input */}
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                placeholder="(555) 456-7894"
              />
            </div>
          </div>

          {/* Full Address */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Full Address
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Provide your current residential address.
            </p>
            <textarea
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent resize-none"
              placeholder="742 Maple Ridge Lane&#10;Fairfield, OH 45014"
            />
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-full hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
