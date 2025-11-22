"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { User } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useDrawer } from "@/contexts/DrawerContext";

export function Header() {
  const router = useRouter();
  const { user } = useAuth();
  const { openDrawer } = useDrawer();
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
        const versionData = await versionRes.json();
        setBuildVersion(
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

  // Listen for custom event to open account drawer with specific subpage
  useEffect(() => {
    const handleOpenAccountDrawer = (event: CustomEvent<{ subpage?: 'trips_subpage' }>) => {
      openDrawer("account", { initialSubpage: event.detail?.subpage });
    };

    window.addEventListener('openAccountDrawer', handleOpenAccountDrawer as EventListener);
    return () => {
      window.removeEventListener('openAccountDrawer', handleOpenAccountDrawer as EventListener);
    };
  }, [openDrawer]);

  const navigate = (path: string) => {
    router.push(path);
  };

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const header = document.getElementById('top-header');
      if (header) {
        if (window.scrollY > 10) {
          header.setAttribute('data-scrolled', 'true');
        } else {
          header.setAttribute('data-scrolled', 'false');
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

      {user ? (
        <button
          onClick={() => openDrawer("account")}
          className="text-lovably-base hover:opacity-70 transition-opacity focus:outline-none"
          aria-label="Open account drawer"
        >
          {avatarUrl ? (
            <span className="w-6 h-6 rounded-full border border-black/10 dark:border-white/10 overflow-hidden inline-block">
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </span>
          ) : (
            <User className="w-4 h-4" />
          )}
        </button>
      ) : (
        <button
          onClick={() => openDrawer("login")}
          className="text-lovably-base hover:opacity-70 transition-opacity focus:outline-none"
          aria-label="Sign in"
        >
          <User className="w-4 h-4" />
        </button>
      )}
    </>
  );

  return (
    <header
      id="top-header"
      className="sticky top-0 w-full z-[400] bg-white/50 dark:bg-black/50 backdrop-blur-2xl border-b border-transparent"
      role="banner"
    >
      {/* Primary Nav - Lovably style */}
      <div className="container-lovably">
        <nav
          className="flex items-center justify-between h-[50px] md:h-[90px]"
          aria-label="Main navigation"
        >
          <button
            onClick={() => navigate("/")}
            className="text-lovably-base hover:opacity-70 transition-opacity focus:outline-none shrink-0"
            aria-label="Go to homepage"
          >
            Urban Manual
            <span className="relative text-[11px] md:text-[10px] left-px bottom-[3px]">®</span>
          </button>

          <div className="flex items-center gap-4">
            <Link
              href="/about"
              className="text-lovably-base link-lovably"
            >
              Information
            </Link>
            {actionButtons}
          </div>
        </nav>
      </div>
    </header>
  );
}
