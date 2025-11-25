'use client';

import { memo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Bookmark, Map, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  action?: 'drawer';
  drawerType?: 'account' | 'login';
  requiresAuth?: boolean;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'search', label: 'Search', icon: Search, path: '/search' },
  { id: 'saved', label: 'Saved', icon: Bookmark, path: '/saved', requiresAuth: true },
  { id: 'trips', label: 'Trips', icon: Map, path: '/trips', requiresAuth: true },
  { id: 'account', label: 'Account', icon: User, action: 'drawer', drawerType: 'account' },
];

/**
 * Bottom navigation bar for mobile devices
 * Provides quick access to key features from anywhere
 */
export const BottomNav = memo(function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { openDrawer } = useDrawer();

  const handleNavClick = (item: NavItem) => {
    if (item.action === 'drawer') {
      const drawerType = user ? item.drawerType : 'login';
      openDrawer(drawerType || 'account');
      return;
    }

    if (item.requiresAuth && !user) {
      openDrawer('login');
      return;
    }

    if (item.path) {
      router.push(item.path);
    }
  };

  const isActive = (item: NavItem) => {
    if (!item.path) return false;
    if (item.path === '/') return pathname === '/';
    return pathname.startsWith(item.path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-inset-bottom"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={`
                flex flex-col items-center justify-center
                w-full h-full
                transition-colors duration-200
                ${active
                  ? 'text-black dark:text-white'
                  : 'text-gray-500 dark:text-gray-400'
                }
              `}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={`
                  w-5 h-5
                  transition-transform duration-200
                  ${active ? 'scale-110' : ''}
                `}
              />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});
