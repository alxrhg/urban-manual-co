"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
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

  const SectionHeading = ({ children }: { children: ReactNode }) => (
    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
      {children}
    </p>
  );

  const ListGroup = ({ children }: { children: ReactNode }) => (
    <div className="divide-y divide-gray-200 rounded-3xl border border-gray-200 bg-white/70 dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-950/40">
      {children}
    </div>
  );

  const accountContent = (
    <div className="px-4 sm:px-6 py-6">
      {user ? (
        <div className="space-y-8">
          <section className="rounded-3xl border border-gray-200 bg-white/70 p-6 text-gray-900 dark:border-gray-800 dark:bg-gray-950/60 dark:text-white">
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-4">
                <button
                  onClick={handleAvatarClick}
                  className="relative h-16 w-16 rounded-2xl border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"
                  aria-label="Change profile picture"
                >
                  <div className="relative h-full w-full overflow-hidden rounded-[18px]">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt="Profile"
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <User className="h-6 w-6" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                      <Camera className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </button>
                <div className="flex-1 space-y-2">
                  <SectionHeading>Account</SectionHeading>
                  <div>
                    <p className="text-xl font-semibold leading-tight">{displayName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">@{username}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                    <span className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 dark:border-gray-800">
                      {user.email}
                    </span>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-gray-900 dark:border-gray-700 dark:text-gray-100">
                        <ShieldCheck className="h-3.5 w-3.5" /> Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleNavigate("/account")}
                  className="inline-flex flex-1 min-w-[180px] items-center justify-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-black dark:bg-white dark:text-black"
                >
                  Open full account
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => runAfterClose(() => setIsSettingsOpen(true))}
                  className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-900"
                >
                  Preferences
                  <Settings className="h-4 w-4" />
                </button>
                {onOpenChat && (
                  <button
                    type="button"
                    onClick={() => runAfterClose(() => onOpenChat())}
                    className="inline-flex flex-1 min-w-[150px] items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-900"
                  >
                    Concierge chat
                    <MessageSquare className="h-4 w-4" />
                  </button>
                )}
              </div>

            </div>
          </section>

          <section className="space-y-3">
            <SectionHeading>Plan & invites</SectionHeading>
            <ListGroup>
              {lifestyleCards.map(card => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.label}
                    onClick={card.onClick}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-gray-900/40"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{card.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{card.description}</p>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                      {card.actionLabel}
                    </span>
                  </button>
                );
              })}
            </ListGroup>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <SectionHeading>Activity snapshot</SectionHeading>
              {statsLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {statCards.map(card => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                >
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                    {statsLoading ? "—" : card.value}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.caption}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeading>Travel toolkit</SectionHeading>
            <ListGroup>
              {travelToolkit.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={item.action}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-gray-900/40"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </ListGroup>
          </section>

          <section className="space-y-3">
            <SectionHeading>Explore more</SectionHeading>
            <ListGroup>
              {exploreNavigation.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={item.action}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-gray-900/40"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </button>
                );
              })}
            </ListGroup>
          </section>

          <section className="space-y-3">
            <SectionHeading>Account & Support</SectionHeading>
            <ListGroup>
              {essentials.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={item.action}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-gray-900/40"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </ListGroup>
          </section>

          {isAdmin && (
            <section className="space-y-3">
              <SectionHeading>Admin tools</SectionHeading>
              <ListGroup>
                {adminLinks.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.label}
                      onClick={item.action}
                      className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-gray-900/40"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                    </button>
                  );
                })}
              </ListGroup>
            </section>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-900"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-3xl border border-gray-200 bg-white/70 px-8 py-10 text-center text-gray-900 dark:border-gray-800 dark:bg-gray-950/60 dark:text-white">
          <SectionHeading>Account</SectionHeading>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Sign in to continue</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Save favorite places, log trips, and access concierge chat instantly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleNavigate("/auth/login")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-black dark:bg-white dark:text-black"
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
