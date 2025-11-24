"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useDrawer } from "@/contexts/DrawerContext";
import { useDrawerStore } from "@/lib/stores/drawer-store";
import {
  Settings,
  MapPin,
  Compass,
  LogOut,
  Bookmark,
  ChevronRight,
  Loader2,
  Trophy,
  Folder,
  ArrowLeft,
  Plus,
  Camera,
  Share2,
  Download,
  Trash2,
  Calendar,
  User,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Drawer } from "@/components/ui/Drawer";
import { DrawerHeader } from "@/components/ui/DrawerHeader";
import { DrawerSection } from "@/components/ui/DrawerSection";
import { DrawerActionBar } from "@/components/ui/DrawerActionBar";
import { TripViewDrawer } from "@/components/TripViewDrawer";
import type { Trip } from "@/types/trip";
import type { Collection } from "@/types/common";

interface UserStats {
  visited: number;
  saved: number;
  trips: number;
  cities: number;
  countries: number;
  explorationProgress: number;
}

type SubpageId =
  | "main_drawer"
  | "visited_subpage"
  | "saved_subpage"
  | "collections_subpage"
  | "trips_subpage"
  | "trip_details_subpage"
  | "achievements_subpage"
  | "settings_subpage";

// Profile Avatar Component
function ProfileAvatar({
  avatarUrl,
  displayUsername,
  size = "lg",
}: {
  avatarUrl: string | null;
  displayUsername: string;
  size?: "sm" | "lg";
}) {
  const sizeClasses = size === "lg" ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";

  return (
    <div
      className={`relative flex ${sizeClasses} items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 bg-gradient-to-br from-gray-100 to-gray-200 font-semibold text-gray-700 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900 dark:text-gray-200`}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt="Profile"
          fill
          className="object-cover"
          sizes={size === "lg" ? "64px" : "40px"}
        />
      ) : (
        displayUsername.charAt(0).toUpperCase()
      )}
    </div>
  );
}

// Stats Card Component
function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 dark:bg-gray-900 px-3 py-3">
      <Icon className="h-4 w-4 text-gray-400" />
      <span className="text-lg font-medium text-gray-900 dark:text-white">
        {value}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  );
}

