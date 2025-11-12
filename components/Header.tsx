'use client';

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [buildVersion, setBuildVersion] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isHome = pathname === '/';
  const isMap = pathname === '/map';

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
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
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
    const isAdminUser = role === 'admin';
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
        const versionRes = await fetch('/api/build-version');
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

  const navigate = (path: string) => {
    router.push(path);
    setIsMenuOpen(false);
  };

  return (
    <header 
      className="mt-6 md:mt-8 relative z-50" 
      role="banner"
    >
      {/* Primary Nav: Brand + Menu */}
      <div className="w-full px-6 md:px-10 lg:px-12">
        <nav className="flex items-center justify-between h-16" aria-label="Main navigation">
          {/* Logo - Left */}
          <button
            onClick={() => navigate("/")}
            className="font-medium text-sm hover:opacity-70 transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 rounded-lg px-3 py-2 -m-2 shrink-0"
            aria-label="Go to homepage"
          >
            Urban Manual®
          </button>
          
          {/* Profile picture / Menu dropdown on right */}
          <div className="flex items-center gap-4 shrink-0">
            {isAdmin && buildVersion && (
              <span
                className="text-[10px] text-gray-400 font-mono px-1.5 py-0.5 bg-gray-100 rounded"
                title="Build version"
                aria-label={`Build version ${buildVersion}`}
              >
                {buildVersion}
              </span>
            )}
            {user ? (
              <button
                ref={menuButtonRef}
                onClick={() => {
                  if (menuButtonRef.current) {
                    const rect = menuButtonRef.current.getBoundingClientRect();
                    setDropdownPosition({
                      top: rect.bottom + 4, // Small gap for visual separation
                      right: window.innerWidth - rect.right,
                    });
                  }
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="flex items-center gap-2 hover:opacity-80 transition-all duration-200 ease-out p-2 -m-2 touch-manipulation focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 rounded-full ml-4 shrink-0"
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
              >
                {avatarUrl ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                    <Image
                      src={avatarUrl}
                      alt={user.email || 'Profile'}
                      fill
                      className="object-cover"
                      sizes="40px"
                      onError={() => {
                        // If image fails to load, clear the avatar URL to show fallback
                        setAvatarUrl(null);
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <svg
                  className={`w-4 h-4 text-gray-600 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ) : (
              <button
                ref={menuButtonRef}
                onClick={() => {
                  if (menuButtonRef.current) {
                    const rect = menuButtonRef.current.getBoundingClientRect();
                    setDropdownPosition({
                      top: rect.bottom + 4, // Small gap for visual separation
                      right: window.innerWidth - rect.right,
                    });
                  }
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-black transition-colors font-normal py-3 px-2 -m-2 touch-manipulation focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 rounded-lg ml-4 shrink-0"
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
              >
                Menu
                <svg
                  className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </nav>
      </div>


      {/* No full nav bar; all navigation via burger menu */}

      {/* Burger Menu Dropdown (all breakpoints) */}
      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-gray-950/40 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in-0"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Dropdown popover with elevated shadow and subtle ring */}
          <div
            className="fixed z-50 w-[min(90vw,20rem)] origin-top-right overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur supports-[backdrop-filter]:backdrop-blur-lg dark:border-gray-800/60 dark:bg-gray-950/90 dark:ring-white/10 animate-in fade-in-0 slide-in-from-top-2 duration-200"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
            }}
            role="menu"
            aria-label="Main menu"
          >
            {/* Arrow/caret */}
            <div className="absolute -top-2 right-6 h-4 w-4 rotate-45 border-t border-l border-gray-200/80 bg-white/95 dark:border-gray-800/60 dark:bg-gray-950/90" aria-hidden="true" />
            <div className="py-2">
              <Link
                href="/cities"
                onClick={() => setIsMenuOpen(false)}
                className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-gray-900 transition-colors duration-200 ease-out hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80"
                role="menuitem"
              >
                Cities
                <svg
                  className="h-4 w-4 opacity-70"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/map"
                onClick={() => setIsMenuOpen(false)}
                className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-gray-900 transition-colors duration-200 ease-out hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80"
                role="menuitem"
              >
                Map
                <svg
                  className="h-4 w-4 opacity-70"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/discover"
                onClick={() => setIsMenuOpen(false)}
                className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-gray-900 transition-colors duration-200 ease-out hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80"
                role="menuitem"
              >
                Discover Collections
                <svg
                  className="h-4 w-4 opacity-70"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/collections"
                onClick={() => setIsMenuOpen(false)}
                className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-gray-900 transition-colors duration-200 ease-out hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80"
                role="menuitem"
              >
                Collections
                <svg
                  className="h-4 w-4 opacity-70"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <div className="my-2 border-t border-gray-200 dark:border-gray-800" role="separator" />
              {user ? (
                <>
                  <Link
                    href="/trips"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-gray-900 transition-colors duration-200 ease-out hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80"
                    role="menuitem"
                  >
                    Trips
                    <svg
                      className="h-4 w-4 opacity-70"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/trips?new=1"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold text-gray-900 transition-colors duration-200 ease-out hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80"
                    role="menuitem"
                  >
                    Start a Trip
                    <svg
                      className="h-4 w-4 opacity-70"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/saved"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-gray-900 transition-colors duration-200 ease-out hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80"
                    role="menuitem"
                  >
                    Saved
                    <svg
                      className="h-4 w-4 opacity-70"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/recent"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-gray-900 transition-colors duration-200 ease-out hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80"
                    role="menuitem"
                  >
                    Recent
                    <svg
                      className="h-4 w-4 opacity-70"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/lists"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-gray-900 transition-colors duration-200 ease-out hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80"
                    role="menuitem"
                  >
                    Lists
                    <svg
                      className="h-4 w-4 opacity-70"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/itinerary"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-gray-900 transition-colors duration-200 ease-out hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80"
                    role="menuitem"
                  >
                    Itinerary
                    <svg
                      className="h-4 w-4 opacity-70"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/chat"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-gray-900 transition-colors duration-200 ease-out hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80"
                    role="menuitem"
                  >
                    Chat
                    <svg
                      className="h-4 w-4 opacity-70"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <div className="my-2 border-t border-gray-200 dark:border-gray-800" role="separator" />
                  <Link
                    href="/account"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-gray-900 transition-colors duration-200 ease-out hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80"
                    role="menuitem"
                  >
                    Account
                    <svg
                      className="h-4 w-4 opacity-70"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold text-gray-900 transition-colors duration-200 ease-out hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80"
                      role="menuitem"
                    >
                      Admin
                      <svg
                        className="h-4 w-4 opacity-70"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={async () => { await signOut(); setIsMenuOpen(false); navigate('/'); }}
                    className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-gray-900 transition-colors duration-200 ease-out hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80"
                    role="menuitem"
                  >
                    Sign Out
                    <svg
                      className="h-4 w-4 opacity-70"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/trips?new=1"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold text-gray-900 transition-colors duration-200 ease-out hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80"
                    role="menuitem"
                  >
                    Start a Trip
                    <svg
                      className="h-4 w-4 opacity-70"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/auth/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-gray-900 transition-colors duration-200 ease-out hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80"
                    role="menuitem"
                  >
                    Sign In
                    <svg
                      className="h-4 w-4 opacity-70"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
