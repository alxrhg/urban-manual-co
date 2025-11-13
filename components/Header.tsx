'use client';

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Menu, X, User } from "lucide-react";
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
  const [mounted, setMounted] = useState(false);
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

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);


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
            className="font-medium text-sm hover:opacity-70 transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 rounded-lg py-2 shrink-0"
            aria-label="Go to homepage"
          >
            Urban Manual®
          </button>
          
          {/* Right side: Account/Sign In button + Menu dropdown */}
          <div className="flex items-center gap-3 shrink-0">
            {isAdmin && buildVersion && (
              <span
                className="text-[10px] text-gray-400 font-mono px-1.5 py-0.5 bg-gray-100 rounded"
                title="Build version"
                aria-label={`Build version ${buildVersion}`}
              >
                {buildVersion}
              </span>
            )}
            
            {/* Separate Account/Sign In button */}
            {user ? (
              <button
                onClick={() => navigate('/account')}
                className="flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 transition-opacity touch-manipulation focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                aria-label="Go to account"
              >
                <User className="w-4 h-4" />
                <span>Account</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/auth/login')}
                className="flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 transition-opacity touch-manipulation focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                aria-label="Sign in"
              >
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}

            {/* Menu dropdown button */}
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
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors font-normal py-2 px-2 touch-manipulation focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 rounded-lg shrink-0"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
            >
              <Menu className="w-5 h-5" />
            </button>
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
              <button
                onClick={() => { navigate('/cities'); setIsMenuOpen(false); }}
                className="block w-full text-left px-5 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:rounded-lg transition-all duration-200 ease-out touch-manipulation focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 focus:rounded-lg"
                role="menuitem"
              >
                Cities
              </button>
              <button
                onClick={() => { navigate('/map'); setIsMenuOpen(false); }}
                className="block w-full text-left px-5 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:rounded-lg transition-all duration-200 ease-out touch-manipulation focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 focus:rounded-lg"
                role="menuitem"
              >
                Map
              </button>
              <button
                onClick={() => { navigate('/discover'); setIsMenuOpen(false); }}
                className="block w-full text-left px-5 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:rounded-lg transition-all duration-200 ease-out touch-manipulation focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 focus:rounded-lg"
                role="menuitem"
              >
                Discover Collections
              </button>
              <button
                onClick={() => { navigate('/collections'); setIsMenuOpen(false); }}
                className="block w-full text-left px-5 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:rounded-lg transition-all duration-200 ease-out touch-manipulation focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 focus:rounded-lg"
                role="menuitem"
              >
                Collections
              </button>
              <div className="my-2 border-t border-gray-200 dark:border-gray-800" role="separator" />
              {user ? (
                <>
                  <button
                    onClick={() => { navigate('/trips'); setIsMenuOpen(false); }}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:rounded-lg transition-all duration-200 ease-out touch-manipulation focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 focus:rounded-lg"
                    role="menuitem"
                  >
                    Trips
                  </button>
                  <button
                    onClick={() => { navigate('/saved'); setIsMenuOpen(false); }}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:rounded-lg transition-all duration-200 ease-out touch-manipulation focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 focus:rounded-lg"
                    role="menuitem"
                  >
                    Saved
                  </button>
                  <button
                    onClick={() => { navigate('/recent'); setIsMenuOpen(false); }}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:rounded-lg transition-all duration-200 ease-out touch-manipulation focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 focus:rounded-lg"
                    role="menuitem"
                  >
                    Recent
                  </button>
                  <button
                    onClick={() => { navigate('/lists'); setIsMenuOpen(false); }}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:rounded-lg transition-all duration-200 ease-out touch-manipulation focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 focus:rounded-lg"
                    role="menuitem"
                  >
                    Lists
                  </button>
                  <button
                    onClick={() => { navigate('/itinerary'); setIsMenuOpen(false); }}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:rounded-lg transition-all duration-200 ease-out touch-manipulation focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 focus:rounded-lg"
                    role="menuitem"
                  >
                    Itinerary
                  </button>
                  <button
                    onClick={() => { navigate('/chat'); setIsMenuOpen(false); }}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:rounded-lg transition-all duration-200 ease-out touch-manipulation focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 focus:rounded-lg"
                    role="menuitem"
                  >
                    Chat
                  </button>
                  <div className="my-2 border-t border-gray-200 dark:border-gray-800" role="separator" />
                  <button
                    onClick={() => { navigate('/account'); setIsMenuOpen(false); }}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:rounded-lg transition-all duration-200 ease-out touch-manipulation focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 focus:rounded-lg"
                    role="menuitem"
                  >
                    Account
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => { navigate('/admin'); setIsMenuOpen(false); }}
                      className="block w-full text-left px-5 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:rounded-lg font-medium transition-all duration-200 ease-out touch-manipulation focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 focus:rounded-lg"
                      role="menuitem"
                    >
                      Admin
                    </button>
                  )}
                  <button
                    onClick={async () => { await signOut(); setIsMenuOpen(false); navigate('/'); }}
                    className="block w-full text-left px-5 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:rounded-lg transition-all duration-200 ease-out touch-manipulation focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 focus:rounded-lg"
                    role="menuitem"
                  >
                    Sign Out
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
