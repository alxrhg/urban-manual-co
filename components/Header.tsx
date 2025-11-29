"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { User, Map } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useDrawer } from "@/contexts/DrawerContext";
import { ChatDrawer } from "@/components/ChatDrawer";
import { LoginDrawer } from "@/components/LoginDrawer";
import { cn } from "@/lib/utils";

export interface HeaderProps {
  /** Use transparent background (blends with page) */
  transparent?: boolean;
  /** Sticky header with blur effect */
  sticky?: boolean;
  /** Compact mode - reduced padding */
  compact?: boolean;
  /** Additional class */
  className?: string;
}

export function Header({
  transparent = true,
  sticky = false,
  compact = false,
  className,
}: HeaderProps = {}) {
  const router = useRouter();
  const { user } = useAuth();
  const { openDrawer, isDrawerOpen, closeDrawer } = useDrawer();
  const [isAdmin, setIsAdmin] = useState(false);
  const [buildVersion, setBuildVersion] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Fetch user profile and avatar
  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) {
        setAvatarUrl(null);
        return;
      }

      try {
        // Use profiles table (standard Supabase structure)
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
        // Ignore errors (table might not exist or RLS blocking)
        setAvatarUrl(null);
      }
    }

    fetchProfile();
  }, [user]);

  // Determine admin role from user metadata
  useEffect(() => {
    const role = (user?.app_metadata as Record<string, any> | undefined)?.role;
    const isAdminUser = role === "admin";
    setIsAdmin(isAdminUser);
    if (!isAdminUser) {
      setBuildVersion(null);
    }
  }, [user]);

  // Fetch build version for admins
  useEffect(() => {
    async function fetchBuildVersion() {
      if (!isAdmin) return;
      try {
        const versionRes = await fetch("/api/build-version");
        if (!versionRes.ok) {
          setBuildVersion(null);
          return;
        }
        const versionData = await versionRes.json();
        // Prioritize GitHub build number, then commit SHA, then version
        setBuildVersion(
          versionData.buildNumber ||
            versionData.shortSha ||
            versionData.commitSha?.substring(0, 7) ||
            versionData.version ||
            null
        );
      } catch {
        // Ignore version fetch errors
        setBuildVersion(null);
      }
    }
    fetchBuildVersion();
  }, [isAdmin]);

  const navigate = (path: string) => {
    router.push(path);
  };

  // Shared button styles for consistency
  const secondaryButtonClass = cn(
    "flex items-center gap-1.5 px-4 py-2",
    "bg-white dark:bg-zinc-900",
    "border border-neutral-200 dark:border-zinc-700",
    "text-neutral-900 dark:text-white",
    "rounded-full text-sm font-medium",
    "hover:bg-neutral-50 dark:hover:bg-zinc-800",
    "transition-colors duration-fast",
    "touch-manipulation",
    "focus:outline-none focus-visible:ring-2",
    "focus-visible:ring-neutral-900 dark:focus-visible:ring-white",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950"
  );

  const primaryButtonClass = cn(
    "flex items-center gap-1.5 px-4 py-2",
    "bg-neutral-900 dark:bg-white",
    "text-white dark:text-neutral-900",
    "rounded-full text-sm font-medium",
    "hover:opacity-90 transition-opacity duration-fast",
    "touch-manipulation",
    "focus:outline-none focus-visible:ring-2",
    "focus-visible:ring-neutral-900 dark:focus-visible:ring-white",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950"
  );

  const actionButtons = (
    <>
      {isAdmin && buildVersion && (
        <span
          className="text-[10px] text-neutral-400 font-mono px-1.5 py-0.5 bg-neutral-100 dark:bg-zinc-800 rounded"
          title="Build version"
          aria-label={`Build version ${buildVersion}`}
        >
          {buildVersion}
        </span>
      )}

      {user ? (
        <>
          <button
            onClick={() => navigate('/trips')}
            className={secondaryButtonClass}
            aria-label="View trips"
          >
            <Map className="w-4 h-4" />
            <span>Trips</span>
          </button>
          <button
            onClick={() => openDrawer('account')}
            className={primaryButtonClass}
            aria-label="Open account drawer"
          >
            {avatarUrl ? (
              <span className="w-6 h-6 rounded-full border border-white/20 dark:border-neutral-900/10 bg-neutral-100 dark:bg-zinc-800 overflow-hidden">
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
        </>
      ) : (
        <button
          onClick={() => openDrawer('login')}
          className={primaryButtonClass}
          aria-label="Sign in"
        >
          <User className="w-4 h-4" />
          <span>Sign In</span>
        </button>
      )}
    </>
  );

  return (
    <header
      className={cn(
        "relative w-full",
        // Z-index for proper layering
        "z-50",
        // Background - transparent by default for cohesive feel
        transparent
          ? "bg-transparent"
          : "bg-white dark:bg-zinc-950",
        // Sticky mode with blur
        sticky && [
          "sticky top-0",
          "bg-white/80 dark:bg-zinc-950/80",
          "backdrop-blur-md",
          "border-b border-neutral-100 dark:border-zinc-800",
        ],
        // Top spacing - part of the page flow, not separate
        !sticky && "pt-6 md:pt-8",
        className
      )}
      role="banner"
    >
      {/* Primary Nav - uses same gutters as page content */}
      <div className="w-full px-6 md:px-10">
        <nav
          className={cn(
            "flex items-center justify-between w-full",
            compact ? "py-3" : "py-4"
          )}
          aria-label="Main navigation"
        >
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className={cn(
              "font-medium text-sm shrink-0",
              "text-neutral-900 dark:text-white",
              "hover:opacity-70 transition-all duration-normal ease-out",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white",
              "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950",
              "rounded-lg py-2"
            )}
            aria-label="Go to homepage"
          >
            Urban Manual®
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2">{actionButtons}</div>
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