// Navigation Item Component
function NavItem({
  icon: Icon,
  label,
  description,
  onClick,
  isDanger = false,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick: () => void;
  isDanger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
        isDanger
          ? "hover:bg-red-50 dark:hover:bg-red-900/10"
          : "hover:bg-gray-50 dark:hover:bg-gray-900"
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          isDanger
            ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            isDanger
              ? "text-red-600 dark:text-red-400"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {label}
        </p>
        {description && (
          <p
            className={`text-xs ${
              isDanger
                ? "text-red-500/70 dark:text-red-400/70"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {description}
          </p>
        )}
      </div>
      <ChevronRight
        className={`h-4 w-4 ${isDanger ? "text-red-400" : "text-gray-400"}`}
      />
    </button>
  );
}

// Place Item Component
function PlaceItem({
  image,
  name,
  subtitle,
  onClick,
}: {
  image?: string;
  name: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
    >
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        {image ? (
          <Image src={image} alt={name} fill className="object-cover" sizes="48px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {name}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </button>
  );
}

// Trip Card Component
function TripCard({
  trip,
  onClick,
}: {
  trip: Trip;
  onClick: () => void;
}) {
  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const dateRange =
    trip.start_date && trip.end_date
      ? `${formatDate(trip.start_date)} – ${formatDate(trip.end_date)}`
      : trip.start_date
      ? formatDate(trip.start_date)
      : null;

  const getStatusBadge = (status: string | null | undefined) => {
    const statusMap: Record<string, { label: string; classes: string }> = {
      planning: {
        label: "Planning",
        classes: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      },
      upcoming: {
        label: "Upcoming",
        classes: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      },
      ongoing: {
        label: "Ongoing",
        classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
      },
      completed: {
        label: "Completed",
        classes: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      },
    };
    return statusMap[status || "planning"] || statusMap.planning;
  };

  const statusBadge = getStatusBadge(trip.status);
  const imageUrl = trip.cover_image || (trip as any).firstLocationImage;

  return (
    <button
      onClick={onClick}
      className="w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-left transition-all hover:border-gray-300 dark:hover:border-gray-700"
    >
      {/* Cover Image */}
      <div className="relative h-28 w-full bg-gray-100 dark:bg-gray-800">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={trip.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MapPin className="h-8 w-8 text-gray-300 dark:text-gray-700" />
          </div>
        )}
        <div className="absolute right-2 top-2">
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusBadge.classes}`}
          >
            {statusBadge.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-1">
        <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-1">
          {trip.title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {dateRange && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateRange}
            </span>
          )}
          {trip.destination && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {trip.destination}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// Collection Card Component
function CollectionCard({
  collection,
  onClick,
}: {
  collection: Collection;
  onClick: () => void;
}) {
  const bgColor = collection.color || "#3B82F6";
  const emoji = collection.emoji || "📚";

  return (
    <button
      onClick={onClick}
      className="w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-left transition-all hover:border-gray-300 dark:hover:border-gray-700"
    >
      {/* Cover */}
      <div
        className="relative flex h-24 w-full items-center justify-center"
        style={{ backgroundColor: bgColor + "20" }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl shadow-md"
          style={{ backgroundColor: bgColor }}
        >
          {emoji}
        </div>
        {collection.is_public && (
          <span className="absolute right-2 top-2 rounded-md bg-white/90 dark:bg-gray-900/90 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">
            Public
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-1">
        <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-1">
          {collection.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {collection.destination_count || 0} places
        </p>
      </div>
    </button>
  );
}

// Subpage Header Component
function SubpageHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm px-4 py-3">
      <button
        onClick={onBack}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        aria-label="Back"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <h2 className="text-base font-medium text-gray-900 dark:text-white">
        {title}
      </h2>
    </div>
  );
}

// Loading State Component
function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

// Empty State Component
function EmptyState({
  message,
  action,
  actionLabel,
}: {
  message: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      {action && actionLabel && (
        <button
          onClick={action}
          className="mt-4 rounded-full bg-gray-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-gray-900 transition-opacity hover:opacity-90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function AccountDrawer() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { openDrawer, isDrawerOpen, closeDrawer } = useDrawer();
  const openSide = useDrawerStore((s) => s.openSide);
  const isOpen = isDrawerOpen("account");
  const [currentSubpage, setCurrentSubpage] = useState<SubpageId>("main_drawer");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>({
    visited: 0,
    saved: 0,
    trips: 0,
    cities: 0,
    countries: 0,
    explorationProgress: 0,
  });
  const [visitedPlaces, setVisitedPlaces] = useState<any[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTripViewDrawer, setShowTripViewDrawer] = useState(false);
  const [viewingTripId, setViewingTripId] = useState<string | null>(null);

  // Reset to main drawer when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentSubpage("main_drawer");
      setSelectedTripId(null);
      setSelectedTrip(null);
      setShowTripViewDrawer(false);
      setViewingTripId(null);
    }
  }, [isOpen]);

  // Fetch user profile, avatar, stats
  useEffect(() => {
    async function fetchProfileAndStats() {
      if (!user?.id) {
        setAvatarUrl(null);
        setUsername(null);
        setStats({
          visited: 0,
          saved: 0,
          trips: 0,
          cities: 0,
          countries: 0,
          explorationProgress: 0,
        });
        return;
      }

      try {
        const supabaseClient = createClient();

        const { data: profileData } = await supabaseClient
          .from("profiles")
          .select("avatar_url, username")
          .eq("id", user.id)
          .maybeSingle();

        if (profileData) {
          setAvatarUrl(profileData.avatar_url || null);
          setUsername(profileData.username || null);
        } else {
          const { data: userProfileData } = await supabaseClient
            .from("user_profiles")
            .select("username")
            .eq("user_id", user.id)
            .maybeSingle();

          if (userProfileData?.username) {
            setUsername(userProfileData.username);
          }
          setAvatarUrl(null);
        }

        const { count: totalDest } = await supabaseClient
          .from("destinations")
          .select("*", { count: "exact", head: true });
        const totalDestinations = totalDest || 0;

        const [visitedResult, savedResult, tripsResult] = await Promise.all([
          supabaseClient
            .from("visited_places")
            .select("destination_slug, destination:destinations(city, country)", {
              count: "exact",
            })
            .eq("user_id", user.id),
          supabaseClient
            .from("saved_places")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabaseClient
            .from("trips")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        const visitedCount = visitedResult.count || 0;
        const savedCount = savedResult.count || 0;
        const tripsCount = tripsResult.count || 0;

        const citiesSet = new Set<string>();
        const countriesSet = new Set<string>();
        if (visitedResult.data) {
          visitedResult.data.forEach((item: any) => {
            if (item.destination?.city) citiesSet.add(item.destination.city);
            if (item.destination?.country) countriesSet.add(item.destination.country);
          });
        }

        const explorationProgress =
          totalDestinations > 0
            ? Math.round((visitedCount / totalDestinations) * 100)
            : 0;

        setStats({
          visited: visitedCount,
          saved: savedCount,
          trips: tripsCount,
          cities: citiesSet.size,
          countries: countriesSet.size,
          explorationProgress,
        });
      } catch (error) {
        console.error("Error fetching profile and stats:", error);
      }
    }

    if (isOpen && user) {
      fetchProfileAndStats();
    }
  }, [user, isOpen]);

  // Fetch data for subpages
  useEffect(() => {
    async function fetchSubpageData() {
      if (!user?.id || !isOpen) return;

      const supabaseClient = createClient();
      setLoading(true);

      try {
        if (currentSubpage === "visited_subpage") {
          const { data } = await supabaseClient
            .from("visited_places")
            .select("destination_slug, visited_at, destination:destinations(name, image, city)")
            .eq("user_id", user.id)
            .order("visited_at", { ascending: false })
            .limit(20);

          if (data) {
            setVisitedPlaces(
              data.map((item: any) => ({
                slug: item.destination_slug,
                visited_at: item.visited_at,
                destination: item.destination,
              }))
            );
          }
        } else if (currentSubpage === "saved_subpage") {
          const { data } = await supabaseClient
            .from("saved_places")
            .select("destination_slug, destination:destinations(name, image, city)")
            .eq("user_id", user.id)
            .limit(20);

          if (data) {
            setSavedPlaces(
              data.map((item: any) => ({
                slug: item.destination_slug,
                destination: item.destination,
              }))
            );
          }
        } else if (currentSubpage === "collections_subpage") {
          const { data } = await supabaseClient
            .from("collections")
            .select("id, name, description, emoji, color, destination_count, is_public, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20);

          setCollections((data as Collection[]) || []);
        } else if (
          currentSubpage === "trips_subpage" ||
          currentSubpage === "trip_details_subpage"
        ) {
          const { data } = await supabaseClient
            .from("trips")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          setTrips((data as Trip[]) || []);

          if (selectedTripId && currentSubpage === "trip_details_subpage") {
            const trip = data?.find((t: Trip) => t.id === selectedTripId);
            setSelectedTrip(trip || null);
          }
        }
      } catch (error) {
        console.error("Error fetching subpage data:", error);
      } finally {
        setLoading(false);
      }
    }

    const shouldFetch = [
      "visited_subpage",
      "saved_subpage",
      "collections_subpage",
      "trips_subpage",
      "trip_details_subpage",
    ].includes(currentSubpage);

    if (shouldFetch) {
      fetchSubpageData();
    }
  }, [user, isOpen, currentSubpage, selectedTripId]);

  const handleSignOut = async () => {
    await signOut();
    closeDrawer();
    router.push("/");
  };

  const handleNavigateToFullPage = (path: string) => {
    closeDrawer();
    setTimeout(() => router.push(path), 200);
  };

  const displayUsername = username || user?.email?.split("@")[0] || "user";

  const navigateToSubpage = (subpage: SubpageId, tripId?: string) => {
    if (tripId) setSelectedTripId(tripId);
    setCurrentSubpage(subpage);
  };

  const navigateBack = () => {
    if (currentSubpage === "trip_details_subpage") {
      setCurrentSubpage("trips_subpage");
      setSelectedTripId(null);
    } else {
      setCurrentSubpage("main_drawer");
    }
  };

  const openTripQuickview = (tripId: string) => {
    setViewingTripId(tripId);
    setShowTripViewDrawer(true);
  };

  const openChatDrawer = () => openDrawer("chat");

  const handleOpenTrips = () => {
    closeDrawer();
    setTimeout(() => {
      openSide("trip-list");
    }, 150);
  };

  // ============================================================
  // MAIN DRAWER CONTENT
  // ============================================================
  const renderMainDrawer = () => {
    if (!user) {
      return (
        <>
          <DrawerHeader
            title="Welcome"
            subtitle="Sign in to get started"
            leftAccessory={
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <User className="h-5 w-5 text-gray-500" />
              </div>
            }
            bordered={false}
          />
          <DrawerSection>
            <p className="text-sm text-muted-foreground">
              Sign in to save places, build trips, and sync your travel profile
              across devices.
            </p>
          </DrawerSection>
          <DrawerActionBar>
            <button
              onClick={() => handleNavigateToFullPage("/auth/login")}
              className="w-full rounded-full bg-gray-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 transition-opacity hover:opacity-90"
            >
              Sign in
            </button>
          </DrawerActionBar>
        </>
      );
    }

    const profileBadge = (
      <button
        onClick={() => handleNavigateToFullPage("/account?tab=settings")}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        aria-label="Edit profile photo"
      >
        <Camera className="h-3.5 w-3.5" />
      </button>
    );

    return (
      <>
        {/* Profile Header */}
        <DrawerHeader
          title={displayUsername}
          subtitle={user.email || undefined}
          leftAccessory={
            <ProfileAvatar avatarUrl={avatarUrl} displayUsername={displayUsername} />
          }
          rightAccessory={profileBadge}
          bordered={false}
        />

        <div className="overflow-y-auto flex-1 pb-20">
          {/* Quick Actions */}
          <DrawerSection>
            <div className="flex gap-2">
              <button
                onClick={() => handleNavigateToFullPage("/account")}
                className="flex-1 rounded-full bg-gray-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 transition-opacity hover:opacity-90"
              >
                Edit profile
              </button>
              <button
                onClick={openChatDrawer}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                aria-label="Message concierge"
              >
                <MessageCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </DrawerSection>

          {/* Stats */}
          <DrawerSection>
            <div className="grid grid-cols-3 gap-2">
              <StatCard icon={MapPin} value={stats.visited} label="Visited" />
              <StatCard icon={Bookmark} value={stats.saved} label="Saved" />
              <StatCard icon={Compass} value={stats.trips} label="Trips" />
            </div>
          </DrawerSection>

          {/* Your Manual */}
          <DrawerSection>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Your Manual
            </p>
            <div className="-mx-3">
              <NavItem
                icon={Bookmark}
                label="Saved places"
                description={`${stats.saved} items`}
                onClick={() => navigateToSubpage("saved_subpage")}
              />
              <NavItem
                icon={MapPin}
                label="Visited places"
                description={`${stats.visited} logged`}
                onClick={() => navigateToSubpage("visited_subpage")}
              />
              <NavItem
                icon={Folder}
                label="Lists"
                description="Organize favorites"
                onClick={() => navigateToSubpage("collections_subpage")}
              />
              <NavItem
                icon={Compass}
                label="Trips"
                description={`${stats.trips} planned`}
                onClick={handleOpenTrips}
              />
              <NavItem
                icon={Trophy}
                label="Achievements"
                description="Milestones & badges"
                onClick={() => navigateToSubpage("achievements_subpage")}
              />
            </div>
          </DrawerSection>

          {/* Account & Settings */}
          <DrawerSection>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Account
            </p>
            <div className="-mx-3">
              <NavItem
                icon={Settings}
                label="Settings"
                description="Preferences & privacy"
                onClick={() => navigateToSubpage("settings_subpage")}
              />
              <NavItem
                icon={LogOut}
                label="Sign out"
                onClick={handleSignOut}
                isDanger
              />
            </div>
          </DrawerSection>
        </div>
      </>
    );
  };

  // ============================================================
  // VISITED SUBPAGE
  // ============================================================
  const renderVisitedSubpage = () => (
    <>
      <SubpageHeader title="Visited" onBack={navigateBack} />
      <div className="overflow-y-auto flex-1 pb-20">
        <DrawerSection>
          {loading ? (
            <LoadingState />
          ) : visitedPlaces.length > 0 ? (
            <div className="-mx-3 space-y-0.5">
              {visitedPlaces.map((visit, idx) => (
                <PlaceItem
                  key={idx}
                  image={visit.destination?.image}
                  name={visit.destination?.name || visit.slug}
                  subtitle={
                    visit.visited_at
                      ? new Date(visit.visited_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : undefined
                  }
                  onClick={() => handleNavigateToFullPage(`/destination/${visit.slug}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="No visited places yet" />
          )}
        </DrawerSection>
      </div>
      <DrawerActionBar>
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=visited")}
          className="w-full rounded-full bg-gray-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 transition-opacity hover:opacity-90"
        >
          View all visited
        </button>
      </DrawerActionBar>
    </>
  );

  // ============================================================
  // SAVED SUBPAGE
  // ============================================================
  const renderSavedSubpage = () => (
    <>
      <SubpageHeader title="Saved" onBack={navigateBack} />
      <div className="overflow-y-auto flex-1 pb-20">
        <DrawerSection>
          {loading ? (
            <LoadingState />
          ) : savedPlaces.length > 0 ? (
            <div className="-mx-3 space-y-0.5">
              {savedPlaces.map((saved, idx) => (
                <PlaceItem
                  key={idx}
                  image={saved.destination?.image}
                  name={saved.destination?.name || saved.slug}
                  subtitle={saved.destination?.city}
                  onClick={() => handleNavigateToFullPage(`/destination/${saved.slug}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="No saved places yet" />
          )}
        </DrawerSection>
      </div>
      <DrawerActionBar>
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=saved")}
          className="w-full rounded-full bg-gray-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 transition-opacity hover:opacity-90"
        >
          View all saved
        </button>
      </DrawerActionBar>
    </>
  );

  // ============================================================
  // COLLECTIONS SUBPAGE
  // ============================================================
  const renderCollectionsSubpage = () => (
    <>
      <SubpageHeader title="Lists" onBack={navigateBack} />
      <div className="overflow-y-auto flex-1 pb-20">
        <DrawerSection>
          {loading ? (
            <LoadingState message="Loading lists..." />
          ) : collections.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {collections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  onClick={() => handleNavigateToFullPage(`/collection/${collection.id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              message="No lists yet"
              action={() => handleNavigateToFullPage("/account?tab=collections")}
              actionLabel="Create a list"
            />
          )}
        </DrawerSection>
      </div>
      <DrawerActionBar>
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=collections")}
          className="w-full rounded-full bg-gray-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 transition-opacity hover:opacity-90"
        >
          Manage lists
        </button>
      </DrawerActionBar>
    </>
  );

  // ============================================================
  // TRIPS SUBPAGE
  // ============================================================
  const renderTripsSubpage = () => (
    <>
      <SubpageHeader title="Trips" onBack={navigateBack} />
      <div className="overflow-y-auto flex-1 pb-20">
        <DrawerSection>
          <button
            onClick={() => {
              closeDrawer();
              setTimeout(() => router.push("/trips"), 200);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New trip
          </button>
        </DrawerSection>

        <DrawerSection>
          {loading ? (
            <LoadingState />
          ) : trips.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onClick={() => openTripQuickview(String(trip.id))}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="No trips yet" />
          )}
        </DrawerSection>
      </div>
      <DrawerActionBar>
        <button
          onClick={() => handleNavigateToFullPage("/trips")}
          className="w-full rounded-full bg-gray-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 transition-opacity hover:opacity-90"
        >
          View all trips
        </button>
      </DrawerActionBar>
    </>
  );

  // ============================================================
  // TRIP DETAILS SUBPAGE
  // ============================================================
  const renderTripDetailsSubpage = () => {
    if (!selectedTrip) {
      return (
        <>
          <SubpageHeader title="Trip" onBack={navigateBack} />
          <DrawerSection>
            <EmptyState message="Trip not found" />
          </DrawerSection>
        </>
      );
    }

    const formatDate = (date: string | null) => {
      if (!date) return null;
      return new Date(date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    };

    return (
      <>
        <SubpageHeader title={selectedTrip.title} onBack={navigateBack} />
        <div className="overflow-y-auto flex-1 pb-20">
          {/* Cover Image */}
          {selectedTrip.cover_image && (
            <DrawerSection>
              <div className="relative h-44 w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                <Image
                  src={selectedTrip.cover_image}
                  alt={selectedTrip.title}
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
            </DrawerSection>
          )}

          {/* Date */}
          {selectedTrip.start_date && (
            <DrawerSection>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDate(selectedTrip.start_date)}
                  {selectedTrip.end_date && ` – ${formatDate(selectedTrip.end_date)}`}
                </span>
              </div>
            </DrawerSection>
          )}

          {/* Actions */}
          <DrawerSection>
            <div className="flex gap-2">
              <button className="flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900">
                <Share2 className="h-4 w-4" />
                Share
              </button>
              <button className="flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900">
                <Download className="h-4 w-4" />
                Export
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </DrawerSection>
        </div>
        <DrawerActionBar>
          <button
            onClick={() => handleNavigateToFullPage(`/trips/${selectedTrip.id}`)}
            className="w-full rounded-full bg-gray-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 transition-opacity hover:opacity-90"
          >
            Open trip
          </button>
        </DrawerActionBar>
      </>
    );
  };

  // ============================================================
  // ACHIEVEMENTS SUBPAGE
  // ============================================================
  const renderAchievementsSubpage = () => (
    <>
      <SubpageHeader title="Achievements" onBack={navigateBack} />
      <div className="overflow-y-auto flex-1 pb-20">
        <DrawerSection>
          <EmptyState message="Achievements coming soon" />
        </DrawerSection>
      </div>
      <DrawerActionBar>
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=achievements")}
          className="w-full rounded-full bg-gray-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 transition-opacity hover:opacity-90"
        >
          View all achievements
        </button>
      </DrawerActionBar>
    </>
  );

  // ============================================================
  // SETTINGS SUBPAGE
  // ============================================================
  const renderSettingsSubpage = () => (
    <>
      <SubpageHeader title="Settings" onBack={navigateBack} />
      <div className="overflow-y-auto flex-1 pb-20">
        <DrawerSection>
          <div className="-mx-3">
            <NavItem
              icon={Settings}
              label="Account settings"
              description="Email, password, security"
              onClick={() => handleNavigateToFullPage("/account?tab=settings")}
            />
          </div>
        </DrawerSection>
      </div>
      <DrawerActionBar>
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=settings")}
          className="w-full rounded-full bg-gray-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 transition-opacity hover:opacity-90"
        >
          Open full settings
        </button>
      </DrawerActionBar>
    </>
  );

  // ============================================================
  // RENDER CONTENT BASED ON SUBPAGE
  // ============================================================
  const renderContent = () => {
    switch (currentSubpage) {
      case "visited_subpage":
        return renderVisitedSubpage();
      case "saved_subpage":
        return renderSavedSubpage();
      case "collections_subpage":
        return renderCollectionsSubpage();
      case "trips_subpage":
        return renderTripsSubpage();
      case "trip_details_subpage":
        return renderTripDetailsSubpage();
      case "achievements_subpage":
        return renderAchievementsSubpage();
      case "settings_subpage":
        return renderSettingsSubpage();
      default:
        return renderMainDrawer();
    }
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={closeDrawer}
        mobileVariant="bottom"
        desktopSpacing="right-4 top-4 bottom-4"
        desktopWidth="400px"
        position="right"
        style="glassy"
        backdropOpacity="18"
        keepStateOnClose
        zIndex={currentSubpage === "main_drawer" ? 1000 : 1100}
      >
        <div className="flex h-full flex-col">{renderContent()}</div>
      </Drawer>

      {/* Trip Quickview Drawer */}
      {viewingTripId && (
        <TripViewDrawer
          isOpen={showTripViewDrawer}
          onClose={() => {
            setShowTripViewDrawer(false);
            setViewingTripId(null);
          }}
          tripId={viewingTripId}
          onEdit={() => {
            setShowTripViewDrawer(false);
            setViewingTripId(null);
            closeDrawer();
            setTimeout(() => router.push(`/trips/${viewingTripId}`), 200);
          }}
          onDelete={() => {
            setShowTripViewDrawer(false);
            setViewingTripId(null);
            if (user?.id && isOpen) {
              const supabaseClient = createClient();
              supabaseClient
                .from("trips")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .then(({ data }) => {
                  setTrips((data as Trip[]) || []);
                });
            }
          }}
        />
      )}
    </>
  );
}
