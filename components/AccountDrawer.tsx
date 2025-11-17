"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  User,
  Settings,
  Heart,
  Check,
  Map,
  LogOut,
  ExternalLink,
  Camera,
  Loader2,
  X,
  Database,
  MessageSquare,
  MapPinned,
  Globe2,
  Bookmark,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Drawer } from "@/components/ui/Drawer";
import { SavedPlacesDrawer } from "@/components/SavedPlacesDrawer";
import { VisitedPlacesDrawer } from "@/components/VisitedPlacesDrawer";
import { TripsDrawer } from "@/components/TripsDrawer";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { useToast } from "@/hooks/useToast";

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
  const toast = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSavedPlacesOpen, setIsSavedPlacesOpen] = useState(false);
  const [isVisitedPlacesOpen, setIsVisitedPlacesOpen] = useState(false);
  const [isTripsOpen, setIsTripsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [stats, setStats] = useState({
    saved: 0,
    visited: 0,
    trips: 0,
    collections: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Determine admin role
  useEffect(() => {
    const role = (user?.app_metadata as Record<string, any> | undefined)?.role;
    setIsAdmin(role === "admin");
  }, [user]);

  // Lightweight stats for quick snapshot
  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      if (!isOpen || !user?.id) {
        if (!user?.id && isMounted) {
          setStats({
            saved: 0,
            visited: 0,
            trips: 0,
            collections: 0,
          });
        }
        return;
      }

      setStatsLoading(true);
      try {
        const supabaseClient = createClient();
        const [
          { count: savedCount },
          { count: visitedCount },
          { count: tripsCount },
          { count: collectionsCount },
        ] = await Promise.all([
          supabaseClient
            .from("saved_places")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabaseClient
            .from("visited_places")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabaseClient
            .from("trips")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabaseClient
            .from("collections")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        if (!isMounted) return;
        setStats({
          saved: savedCount ?? 0,
          visited: visitedCount ?? 0,
          trips: tripsCount ?? 0,
          collections: collectionsCount ?? 0,
        });
      } catch {
        if (!isMounted) return;
        setStats({
          saved: 0,
          visited: 0,
          trips: 0,
          collections: 0,
        });
      } finally {
        if (isMounted) {
          setStatsLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  const handleSignOut = async () => {
    await signOut();
    onClose();
    router.push("/");
  };

  const handleNavigate = (path: string) => {
    runAfterClose(() => {
      router.push(path);
    });
  };

  const handleAvatarClick = () => {
    setShowAvatarUpload(true);
  };

  const handleAvatarFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = e => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-profile-picture", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      setAvatarUrl(data.url);

      // Update profile in database
      const supabaseClient = createClient();
      await supabaseClient.from("profiles").upsert({
        id: user?.id,
        avatar_url: data.url,
      });

      toast.success("Profile picture updated");
      setShowAvatarUpload(false);
      setAvatarPreview(null);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image"
      );
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const displayName =
    (user?.user_metadata as Record<string, any> | undefined)?.full_name ||
    user?.email?.split("@")[0] ||
    "Explorer";
  
  const displayUsername = username || user?.email?.split("@")[0] || "user";

  const runAfterClose = (callback: () => void) => {
    onClose();
    setTimeout(callback, 300);
  };

  const travelToolkit = [
    {
      label: "Saved Places",
      description: "Organize your wishlist",
      icon: Heart,
      action: () => runAfterClose(() => setIsSavedPlacesOpen(true)),
    },
    {
      label: "Visited Places",
      description: "Log every check-in",
      icon: Check,
      action: () => runAfterClose(() => setIsVisitedPlacesOpen(true)),
    },
    {
      label: "Trips",
      description: "Plan upcoming adventures",
      icon: Map,
      action: () => runAfterClose(() => setIsTripsOpen(true)),
    },
    {
      label: "Collections",
      description: "Craft themed shortlists",
      icon: Bookmark,
      action: () => handleNavigate("/account?tab=collections"),
    },
  ];

  const exploreNavigation = [
    {
      label: "City Directory",
      description: "Browse every curated city",
      icon: Globe2,
      action: () => handleNavigate("/cities"),
    },
    {
      label: "Homepage Map View",
      description: "Jump straight to the interactive map on home",
      icon: MapPinned,
      action: () => handleNavigate("/?view=map"),
    },
  ];

  if (user) {
    exploreNavigation.push({
      label: "Concierge Chat",
      description: "Ask for tailor-made plans from AI",
      icon: MessageSquare,
      action: () => runAfterClose(() => onOpenChat?.()),
    });
  }

  const accountLinks = [
    {
      label: "View Full Account",
      description: "Deep stats, trips, privacy controls",
      icon: User,
      action: () => handleNavigate("/account"),
    },
    {
      label: "Settings & Preferences",
      description: "Notifications, privacy, personalization",
      icon: Settings,
      action: () => runAfterClose(() => setIsSettingsOpen(true)),
    },
  ];

  const adminLinks = [
    {
      label: "Admin Panel",
      description: "Approve curation & manage data",
      icon: ShieldCheck,
      action: () => handleNavigate("/admin"),
    },
    {
      label: "Payload CMS",
      description: "Structured content workspace",
      icon: Database,
      action: () => handleNavigate("/payload"),
    },
  ];

  const statCards = [
    { label: "Saved", value: stats.saved, caption: "Wishlist" },
    { label: "Visited", value: stats.visited, caption: "Check-ins" },
    { label: "Trips", value: stats.trips, caption: "Plans" },
    { label: "Collections", value: stats.collections, caption: "Lists" },
  ];

  const accountContent = (
    <div className="px-6 py-8">
      {user ? (
        <div className="space-y-8">
          {/* Profile Section - Card with soft elevation */}
          <section className="rounded-xl bg-white dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/50 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={handleAvatarClick}
                className="relative w-[72px] h-[72px] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center group cursor-pointer hover:opacity-90 transition-all duration-180 ease-out border border-gray-200 dark:border-gray-700 flex-shrink-0"
                aria-label="Change profile picture"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Profile"
                    fill
                    className="object-cover"
                    sizes="72px"
                  />
                ) : (
                  <User className="w-9 h-9 text-gray-400 dark:text-gray-500" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-180 ease-out">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-900 dark:text-white truncate mb-1">
                  {displayUsername}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleNavigate("/account")}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-all duration-180 ease-out"
              >
                Open full account
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => runAfterClose(() => setIsSettingsOpen(true))}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-180 ease-out"
              >
                <Settings className="w-4 h-4" />
                Preferences
              </button>
            </div>
          </section>

          {/* Travel Snapshot - Compact Grid */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">
              Travel Snapshot
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statCards.map(card => (
                <div 
                  key={card.label} 
                  className="rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-800/50 p-4 hover:bg-gray-100 dark:hover:bg-gray-900 transition-all duration-180 ease-out"
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-normal">
                    {card.label}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    {statsLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    ) : (
                      <span className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                        {card.value}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 font-light">
                    {card.caption}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Travel Toolkit - Card List */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">
              Travel Toolkit
            </h2>
            <div className="space-y-3">
              {travelToolkit.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={item.action}
                    className="w-full flex items-center gap-4 rounded-xl border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-950 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-180 ease-out group"
                  >
                    <span className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 flex-shrink-0 group-hover:bg-gray-200 dark:group-hover:bg-gray-800 transition-all duration-180 ease-out">
                      <Icon className="w-4 h-4 stroke-[1.5]" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-light">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-180 ease-out" />
                  </button>
                );
              })}
            </div>
          </section>

          {/* Account & Support - Clean List */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">
              Account & Support
            </h2>
            <div className="space-y-1">
              {accountLinks.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      onClick={item.action}
                      className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all duration-180 ease-out group"
                    >
                      <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 stroke-[1.5]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-light mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-180 ease-out" />
                    </button>
                    {index < accountLinks.length - 1 && (
                      <div className="h-px bg-gray-200/50 dark:bg-gray-800/50 mx-4" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Sign Out - Isolated at bottom */}
          <section className="pt-4 border-t border-gray-200/50 dark:border-gray-800/50">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-180 ease-out"
            >
              <LogOut className="w-4 h-4 stroke-[1.5]" />
              Sign Out
            </button>
          </section>
        </div>
      ) : (
        <div className="text-center py-12 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
              Join The Urban Manual
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-light max-w-sm mx-auto">
              Save places, build trips, and sync your travel profile across every device.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleNavigate("/auth/login")}
            className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
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
            <h2 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">Account</h2>
          </div>
        }
        mobileVariant="bottom"
        desktopSpacing="right-4 top-4 bottom-4"
        desktopWidth="440px"
        position="right"
        style="solid"
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
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Change Profile Picture
                </h3>
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
