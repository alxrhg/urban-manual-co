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
        return;
      }

      try {
        const supabaseClient = createClient();
        const { data, error } = await supabaseClient
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
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
    <div className="px-4 sm:px-6 py-6">
      {user ? (
        <div className="space-y-8">
          <section className="rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-black text-white p-6 shadow-xl border border-white/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                onClick={handleAvatarClick}
                className="relative w-20 h-20 rounded-3xl overflow-hidden bg-white/10 flex items-center justify-center group cursor-pointer hover:opacity-90 transition-opacity border border-white/20"
                aria-label="Change profile picture"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Profile"
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <User className="w-10 h-10 text-white/70" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </button>
              <div className="flex-1 space-y-1">
                <p className="text-xs uppercase tracking-wide text-white/60">
                  Signed in as
                </p>
                <h3 className="text-xl font-semibold">{displayName}</h3>
                <p className="text-sm text-white/70">{user.email}</p>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full bg-white/15 text-white mt-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin
                  </span>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleNavigate("/account")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/30 bg-white/10 text-sm font-medium hover:bg-white/20 transition-colors"
              >
                Open full account
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => runAfterClose(() => setIsSettingsOpen(true))}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/5 text-sm font-medium hover:bg-white/15 transition-colors"
              >
                Preferences
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                Travel snapshot
              </p>
              {statsLoading && (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {statCards.map(card => (
                <div
                  key={card.label}
                  className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4"
                >
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                    {card.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {card.value}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {card.caption}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-3">
              Travel toolkit
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {travelToolkit.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={item.action}
                    className="flex items-start gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/70 p-4 text-left hover:border-gray-900 dark:hover:border-white transition-colors"
                  >
                    <span className="p-2 rounded-xl bg-gray-100 dark:bg-gray-900/60 text-gray-900 dark:text-white">
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-3">
              Explore Urban Manual
            </p>
            <div className="space-y-2">
              {exploreNavigation.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/70 px-4 py-3 text-left hover:border-gray-900 dark:hover:border-white transition-colors"
                  >
                    <span className="p-2 rounded-xl bg-gray-100 dark:bg-gray-900/60 text-gray-900 dark:text-white">
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-3">
              Account & Support
            </p>
            <div className="space-y-2">
              {accountLinks.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/70 px-4 py-3 text-left hover:border-gray-900 dark:hover:border-white transition-colors"
                  >
                    <span className="p-2 rounded-xl bg-gray-100 dark:bg-gray-900/60 text-gray-900 dark:text-white">
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.description}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </button>
                );
              })}
            </div>
          </section>

          {isAdmin && (
            <section>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-3">
                Admin Tools
              </p>
              <div className="space-y-2">
                {adminLinks.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.label}
                      onClick={item.action}
                      className="w-full flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/70 px-4 py-3 text-left hover:border-gray-900 dark:hover:border-white transition-colors"
                    >
                      <span className="p-2 rounded-xl bg-gray-100 dark:bg-gray-900/60 text-gray-900 dark:text-white">
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {item.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.description}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </section>
        </div>
      ) : (
        <div className="text-center py-10 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Join The Urban Manual
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Save places, build trips, and sync your travel profile across every
            device.
          </p>
          <button
            type="button"
            onClick={() => handleNavigate("/auth/login")}
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
