'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MapPin,
  BarChart3,
  Search,
  Compass,
  Sparkles,
  Database,
  Users,
  Image,
  FileText,
  Settings,
  ChevronDown,
  LogOut,
  Globe,
  TrendingUp,
  Activity,
  Layers,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  children?: NavItem[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Content Management',
    items: [
      { href: '/admin/destinations', label: 'Destinations', icon: <MapPin className="w-4 h-4" />, badge: '897' },
      { href: '/admin/content', label: 'CMS', icon: <FileText className="w-4 h-4" /> },
      { href: '/admin/media', label: 'Media Library', icon: <Image className="w-4 h-4" /> },
      { href: '/admin/categories', label: 'Categories', icon: <Layers className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { href: '/admin/analytics', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
      { href: '/admin/searches', label: 'Search Insights', icon: <Search className="w-4 h-4" /> },
      { href: '/admin/performance', label: 'Performance', icon: <TrendingUp className="w-4 h-4" /> },
      { href: '/admin/realtime', label: 'Real-time', icon: <Activity className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Discovery',
    items: [
      { href: '/admin/discover', label: 'Recommendations', icon: <Compass className="w-4 h-4" /> },
      { href: '/admin/enrich', label: 'Enrichment', icon: <Sparkles className="w-4 h-4" /> },
      { href: '/admin/reindex', label: 'Vector Index', icon: <Database className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Management',
    items: [
      { href: '/admin/users', label: 'Users', icon: <Users className="w-4 h-4" /> },
      { href: '/admin/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') {
    return pathname === '/admin';
  }
  return pathname.startsWith(href);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    NAV_GROUPS.map(g => g.title)
  );

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-white text-sm">Urban Manual</span>
            <span className="block text-[10px] uppercase tracking-wider text-gray-500">Admin Console</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV_GROUPS.map((group) => {
          const isExpanded = expandedGroups.includes(group.title);
          return (
            <div key={group.title} className="mb-4">
              <button
                onClick={() => toggleGroup(group.title)}
                className="flex items-center justify-between w-full px-3 py-2 text-[11px] uppercase tracking-wider text-gray-500 hover:text-gray-400 transition-colors"
              >
                {group.title}
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                />
              </button>
              {isExpanded && (
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(pathname || '', item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`
                          flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                          ${active
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <span className={active ? 'text-indigo-400' : 'text-gray-500'}>
                            {item.icon}
                          </span>
                          {item.label}
                        </div>
                        {item.badge && (
                          <span className={`
                            text-[10px] font-semibold px-1.5 py-0.5 rounded
                            ${active ? 'bg-indigo-500/20 text-indigo-300' : 'bg-gray-800 text-gray-500'}
                          `}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                Administrator
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
