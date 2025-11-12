'use client';

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { ChevronDown, User, LogOut, Shield } from "lucide-react";

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
  const menuRef = useRef<HTMLDivElement>(null);

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
        setAvatarUrl(null);
      }
    }

    fetchProfile();
  }, [user]);

  // Determine admin role
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
        setBuildVersion(null);
      }
    }
    fetchBuildVersion();
  }, [isAdmin]);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  const navigate = (path: string) => {
    router.push(path);
    setIsMenuOpen(false);
  };

  const handleMenuToggle = () => {
    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header 
      className="mt-6 md:mt-8 relative z-50" 
      role="banner"
    >
      {/* Primary Nav: Brand + 1-2 Top-Level Links */}
      <div className="w-full px-6 md:px-10 lg:px-12">
        <nav className="flex items-center justify-between h-16" aria-label="Main navigation">
          {/* Logo - Left */}
          <button
            onClick={() => navigate("/")}
            className="font-medium text-sm text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 rounded-lg px-3 py-2 -m-2 shrink-0"
            aria-label="Go to homepage"
          >
            Urban Manual®
          </button>
          
          {/* Top-Level Links - Minimal, Editorial */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/cities"
              className="text-xs font-normal text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 rounded"
            >
              Cities
            </Link>
            <Link
              href="/map"
              className="text-xs font-normal text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 rounded"
            >
              Map
            </Link>
          </div>
          
          {/* Menu Button - Right */}
          <div className="flex items-center gap-3 shrink-0">
            {isAdmin && buildVersion && (
              <span
                className="hidden md:inline text-[10px] text-gray-400 font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded"
                title="Build version"
                aria-label={`Build version ${buildVersion}`}
              >
                {buildVersion}
              </span>
            )}
            <button
              ref={menuButtonRef}
              onClick={handleMenuToggle}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors p-2 -m-2 touch-manipulation focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 rounded-lg shrink-0"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
            >
              {user ? (
                <>
                  {avatarUrl ? (
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-100 dark:border-gray-700">
                      <Image
                        src={avatarUrl}
                        alt={user.email || 'Profile'}
                        fill
                        className="object-cover"
                        sizes="32px"
                        onError={() => setAvatarUrl(null)}
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-normal text-gray-500 dark:text-gray-500">
                      {user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <ChevronDown
                    className={`w-3 h-3 text-gray-400 dark:text-gray-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </>
              ) : (
                <>
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-500">Menu</span>
                  <ChevronDown
                    className={`w-3 h-3 text-gray-400 dark:text-gray-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </>
              )}
            </button>
          </div>
        </nav>
      </div>

      {/* Simplified Menu Dropdown - Grouped Sections */}
      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 md:bg-transparent"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={menuRef}
            className="fixed z-50 w-80 md:w-72 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg ring-1 ring-black/3 dark:ring-white/3 overflow-hidden origin-top-right animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
            }}
            role="menu"
            aria-label="Navigation menu"
          >
            <div className="py-3">
              {/* Product Tools Section */}
              <div className="px-4 py-2">
                <div className="text-[10px] font-normal uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                  Explore
                </div>
                <div className="space-y-0.5">
                  <Link
                    href="/cities"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                    role="menuitem"
                  >
                    Cities
                  </Link>
                  <Link
                    href="/map"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                    role="menuitem"
                  >
                    Map
                  </Link>
                  <Link
                    href="/discover"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                    role="menuitem"
                  >
                    Discover Collections
                  </Link>
                  <Link
                    href="/collections"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                    role="menuitem"
                  >
                    Collections
                  </Link>
                </div>
              </div>

              {/* User Tools Section - Only if logged in */}
              {user && (
                <>
                  <div className="my-2 border-t border-gray-50 dark:border-gray-700" role="separator" />
                  <div className="px-4 py-2">
                    <div className="text-[10px] font-normal uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                      Your Tools
                    </div>
                    <div className="space-y-0.5">
                      <Link
                        href="/trips"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                        role="menuitem"
                      >
                        Trips
                      </Link>
                      <Link
                        href="/trips?new=1"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                        role="menuitem"
                      >
                        Start a Trip
                      </Link>
                      <Link
                        href="/saved"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                        role="menuitem"
                      >
                        Saved
                      </Link>
                      <Link
                        href="/recent"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                        role="menuitem"
                      >
                        Recent
                      </Link>
                      <Link
                        href="/lists"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                        role="menuitem"
                      >
                        Lists
                      </Link>
                      <Link
                        href="/itinerary"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                        role="menuitem"
                      >
                        Itinerary
                      </Link>
                      <Link
                        href="/chat"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                        role="menuitem"
                      >
                        Chat
                      </Link>
                    </div>
                  </div>
                </>
              )}

              {/* Account & Admin Section - Moved to bottom, subtler */}
              <div className="my-2 border-t border-gray-50 dark:border-gray-700" role="separator" />
              <div className="px-4 py-2">
                <div className="text-[10px] font-normal uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                  {user ? 'Account' : 'Access'}
                </div>
                <div className="space-y-0.5">
                  {user ? (
                    <>
                      <Link
                        href="/account"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                        role="menuitem"
                      >
                        <User className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        Account
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                          role="menuitem"
                        >
                          <Shield className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                          Admin
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          await signOut();
                          setIsMenuOpen(false);
                          navigate('/');
                        }}
                        className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                        role="menuitem"
                      >
                        <LogOut className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/trips?new=1"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                        role="menuitem"
                      >
                        Start a Trip
                      </Link>
                      <Link
                        href="/auth/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                        role="menuitem"
                      >
                        Sign In
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
