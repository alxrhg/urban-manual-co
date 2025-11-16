'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { User, Settings, Heart, Check, Map, LogOut, ExternalLink, Camera, Loader2, X, Database } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { Drawer } from '@/components/ui/Drawer';
import { SavedPlacesDrawer } from '@/components/SavedPlacesDrawer';
import { VisitedPlacesDrawer } from '@/components/VisitedPlacesDrawer';
import { TripsDrawer } from '@/components/TripsDrawer';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { useToast } from '@/hooks/useToast';

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountDrawer({ isOpen, onClose }: AccountDrawerProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const toast = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSavedPlacesOpen, setIsSavedPlacesOpen] = useState(false);
  const [isVisitedPlacesOpen, setIsVisitedPlacesOpen] = useState(false);
  const [isTripsOpen, setIsTripsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nextTrip, setNextTrip] = useState<{ title: string; destination: string | null; start_date: string | null } | null>(null);
  const [nextTripCountdown, setNextTripCountdown] = useState<string | null>(null);
  const [nextTripLoading, setNextTripLoading] = useState(false);

  // Fetch user profile and avatar
  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) {
        setAvatarUrl(null);
        return;
      }

      try {
        const supabaseClient = createClient();
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data?.avatar_url) {
          setAvatarUrl(data.avatar_url);
        } else {
          setAvatarUrl(null);
        }
      } catch {
        setAvatarUrl(null);
      }
    }

    if (isOpen && user) {
      fetchProfile();
    }
  }, [user, isOpen]);

    // Determine admin role
  useEffect(() => {
    const role = (user?.app_metadata as Record<string, any> | undefined)?.role;
    setIsAdmin(role === 'admin');
  }, [user]);

    useEffect(() => {
      if (!isOpen || !user) {
        setNextTrip(null);
        setNextTripCountdown(null);
        return;
      }

      let active = true;
      setNextTripLoading(true);

      (async () => {
        try {
          const supabaseClient = createClient();
          const { data: trip } = await supabaseClient
            .from('trips')
            .select('id,title,destination,start_date,status')
            .eq('user_id', user.id)
            .neq('status', 'completed')
            .order('start_date', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!active) return;

          if (!trip) {
            setNextTrip(null);
            setNextTripCountdown(null);
            return;
          }

          setNextTrip(trip);

          if (trip.start_date) {
            const diffMs = new Date(trip.start_date).getTime() - Date.now();
            const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            let text: string | null = null;
            if (Number.isFinite(days)) {
              if (days > 0) text = `${days} day${days === 1 ? '' : 's'} away`;
              else if (days === 0) text = 'Starts today';
              else text = 'In progress';
            }
            setNextTripCountdown(text);
          } else {
            setNextTripCountdown(null);
          }
        } catch (error) {
          console.error('Error loading next trip:', error);
          setNextTrip(null);
          setNextTripCountdown(null);
        } finally {
          if (active) {
            setNextTripLoading(false);
          }
        }
      })();

      return () => {
        active = false;
      };
    }, [isOpen, user]);


  const handleSignOut = async () => {
    await signOut();
    onClose();
    router.push('/');
  };

  const handleNavigate = (path: string) => {
    onClose();
    setTimeout(() => {
      router.push(path);
    }, 300);
  };

  const handleAvatarClick = () => {
    setShowAvatarUpload(true);
  };

  const handleAvatarFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-profile-picture', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setAvatarUrl(data.url);
      
      // Update profile in database
      const supabaseClient = createClient();
      await supabaseClient
        .from('profiles')
        .upsert({
          id: user?.id,
          avatar_url: data.url,
        });

      toast.success('Profile picture updated');
      setShowAvatarUpload(false);
      setAvatarPreview(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const accountContent = (
    <div className="px-6 py-6">
      {user ? (
        <div className="space-y-6">
              {/* User Profile Section */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleAvatarClick}
                  className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center group cursor-pointer hover:opacity-80 transition-opacity"
                  aria-label="Change profile picture"
                >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Profile"
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </button>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-black dark:text-white">
                    {user.email?.split('@')[0] || 'User'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                  {isAdmin && (
                    <span className="inline-block mt-1 text-xs bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 rounded-full font-medium">
                      Admin
                    </span>
                  )}
                </div>
              </div>

                {/* Countdown Widget */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
                  <div className="text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-2">
                    Next trip
                  </div>
                  {nextTripLoading ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Checking your itineraries…</p>
                  ) : nextTrip ? (
                    <>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{nextTrip.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {nextTrip.destination || 'Destination TBD'}
                      </p>
                      {nextTripCountdown && (
                        <p className="text-xs text-gray-900 dark:text-white mt-3">{nextTripCountdown}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">No upcoming trips yet.</p>
                  )}
                  <button
                    onClick={() => {
                      onClose();
                      setTimeout(() => setIsTripsOpen(true), 300);
                    }}
                    className="mt-4 inline-flex items-center justify-center w-full px-4 py-2 text-xs font-medium text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Open Trip Studio
                  </button>
                </div>

                {/* Quick Links */}
              <div className="space-y-2">
                <button
                  onClick={() => handleNavigate('/account')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">View Full Account</span>
                  <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
                </button>

                <button
                  onClick={() => {
                    onClose();
                    setTimeout(() => setIsSavedPlacesOpen(true), 300);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <Heart className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Saved Places</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    setTimeout(() => setIsVisitedPlacesOpen(true), 300);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <Check className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Visited Places</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    setTimeout(() => setIsTripsOpen(true), 300);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <Map className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Trips</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    setTimeout(() => setIsSettingsOpen(true), 300);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Settings</span>
                </button>

                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleNavigate('/admin')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Admin Panel</span>
                    </button>
                    <button
                      onClick={() => handleNavigate('/payload')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <Database className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Payload CMS</span>
                      <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
                    </button>
                  </>
                )}
              </div>

              {/* Sign Out Button */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                >
                  <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">You're not signed in</p>
              <button
                onClick={() => handleNavigate('/auth/login')}
                className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity text-sm font-medium"
              >
                Sign In
              </button>
            </div>
          )}
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="Account"
      >
        {accountContent}
      </Drawer>
      <SavedPlacesDrawer
        isOpen={isSavedPlacesOpen}
        onClose={() => setIsSavedPlacesOpen(false)}
      />
      <VisitedPlacesDrawer
        isOpen={isVisitedPlacesOpen}
        onClose={() => setIsVisitedPlacesOpen(false)}
      />
      <TripsDrawer
        isOpen={isTripsOpen}
        onClose={() => setIsTripsOpen(false)}
      />
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Avatar Upload Modal */}
      {showAvatarUpload && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 transition-opacity"
            onClick={() => {
              setShowAvatarUpload(false);
              setAvatarPreview(null);
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div
              className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Change Profile Picture</h3>
                <button
                  onClick={() => {
                    setShowAvatarUpload(false);
                    setAvatarPreview(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Preview */}
                {avatarPreview && (
                  <div className="flex justify-center">
                    <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <Image
                        src={avatarPreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    </div>
                  </div>
                )}

                {/* File Input */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileSelect}
                    className="hidden"
                    id="avatar-upload-input"
                  />
                  <label
                    htmlFor="avatar-upload-input"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer text-sm font-medium"
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        Choose Photo
                      </>
                    )}
                  </label>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Max size: 2MB
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

