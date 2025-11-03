'use client';

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { ProvenanceRibbon } from "./ProvenanceRibbon";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [buildVersion, setBuildVersion] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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

  const navigate = (path: string) => {
    router.push(path);
    setIsMenuOpen(false);
  };

  const userInitial = user?.email?.[0]?.toUpperCase() || 'U';
  const menuIcon = isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />;

  return (
    <header className="px-6 md:px-10 pt-8 pb-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-3">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 text-xs tracking-[0.24em] uppercase text-gray-500 hover:text-gray-800 transition-colors"
              aria-label="Return to catalogue"
            >
              <span className="compass-indicator" aria-hidden />
              Catalogue
            </button>
            <div>
              <button
                onClick={() => navigate("/")}
                className="text-3xl md:text-4xl font-serif tracking-tight hover:opacity-85 transition-opacity"
              >
                Urban Manual
              </button>
              <p className="mt-1 text-sm text-gray-600 max-w-md">
                A living atlas of taste — considered, quiet, and editorially verified for the modern traveler.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <ProvenanceRibbon />
            <div className="flex items-center gap-3">
              {isAdmin && buildVersion && (
                <span
                  className="text-[10px] tracking-[0.18em] uppercase text-gray-400 bg-gray-100 px-2 py-1 rounded-full"
                  title="Build version"
                >
                  {buildVersion}
                </span>
              )}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-3 rounded-full bg-white/60 backdrop-blur px-3 py-2 shadow-sm border border-gray-200 hover:border-gray-300 transition-all"
                aria-label="Toggle menu"
              >
                {user ? (
                  <>
                    {avatarUrl ? (
                      <div className="relative w-9 h-9 rounded-full overflow-hidden border border-gray-200">
                        <Image src={avatarUrl} alt={user.email || 'Profile'} fill sizes="36px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold">
                        {userInitial}
                      </div>
                    )}
                    <span className="text-sm text-gray-700 hidden sm:inline">{user.email}</span>
                  </>
                ) : (
                  <span className="text-sm font-medium tracking-[0.14em] uppercase text-gray-700">Menu</span>
                )}
                {menuIcon}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* No full nav bar; all navigation via burger menu */}

      {/* Burger Menu Dropdown (all breakpoints) */}
      {isMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsMenuOpen(false)} />
          <div className="fixed right-4 top-16 z-50 w-64 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
            <div className="py-2">
              <button onClick={() => { navigate('/cities'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">Cities</button>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Categories</div>
              <button onClick={() => { navigate('/category/hotels'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 pl-8">Hotels</button>
              <button onClick={() => { navigate('/category/restaurants'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 pl-8">Restaurants</button>
              <button onClick={() => { navigate('/category/cafes'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 pl-8">Cafes</button>
              <button onClick={() => { navigate('/category/bars'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 pl-8">Bars</button>
              <button onClick={() => { navigate('/map'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">Map</button>
              <button onClick={() => { navigate('/explore'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">Explore</button>
              <button onClick={() => { navigate('/feed'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">Feed</button>
              <div className="my-2 border-t border-gray-200 dark:border-gray-800" />
              {user ? (
                <>
                  <button onClick={() => { navigate('/account'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">Account</button>
                  {isAdmin && (
                    <>
                      <button onClick={() => { navigate('/admin'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 font-medium">Admin Tools</button>
                      <button onClick={() => { navigate('/admin/analytics'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 pl-8">Analytics</button>
                    </>
                  )}
                  <button onClick={async () => { await signOut(); setIsMenuOpen(false); navigate('/'); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">Sign Out</button>
                </>
              ) : (
                <button onClick={() => { navigate('/auth/login'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">Sign In</button>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
