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
  LifeBuoy,
  ChevronRight,
  Mail,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

  type DrawerLink = {
    label: string;
    description?: string;
    icon: LucideIcon;
    action: () => void;
    variant?: "default" | "destructive";
  };

  const libraryLinks: DrawerLink[] = [
    {
      label: "Saved places",
      description: "Wishlist & future research",
      icon: Heart,
      action: () => runAfterClose(() => setIsSavedPlacesOpen(true)),
    },
    {
      label: "Visited places",
      description: "Log every check-in",
      icon: Check,
      action: () => runAfterClose(() => setIsVisitedPlacesOpen(true)),
    },
    {
      label: "Trips",
      description: "Upcoming and archived itineraries",
      icon: Map,
      action: () => runAfterClose(() => setIsTripsOpen(true)),
    },
    {
      label: "Collections",
      description: "Curated lists by theme",
      icon: Bookmark,
      action: () => handleNavigate("/account?tab=collections"),
    },
  ];

  const exploreLinks: DrawerLink[] = [
    {
      label: "City directory",
      description: "Browse every curated city",
      icon: Globe2,
      action: () => handleNavigate("/cities"),
    },
    {
      label: "Map & atlas",
      description: "Jump straight to the interactive map",
      icon: MapPinned,
      action: () => handleNavigate("/?view=map"),
    },
  ];

  if (user && onOpenChat) {
    exploreLinks.push({
      label: "Concierge chat",
      description: "Ask for bespoke recommendations",
      icon: MessageSquare,
      action: () => runAfterClose(() => onOpenChat()),
    });
  }

  const supportLinks: DrawerLink[] = [
    {
      label: "Help center",
      description: "Guides, policies & onboarding",
      icon: LifeBuoy,
      action: () => handleNavigate("/account?tab=help"),
    },
    {
      label: "Contact support",
      description: "Email the editorial team",
      icon: Mail,
      action: () => {
        if (typeof window !== "undefined") {
          window.location.href = "mailto:help@urbanmanual.com";
        }
      },
    },
  ];

  const systemLinks: DrawerLink[] = [
    {
      label: "Account overview",
      description: "Billing, exports, security",
      icon: User,
      action: () => handleNavigate("/account"),
    },
    {
      label: "Settings & privacy",
      description: "Notifications and personalization",
      icon: Settings,
      action: () => runAfterClose(() => setIsSettingsOpen(true)),
    },
    {
      label: "Sign out",
      description: "End this session",
      icon: LogOut,
      action: handleSignOut,
      variant: "destructive",
    },
  ];

  const adminLinks: DrawerLink[] = [
    {
      label: "Admin panel",
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

  const SectionHeading = ({ children }: { children: ReactNode }) => (
    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
      {children}
    </p>
  );

  const ListGroup = ({ children }: { children: ReactNode }) => (
    <div className="divide-y divide-gray-200 rounded-3xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
      {children}
    </div>
  );

  const ListRow = ({
    icon: Icon,
    label,
    description,
    action,
    trailing,
    variant = "default",
  }: DrawerLink & { trailing?: ReactNode }) => {
    const baseText =
      variant === "destructive"
        ? "text-red-600 dark:text-red-400"
        : "text-gray-900 dark:text-white";

    const iconStyles =
      variant === "destructive"
        ? "border-red-200 text-red-600 dark:border-red-900/60 dark:text-red-400"
        : "border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-300";

    return (
      <button
        type="button"
        onClick={action}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
      >
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${iconStyles}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className={`text-sm font-medium ${baseText}`}>{label}</p>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
        {trailing ?? <ChevronRight className="h-4 w-4 text-gray-400" />}
      </button>
    );
  };

  const accountContent = (
    <div className="px-4 sm:px-6 py-6 text-gray-900 dark:text-white">
      {user ? (
        <div className="space-y-8">
          <section className="space-y-4">
            <SectionHeading>Profile</SectionHeading>
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-4">
                <button
                  onClick={handleAvatarClick}
                  className="relative h-16 w-16 rounded-2xl border border-gray-200 text-gray-500 transition hover:border-gray-300 dark:border-gray-800"
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
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <SectionHeading>Activity</SectionHeading>
              {statsLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            </div>
            <div className="rounded-3xl border border-gray-200 px-5 py-4 dark:border-gray-800">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                {statCards.map(card => (
                  <div key={card.label}>
                    <dt className="text-[11px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                      {card.label}
                    </dt>
                    <dd className="mt-1 text-2xl font-semibold">
                      {statsLoading ? "—" : card.value}
                    </dd>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{card.caption}</p>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeading>Workspace</SectionHeading>
            <ListGroup>
              {libraryLinks.map(link => (
                <ListRow key={link.label} {...link} />
              ))}
            </ListGroup>
          </section>

          <section className="space-y-3">
            <SectionHeading>Explore</SectionHeading>
            <ListGroup>
              {exploreLinks.map(link => (
                <ListRow
                  key={link.label}
                  {...link}
                  trailing={<ExternalLink className="h-4 w-4 text-gray-400" />}
                />
              ))}
            </ListGroup>
          </section>

          <section className="space-y-3">
            <SectionHeading>Support</SectionHeading>
            <ListGroup>
              {supportLinks.map(link => (
                <ListRow key={link.label} {...link} />
              ))}
            </ListGroup>
          </section>

          <section className="space-y-3">
            <SectionHeading>System</SectionHeading>
            <ListGroup>
              {systemLinks.map(link => (
                <ListRow key={link.label} {...link} />
              ))}
            </ListGroup>
          </section>

          {isAdmin && (
            <section className="space-y-3">
              <SectionHeading>Admin</SectionHeading>
              <ListGroup>
                {adminLinks.map(link => (
                  <ListRow
                    key={link.label}
                    {...link}
                    trailing={<ExternalLink className="h-4 w-4 text-gray-400" />}
                  />
                ))}
              </ListGroup>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-3xl border border-gray-200 px-8 py-10 text-center text-gray-900 dark:border-gray-800 dark:text-white">
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
