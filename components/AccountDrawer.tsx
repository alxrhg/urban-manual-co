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
  Gift,
  CreditCard,
  LifeBuoy,
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

  const username =
    (user?.user_metadata as Record<string, any> | undefined)?.username ||
    user?.email?.split("@")[0] ||
    "urban-explorer";

  const runAfterClose = (callback: () => void) => {
    onClose();
    setTimeout(callback, 300);
  };

  const handleInviteFriends = async () => {
    const inviteUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/?ref=${user?.id ?? ""}`
        : "https://urbanmanual.com";

    const canShare =
      typeof navigator !== "undefined" && typeof navigator.share === "function";

    if (canShare) {
      try {
        await navigator.share({
          title: "Explore Urban Manual",
          text: "Discover curated city guides with me on Urban Manual.",
          url: inviteUrl,
        });
        toast.success("Invite sent");
        return;
      } catch (error) {
        if ((error as DOMException).name === "AbortError") {
          return;
        }
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        toast.success("Invite link copied");
        return;
      } catch {
        // fall through to error toast
      }
    }

    toast.error("Unable to share invite link");
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

  const lifestyleCards = [
    {
      label: "Standard",
      description: "Your plan",
      icon: CreditCard,
      actionLabel: "Manage",
      onClick: () => handleNavigate("/account"),
    },
    {
      label: "Invite friends",
      description: "Earn $80 or more",
      icon: Gift,
      actionLabel: "Share",
      onClick: handleInviteFriends,
    },
  ];

  const essentials = [
    {
      label: "Help Center",
      description: "Questions, tips & policies",
      icon: LifeBuoy,
      action: () => handleNavigate("/account"),
    },
    ...accountLinks,
  ];

  const accountContent = (
    <div className="px-4 sm:px-6 py-6">
      {user ? (
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[36px] border border-white/15 bg-gradient-to-br from-[#12141F] via-[#161B2E] to-[#05060C] px-6 py-8 text-white shadow-2xl">
            <div className="absolute inset-0 opacity-60" aria-hidden="true">
              <div className="absolute -top-10 right-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-16 left-4 h-48 w-48 rounded-full bg-[#5F7DFF]/20 blur-3xl" />
            </div>
            <div className="relative flex flex-col items-center text-center gap-6">
              <button
                onClick={handleAvatarClick}
                className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/30 bg-white/10 p-1 transition hover:border-white/60"
                aria-label="Change profile picture"
              >
                <div className="relative h-full w-full rounded-[24px] overflow-hidden bg-white/10">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Profile"
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User className="h-12 w-12 text-white/70" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </div>
              </button>

              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">Account</p>
                <h3 className="text-2xl font-semibold">{displayName}</h3>
                <p className="text-sm text-white/70">@{username}</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-white/80">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1">
                    {user.email}
                  </span>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Admin
                    </span>
                  )}
                </div>
              </div>

              <div className="flex w-full flex-col gap-3">
                <button
                  type="button"
                  onClick={() => handleNavigate("/account")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-lg shadow-black/30"
                >
                  Open full account
                  <ExternalLink className="h-4 w-4" />
                </button>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => runAfterClose(() => setIsSettingsOpen(true))}
                    className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
                  >
                    Preferences
                    <Settings className="h-4 w-4" />
                  </button>
                  {onOpenChat && (
                    <button
                      type="button"
                      onClick={() => runAfterClose(() => onOpenChat())}
                      className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
                    >
                      Concierge chat
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleNavigate("/account")}
                className="absolute top-6 right-6 hidden rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:bg-white/20 sm:inline-flex"
              >
                Upgrade
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {lifestyleCards.map(card => {
              const Icon = card.icon;
              return (
                <button
                  key={card.label}
                  onClick={card.onClick}
                  className="group flex w-full items-center justify-between gap-4 rounded-[28px] border border-gray-200 bg-white/90 px-5 py-4 text-left shadow-sm transition hover:shadow-lg dark:border-gray-800 dark:bg-gray-950/80"
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500">{card.description}</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">{card.label}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white">
                    {card.actionLabel}
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-white dark:bg-white/10">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </section>

          <section className="rounded-[32px] border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">Travel snapshot</p>
              {statsLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {statCards.map(card => (
                <div
                  key={card.label}
                  className="rounded-2xl bg-gray-50 p-4 text-left shadow-inner dark:bg-gray-900/60"
                >
                  <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                    {statsLoading ? "—" : card.value}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{card.caption}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">Travel toolkit</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {travelToolkit.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={item.action}
                    className="flex items-center gap-4 rounded-[28px] border border-gray-200 bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-gray-950/70"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-white dark:bg-white/10">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-base font-semibold text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">Explore more</p>
            <div className="space-y-3">
              {exploreNavigation.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={item.action}
                    className="flex w-full items-center gap-4 rounded-[24px] border border-gray-200 bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-gray-950/70"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">Account & Support</p>
            <div className="space-y-3">
              {essentials.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={item.action}
                    className="flex w-full items-center gap-4 rounded-[24px] border border-gray-200 bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-gray-950/70"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {isAdmin && (
            <section>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">Admin tools</p>
              <div className="space-y-3">
                {adminLinks.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.label}
                      onClick={item.action}
                      className="flex w-full items-center gap-4 rounded-[24px] border border-gray-200 bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-gray-950/70"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-[28px] border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-gray-950/70 dark:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-[36px] border border-gray-200 bg-gradient-to-br from-gray-900 via-gray-800 to-black px-8 py-10 text-center text-white shadow-2xl dark:border-gray-800">
          <h3 className="text-2xl font-semibold">Sign in to unlock Urban Manual</h3>
          <p className="mt-2 text-sm text-white/70">
            Save favorite places, log trips, and access concierge chat instantly.
          </p>
          <button
            type="button"
            onClick={() => handleNavigate("/auth/login")}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-gray-900"
          >
            <User className="h-4 w-4" />
            Sign in
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
