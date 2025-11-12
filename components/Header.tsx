'use client';

import { useRouter, usePathname } from "next/navigation";
import { FormEvent, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { capitalizeCategory, capitalizeCity } from "@/lib/utils";

const VISIBLE_CITIES = ["Taipei", "Tokyo", "New York", "London"] as const;
const CATEGORY_ITEMS = [
  "Michelin",
  "Dining",
  "Hotel",
  "Bar",
  "Cafe",
  "Culture",
  "Shopping",
] as const;

function slugifyCity(city: string): string {
  return city
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [buildVersion, setBuildVersion] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [isCitiesOpen, setIsCitiesOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const cityButtonRef = useRef<HTMLButtonElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
  const cityMenuRef = useRef<HTMLDivElement>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
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

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isCitiesOpen && !isCategoriesOpen) {
      return;
    }

    function handleClick(event: MouseEvent) {
      const target = event.target as Node;

      if (isCitiesOpen) {
        const withinButton = cityButtonRef.current?.contains(target);
        const withinMenu = cityMenuRef.current?.contains(target);
        if (!withinButton && !withinMenu) {
          setIsCitiesOpen(false);
        }
      }

      if (isCategoriesOpen) {
        const withinButton = categoryButtonRef.current?.contains(target);
        const withinMenu = categoryMenuRef.current?.contains(target);
        if (!withinButton && !withinMenu) {
          setIsCategoriesOpen(false);
        }
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsCitiesOpen(false);
        setIsCategoriesOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isCitiesOpen, isCategoriesOpen]);

  useEffect(() => {
    setIsCitiesOpen(false);
    setIsCategoriesOpen(false);
  }, [pathname]);


  const navigate = (path: string) => {
    router.push(path);
    setIsMenuOpen(false);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setIsMenuOpen(false);
  };

  const handleCitySelect = (city: string) => {
    const slug = slugifyCity(city);
    if (!slug) return;
    router.push(`/city/${slug}`);
    setIsCitiesOpen(false);
    setIsMenuOpen(false);
  };

  const handleCategorySelect = (category: string) => {
    const query = category.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setIsCategoriesOpen(false);
    setIsMenuOpen(false);
  };

  const handleFiltersClick = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-search-filters'));
    }
    if (!isHome && !isMap) {
      router.push('/#filters');
    }
  };

  const handleStartTrip = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-trip-planner'));
    }
    if (!isHome) {
      router.push('/trips?new=1');
    }
  };

  return (
    <header 
      className="mt-6 md:mt-8 relative z-50" 
      role="banner"
    >
      {/* Primary Nav: Brand + Menu */}
      <div className="w-full px-6 md:px-10 lg:px-12">
        <nav className="flex flex-wrap items-center gap-3 md:gap-6" aria-label="Main navigation">
          {/* Logo - Left */}
          <button
            onClick={() => navigate("/")}
            className="font-medium text-sm hover:opacity-70 transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 rounded-lg px-3 py-2 -m-2 shrink-0"
            aria-label="Go to homepage"
          >
            Urban Manual®
          </button>

          {/* Search input */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 min-w-[220px] md:min-w-[260px]"
            role="search"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search destinations, hotels, or restaurants..."
                className="w-full rounded-full border border-gray-200 bg-white px-11 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>
          </form>

          {/* Action buttons */}
          <div className="ml-auto flex items-center gap-2 md:gap-3 shrink-0">
            <div className="relative">
              <button
                ref={cityButtonRef}
                type="button"
                onClick={() => {
                  setIsCitiesOpen((prev) => !prev);
                  setIsCategoriesOpen(false);
                }}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
                aria-haspopup="true"
                aria-expanded={isCitiesOpen}
              >
                Cities
              </button>
              {isCitiesOpen && (
                <div
                  ref={cityMenuRef}
                  className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="py-1">
                    {VISIBLE_CITIES.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => handleCitySelect(city)}
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                      >
                        {capitalizeCity(city)}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-right text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                    <Link
                      href="/cities"
                      onClick={() => setIsCitiesOpen(false)}
                      className="transition hover:text-gray-900 dark:hover:text-gray-200"
                    >
                      View all cities
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                ref={categoryButtonRef}
                type="button"
                onClick={() => {
                  setIsCategoriesOpen((prev) => !prev);
                  setIsCitiesOpen(false);
                }}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
                aria-haspopup="true"
                aria-expanded={isCategoriesOpen}
              >
                Categories
              </button>
              {isCategoriesOpen && (
                <div
                  ref={categoryMenuRef}
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="py-1">
                    {CATEGORY_ITEMS.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleCategorySelect(category)}
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                      >
                        {capitalizeCategory(category)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleFiltersClick}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
            >
              Filters
            </button>

            <button
              type="button"
              onClick={handleStartTrip}
              className="ml-1 rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              Start a Trip
            </button>

            <div className="flex items-center gap-3">
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
                  className="flex items-center gap-2 hover:opacity-80 transition-all duration-200 ease-out p-2 -m-2 touch-manipulation focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 rounded-full shrink-0"
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
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-black transition-colors font-normal py-3 px-2 -m-2 touch-manipulation focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 rounded-lg shrink-0"
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
          </div>
        </nav>
      </div>


      {/* No full nav bar; all navigation via burger menu */}

      {/* Burger Menu Dropdown (all breakpoints) */}
      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Dropdown popover with elevated shadow and subtle ring */}
          <div
            className="fixed z-50 w-72 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden origin-top-right animate-in fade-in slide-in-from-top-2 duration-150"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
            }}
            role="menu"
            aria-label="Main menu"
          >
            {/* Arrow/caret */}
            <div className="absolute -top-2 right-6 h-4 w-4 rotate-45 bg-white dark:bg-gray-900 border-t border-l border-gray-200 dark:border-gray-800" aria-hidden="true" />
            <div className="py-2">
              <Link
                href="/cities"
                onClick={() => setIsMenuOpen(false)}
                className="block w-full text-left px-5 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ease-out"
                role="menuitem"
              >
                Cities
              </Link>
              <Link
                href="/map"
                onClick={() => setIsMenuOpen(false)}
                className="block w-full text-left px-5 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ease-out"
                role="menuitem"
              >
                Map
              </Link>
              <Link
                href="/discover"
                onClick={() => setIsMenuOpen(false)}
                className="block w-full text-left px-5 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ease-out"
                role="menuitem"
              >
                Discover Collections
              </Link>
              <Link
                href="/collections"
                onClick={() => setIsMenuOpen(false)}
                className="block w-full text-left px-5 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ease-out"
                role="menuitem"
              >
                Collections
              </Link>
              <div className="my-2 border-t border-gray-200 dark:border-gray-800" role="separator" />
              {user ? (
                <>
                  <Link
                    href="/trips"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ease-out"
                    role="menuitem"
                  >
                    Trips
                  </Link>
                  <Link
                    href="/trips?new=1"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-left px-5 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ease-out"
                    role="menuitem"
                  >
                    Start a Trip
                  </Link>
                  <Link
                    href="/saved"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ease-out"
                    role="menuitem"
                  >
                    Saved
                  </Link>
                  <Link
                    href="/recent"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ease-out"
                    role="menuitem"
                  >
                    Recent
                  </Link>
                  <Link
                    href="/lists"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ease-out"
                    role="menuitem"
                  >
                    Lists
                  </Link>
                  <Link
                    href="/itinerary"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ease-out"
                    role="menuitem"
                  >
                    Itinerary
                  </Link>
                  <Link
                    href="/chat"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ease-out"
                    role="menuitem"
                  >
                    Chat
                  </Link>
                  <div className="my-2 border-t border-gray-200 dark:border-gray-800" role="separator" />
                  <Link
                    href="/account"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ease-out"
                    role="menuitem"
                  >
                    Account
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full text-left px-5 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-all duration-200 ease-out"
                      role="menuitem"
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={async () => { await signOut(); setIsMenuOpen(false); navigate('/'); }}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ease-out"
                    role="menuitem"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/trips?new=1"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-left px-5 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ease-out"
                    role="menuitem"
                  >
                    Start a Trip
                  </Link>
                  <Link
                    href="/auth/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ease-out"
                    role="menuitem"
                  >
                    Sign In
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
