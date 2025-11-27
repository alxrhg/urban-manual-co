"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useDrawer } from "@/contexts/DrawerContext";
import { ChatDrawer } from "@/components/ChatDrawer";
import { LoginDrawer } from "@/components/LoginDrawer";

interface HeaderProps {
  /** Header variant: 'solid' for normal pages, 'transparent' for hero sections */
  variant?: 'solid' | 'transparent';
}

export function Header({ variant = 'solid' }: HeaderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { openDrawer, isDrawerOpen, closeDrawer } = useDrawer();
  const [isAdmin, setIsAdmin] = useState(false);
  const [buildVersion, setBuildVersion] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll for transparent header
  useEffect(() => {
    if (variant !== 'transparent') return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [variant]);

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

    fetchProfile();
  }, [user]);

  // Determine admin role from user metadata
  useEffect(() => {
    const role = (user?.app_metadata as Record<string, unknown> | undefined)?.role;
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
    }
    fetchBuildVersion();
  }, [isAdmin]);

  // Determine header styling based on variant and scroll state
  const isTransparent = variant === 'transparent' && !isScrolled;

  return (
    <>
      <header
        className={`
          fixed top-0 w-full z-50 transition-all duration-300 ease-out
          ${isTransparent
            ? 'bg-transparent'
            : 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-900'
          }
        `}
        role="banner"
      >
        <nav
          className="flex items-center justify-between px-6 md:px-8 py-5"
          aria-label="Main navigation"
        >
          {/* Left: Text Logo - Editorial Serif */}
          <Link
            href="/"
            className={`
              font-display text-xl md:text-2xl tracking-tighter
              transition-colors duration-200
              ${isTransparent
                ? 'text-white mix-blend-difference'
                : 'text-black dark:text-white hover:opacity-70'
              }
            `}
            aria-label="Go to homepage"
          >
            Urban Manual
          </Link>

          {/* Right: Minimal Menu */}
          <div className={`
            flex items-center gap-6 md:gap-8
            ${isTransparent ? 'text-white mix-blend-difference' : ''}
          `}>
            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-6 font-body text-xs uppercase tracking-widest">
              <Link
                href="/explore"
                className={`
                  transition-opacity duration-200 hover:opacity-60
                  ${isTransparent ? '' : 'text-gray-700 dark:text-gray-300'}
                `}
              >
                Discover
              </Link>
              <Link
                href="/trips"
                className={`
                  transition-opacity duration-200 hover:opacity-60
                  ${isTransparent ? '' : 'text-gray-700 dark:text-gray-300'}
                `}
              >
                Trips
              </Link>
            </div>

            {/* Admin Build Version */}
            {isAdmin && buildVersion && (
              <span
                className="hidden md:inline text-[10px] text-gray-400 font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded"
                title="Build version"
                aria-label={`Build version ${buildVersion}`}
              >
                {buildVersion}
              </span>
            )}

            {/* User Menu - Avatar Only */}
            {user ? (
              <button
                onClick={() => openDrawer('account')}
                className={`
                  w-9 h-9 rounded-full overflow-hidden
                  border-2 transition-all duration-200
                  ${isTransparent
                    ? 'border-white/30 hover:border-white/60'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2
                `}
                aria-label="Open account menu"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`
                    w-full h-full flex items-center justify-center
                    ${isTransparent
                      ? 'bg-white/10'
                      : 'bg-gray-100 dark:bg-gray-800'
                    }
                  `}>
                    <User className={`
                      w-4 h-4
                      ${isTransparent
                        ? 'text-white'
                        : 'text-gray-500 dark:text-gray-400'
                      }
                    `} />
                  </div>
                )}
              </button>
            ) : (
              <button
                onClick={() => openDrawer('login')}
                className={`
                  font-body text-xs uppercase tracking-widest
                  transition-opacity duration-200 hover:opacity-60
                  ${isTransparent ? '' : 'text-gray-700 dark:text-gray-300'}
                `}
                aria-label="Sign in"
              >
                Sign In
              </button>
            )}
          </div>
        </nav>
      </header>

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
    </>
  );
}
