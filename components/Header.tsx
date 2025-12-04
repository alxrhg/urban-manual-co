"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { User, Map, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useDrawer } from "@/contexts/DrawerContext";
import { useTrip } from "@/contexts/TripContext";
import { ChatDrawer } from "@/components/ChatDrawer";
import { LoginDrawer } from "@/components/LoginDrawer";
import { CommandPalette } from "@/components/CommandPalette";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Header() {
  const router = useRouter();
  const { user } = useAuth();
  const { openDrawer, isDrawerOpen, closeDrawer } = useDrawer();
  const { activeTrip } = useTrip();
  const [buildVersion, setBuildVersion] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Determine admin role from user metadata (sync, no useEffect needed)
  const isAdmin = useMemo(() => {
    const role = (user?.app_metadata as Record<string, any> | undefined)?.role;
    return role === "admin";
  }, [user]);

  // Single useEffect to fetch all user data in parallel
  useEffect(() => {
    if (!user?.id) {
      setAvatarUrl(null);
      setBuildVersion(null);
      return;
    }

    // Parallel fetch: avatar and build version (if admin)
    const fetchUserData = async () => {
      const promises: Promise<void>[] = [];

      // Fetch avatar
      promises.push(
        (async () => {
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
        })()
      );

      // Fetch build version only for admins
      if (isAdmin) {
        promises.push(
          (async () => {
            try {
              const versionRes = await fetch("/api/build-version");
              if (!versionRes.ok) {
                setBuildVersion(null);
                return;
              }
              const versionData = await versionRes.json();
              setBuildVersion(
                versionData.buildNumber ||
                  versionData.shortSha ||
                  versionData.commitSha?.substring(0, 7) ||
                  versionData.version ||
                  null
              );
            } catch {
              setBuildVersion(null);
            }
          })()
        );
      } else {
        setBuildVersion(null);
      }

      await Promise.all(promises);
    };

    fetchUserData();
  }, [user, isAdmin]);

  const navigate = (path: string) => {
    router.push(path);
  };

  const actionButtons = (
    <>
      {isAdmin && buildVersion && (
        <span
          className="text-[10px] text-gray-400 font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded"
          title="Build version"
          aria-label={`Build version ${buildVersion}`}
        >
          {buildVersion}
        </span>
      )}

      {/* Trips button - shows active trip context when available */}
      {activeTrip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate(`/trips/${activeTrip.id}`)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 rounded-full text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              aria-label={`Continue planning ${activeTrip.name}`}
            >
              <span className="relative">
                <MapPin className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              </span>
              <span className="hidden sm:inline max-w-[120px] truncate">{activeTrip.name}</span>
              <span className="sm:hidden">Trip</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Continue planning: {activeTrip.name}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate('/trips')}
              className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
              aria-label="View trips"
            >
              <Map className="w-4 h-4" />
              <span>Trips</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{user ? 'View your trips' : 'Plan a trip'}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {user ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => openDrawer('account')}
              className="flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 transition-opacity touch-manipulation focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
              aria-label="Open account drawer"
            >
              {avatarUrl ? (
                <span className="w-6 h-6 rounded-full border border-white/20 dark:border-black/10 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </span>
              ) : (
                <User className="w-4 h-4" />
              )}
              <span>Account</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Account settings</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => openDrawer('login')}
              className="flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 transition-opacity touch-manipulation focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
              aria-label="Sign in"
            >
              <User className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sign in to save trips</p>
          </TooltipContent>
        </Tooltip>
      )}
    </>
  );

  return (
    <header
      className="mt-6 md:mt-8 relative z-30 bg-white dark:bg-gray-900 w-full"
      role="banner"
    >
      {/* Primary Nav */}
      <div className="w-full px-6 md:px-10">
        <nav
          className="flex items-center justify-between py-4 w-full"
          aria-label="Main navigation"
        >
          <button
            onClick={() => navigate("/")}
            className="font-medium text-sm hover:opacity-70 transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 rounded-lg py-2 shrink-0"
            aria-label="Go to homepage"
          >
            Urban Manual®
          </button>

          <div className="flex items-center gap-2">
            <CommandPalette />
            {actionButtons}
          </div>
        </nav>
      </div>
      {/* Chat Drawer - Only render when open */}
      {isDrawerOpen('chat') && (
        <ChatDrawer
          isOpen={true}
          onClose={closeDrawer}
        />
      )}

      {/* Login Drawer - Only render when open */}
      {isDrawerOpen('login') && (
        <LoginDrawer
          isOpen={true}
          onClose={closeDrawer}
        />
      )}
    </header>
  );
}
