"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { AccountDrawer } from "@/components/AccountDrawer";
import { ChatDrawer } from "@/components/ChatDrawer";
import { LoginDrawer } from "@/components/LoginDrawer";

export function Header() {
  const router = useRouter();
  const { user } = useAuth();
  const [isAccountDrawerOpen, setIsAccountDrawerOpen] = useState(false);
  const [accountDrawerInitialSubpage, setAccountDrawerInitialSubpage] = useState<'main_drawer' | 'trips_subpage' | undefined>(undefined);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isLoginDrawerOpen, setIsLoginDrawerOpen] = useState(false);
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
      if (event.detail?.subpage) {
        setAccountDrawerInitialSubpage(event.detail.subpage);
      }
      setIsAccountDrawerOpen(true);
    };

    window.addEventListener('openAccountDrawer', handleOpenAccountDrawer as EventListener);
    return () => {
      window.removeEventListener('openAccountDrawer', handleOpenAccountDrawer as EventListener);
    };
  }, []);

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
          onClick={() => setIsAccountDrawerOpen(true)}
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
      ) : (
        <button
          onClick={() => setIsLoginDrawerOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 transition-opacity touch-manipulation focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
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
      id="top-header"
      className="sticky top-0 w-full z-[400] transition-all duration-300 border-b border-transparent data-[scrolled=true]:bg-white/80 data-[scrolled=true]:dark:bg-gray-900/80 data-[scrolled=true]:backdrop-blur-md data-[scrolled=true]:border-gray-200 data-[scrolled=true]:dark:border-gray-800"
      role="banner"
    >
      {/* Primary Nav */}
      <div className="w-full px-6 md:px-10">
        <nav
          className="flex items-center justify-between py-4"
          aria-label="Main navigation"
        >
          <button
            onClick={() => navigate("/")}
            className="font-medium text-sm hover:opacity-70 transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 rounded-lg py-2 shrink-0"
            aria-label="Go to homepage"
          >
            Urban Manual®
          </button>

          <div className="flex items-center gap-2">{actionButtons}</div>
        </nav>
      </div>
      {/* Account Drawer */}
      <AccountDrawer
        isOpen={isAccountDrawerOpen}
        onClose={() => {
          setIsAccountDrawerOpen(false);
          setAccountDrawerInitialSubpage(undefined);
        }}
        onOpenChat={() => setIsChatDrawerOpen(true)}
        initialSubpage={accountDrawerInitialSubpage}
      />

      {/* Chat Drawer */}
      <ChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
      />

      {/* Login Drawer */}
      <LoginDrawer
        isOpen={isLoginDrawerOpen}
        onClose={() => setIsLoginDrawerOpen(false)}
      />
    </header>
  );
}
