'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { User, Settings, Heart, Check, Map, LogOut, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { Drawer } from '@/components/ui/Drawer';
import { SavedPlacesDrawer } from '@/components/SavedPlacesDrawer';
import { VisitedPlacesDrawer } from '@/components/VisitedPlacesDrawer';
import { TripsDrawer } from '@/components/TripsDrawer';
import { SettingsDrawer } from '@/components/SettingsDrawer';

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountDrawer({ isOpen, onClose }: AccountDrawerProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSavedPlacesOpen, setIsSavedPlacesOpen] = useState(false);
  const [isVisitedPlacesOpen, setIsVisitedPlacesOpen] = useState(false);
  const [isTripsOpen, setIsTripsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  const accountContent = (
    <div className="px-6 py-6">
      {user ? (
        <div className="space-y-6">
              {/* User Profile Section */}
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <Image
                      src={avatarUrl}
                      alt="Profile"
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-black dark:text-white">
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
                  <button
                    onClick={() => handleNavigate('/admin')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Admin Panel</span>
                  </button>
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
    </>
  );
}

