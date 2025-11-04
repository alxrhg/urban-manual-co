'use client';

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, Moon, Sun } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [buildVersion, setBuildVersion] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const isHome = pathname === '/';

  // Fetch user profile and avatar
  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) {
        setAvatarUrl(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('avatar_url')
          .eq('user_id', user.id)
          .single();

        if (!error && data?.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
      } catch {
        // Ignore errors (table might not exist)
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

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      const dark = stored === 'true';
      setIsDark(dark);
      if (dark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('darkMode', String(newDark));
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navigate = (path: string) => {
    router.push(path);
    setIsMenuOpen(false);
  };

  return (
    <header className="mt-5">
      {/* Top Bar */}
      <div className="px-6 md:px-10 pb-4">
        <div className={`max-w-[1920px] mx-auto relative`}>
          {/* Logo - Top Left */}
          <div className={`absolute left-0 top-1/2 -translate-y-1/2`}>
            <button
              onClick={() => navigate("/")}
              className="font-medium text-sm hover:opacity-70 transition-opacity"
            >
              Urban Manual®
            </button>
          </div>
          {/* Profile picture / Menu dropdown on right */}
          <div className={`absolute right-0 top-1/2 -translate-y-1/2`}>
            <div className="flex items-center gap-4">
              {isAdmin && buildVersion && (
                <span className="text-[10px] text-gray-400 dark:text-gray-600 font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded" title="Build version">
                  {buildVersion}
                </span>
              )}
              {user ? (
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity p-2 -m-2 touch-manipulation"
                  aria-label="Toggle menu"
                >
                  {avatarUrl ? (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                      <Image
                        src={avatarUrl}
                        alt={user.email || 'Profile'}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400">
                      {user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <svg className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors font-normal py-3 px-2 -m-2 touch-manipulation"
                  aria-label="Toggle menu"
                >
                  Menu
                  <svg className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* No full nav bar; all navigation via burger menu */}

      {/* Burger Menu Dropdown (all breakpoints) */}
      {isMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsMenuOpen(false)} />
          {/* Dropdown popover with elevated shadow and subtle ring */}
          <div
            className="fixed right-4 top-16 z-50 w-72 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-black/5 overflow-hidden origin-top-right animate-in fade-in slide-in-from-top-2 duration-150"
            role="menu"
            aria-label="Main menu"
          >
            {/* Arrow/caret */}
            <div className="absolute -top-2 right-6 h-4 w-4 rotate-45 bg-white dark:bg-gray-900 border-t border-l border-gray-200 dark:border-gray-800" />
            <div className="py-2">
              <button onClick={() => { navigate('/cities'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation">Cities</button>
              <button onClick={() => { navigate('/map'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation">Map</button>
              <div className="my-2 border-t border-gray-200 dark:border-gray-800" />
              {user ? (
                <>
                  <button onClick={() => { navigate('/account'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation">Account</button>
                  {isAdmin && (
                    <>
                      <button onClick={() => { navigate('/admin'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 font-medium touch-manipulation">Admin Tools</button>
                      <button onClick={() => { navigate('/admin/analytics'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 pl-8 touch-manipulation">Analytics</button>
                    </>
                  )}
                  <button onClick={async () => { await signOut(); setIsMenuOpen(false); navigate('/'); }} className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation">Sign Out</button>
                </>
              ) : (
                <button onClick={() => { navigate('/auth/login'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation">Sign In</button>
              )}
              <div className="my-2 border-t border-gray-200 dark:border-gray-800" />
              <button
                onClick={toggleDarkMode}
                className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation flex items-center gap-2"
              >
                {isDark ? (
                  <>
                    <Sun className="h-4 w-4" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
