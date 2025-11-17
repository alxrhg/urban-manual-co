"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  User,
  Settings,
  Heart,
  Check,
  Map,
  LogOut,
  Bookmark,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Drawer } from "@/components/ui/Drawer";
import { SavedPlacesDrawer } from "@/components/SavedPlacesDrawer";
import { VisitedPlacesDrawer } from "@/components/VisitedPlacesDrawer";
import { TripsDrawer } from "@/components/TripsDrawer";
import { SettingsDrawer } from "@/components/SettingsDrawer";

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat?: () => void;
}

export function AccountDrawer({
  isOpen,
  onClose,
  onOpenChat,
}: AccountDrawerProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isSavedPlacesOpen, setIsSavedPlacesOpen] = useState(false);
  const [isVisitedPlacesOpen, setIsVisitedPlacesOpen] = useState(false);
  const [isTripsOpen, setIsTripsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Fetch user profile and avatar
  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) {
        setAvatarUrl(null);
        setUsername(null);
        return;
      }

      try {
        const supabaseClient = createClient();
        // Try profiles table first, then user_profiles
        const { data: profileData, error: profileError } = await supabaseClient
          .from("profiles")
          .select("avatar_url, username")
          .eq("id", user.id)
          .maybeSingle();

        if (!profileError && profileData) {
          setAvatarUrl(profileData.avatar_url || null);
          setUsername(profileData.username || null);
        } else {
          // Try user_profiles table
          const { data: userProfileData, error: userProfileError } = await supabaseClient
            .from("user_profiles")
            .select("username")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!userProfileError && userProfileData?.username) {
            setUsername(userProfileData.username);
          } else {
            setUsername(null);
          }
          setAvatarUrl(null);
        }
      } catch {
        setAvatarUrl(null);
        setUsername(null);
      }
    }

    if (isOpen && user) {
      fetchProfile();
    }
  }, [user, isOpen]);

  const handleSignOut = async () => {
    await signOut();
    onClose();
    router.push("/");
  };

  const handleNavigate = (path: string) => {
    onClose();
    setTimeout(() => {
      router.push(path);
    }, 200);
  };

  const displayUsername = username || user?.email?.split("@")[0] || "user";

  const runAfterClose = (callback: () => void) => {
    onClose();
    setTimeout(callback, 200);
  };

  // Primary actions - navigation to main sections
  const primaryActions = [
    {
      label: "Profile",
      icon: User,
      action: () => handleNavigate("/account?tab=profile"),
    },
    {
      label: "Trips",
      icon: Map,
      action: () => handleNavigate("/trips"),
    },
    {
      label: "Saved",
      icon: Heart,
      action: () => handleNavigate("/account?tab=saved"),
    },
    {
      label: "Visited",
      icon: Check,
      action: () => handleNavigate("/account?tab=visited"),
    },
    {
      label: "Collections",
      icon: Bookmark,
      action: () => handleNavigate("/account?tab=collections"),
    },
  ];

  const accountContent = (
    <div className="p-4">
      {user ? (
        <div className="space-y-6">
          {/* Header - Avatar, Username, Email */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200/50 dark:border-gray-800/50">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-gray-700">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile"
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              ) : (
                <User className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {displayUsername}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="space-y-1">
            {primaryActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.action}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all duration-180 ease-out group"
                >
                  <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0 stroke-[1.5]" />
                  <span className="flex-1 text-left">{action.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-180 ease-out" />
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-200/50 dark:border-gray-800/50 space-y-1">
            <button
              type="button"
              onClick={() => runAfterClose(() => setIsSettingsOpen(true))}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all duration-180 ease-out group"
            >
              <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0 stroke-[1.5]" />
              <span className="flex-1 text-left">Account Settings</span>
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-180 ease-out" />
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-180 ease-out"
            >
              <LogOut className="w-4 h-4 flex-shrink-0 stroke-[1.5]" />
              <span className="flex-1 text-left">Sign Out</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 space-y-4">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
              Join The Urban Manual
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-light">
              Sign in to save places, build trips, and sync your travel profile.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleNavigate("/auth/login")}
            className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
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
        headerContent={
          <div className="flex items-center justify-between w-full">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">Account</h2>
          </div>
        }
        mobileVariant="bottom"
        desktopSpacing="right-4 top-4 bottom-4"
        desktopWidth="320px"
        position="right"
        style="glassy"
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
      <TripsDrawer isOpen={isTripsOpen} onClose={() => setIsTripsOpen(false)} />
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
