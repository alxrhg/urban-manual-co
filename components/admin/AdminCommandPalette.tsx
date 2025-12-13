'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Building2,
  BarChart3,
  Search as SearchIcon,
  Sparkles,
  RefreshCw,
  Plus,
  Settings,
  Users,
  LayoutDashboard,
  FileText,
  Image as ImageIcon,
  Database,
  Globe,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { supabase } from '@/lib/supabase';

interface AdminCommandPaletteProps {
  onCreateDestination?: () => void;
}

// Admin navigation routes
const ADMIN_ROUTES = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, description: 'Overview and stats' },
  { name: 'Destinations', href: '/admin/destinations', icon: MapPin, description: 'Manage destinations' },
  { name: 'Cities', href: '/admin/cities', icon: Building2, description: 'Manage cities' },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, description: 'View analytics' },
  { name: 'Searches', href: '/admin/searches', icon: SearchIcon, description: 'Search logs' },
  { name: 'Enrich', href: '/admin/enrich', icon: Sparkles, description: 'Google Places enrichment' },
  { name: 'Reindex', href: '/admin/reindex', icon: RefreshCw, description: 'Reindex search' },
  { name: 'Users', href: '/admin/users', icon: Users, description: 'User management' },
  { name: 'Media', href: '/admin/media', icon: ImageIcon, description: 'Media library' },
  { name: 'Settings', href: '/admin/settings', icon: Settings, description: 'Admin settings' },
];

// Quick actions
const QUICK_ACTIONS = [
  { name: 'Create New Destination', action: 'create-destination', icon: Plus, shortcut: '⌘N' },
  { name: 'Export Destinations CSV', action: 'export-csv', icon: FileText },
  { name: 'Refresh Data', action: 'refresh', icon: RefreshCw },
  { name: 'Database Console', action: 'database', icon: Database, external: true },
];

export function AdminCommandPalette({ onCreateDestination }: AdminCommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const router = useRouter();

  // Keyboard shortcut to open command palette
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K to open
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      // ⌘N or Ctrl+N to create new destination
      if (e.key === 'n' && (e.metaKey || e.ctrlKey) && !open) {
        e.preventDefault();
        onCreateDestination?.();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onCreateDestination]);

  // Search for destinations when query changes
  React.useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await supabase
          .from('destinations')
          .select('slug, name, city, category')
          .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`)
          .limit(8);

        setSearchResults(data || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const handleAction = (action: string) => {
    switch (action) {
      case 'create-destination':
        onCreateDestination?.();
        break;
      case 'export-csv':
        window.location.href = '/api/admin/export-destinations?format=csv';
        break;
      case 'refresh':
        window.location.reload();
        break;
      case 'database':
        window.open('https://app.supabase.com', '_blank');
        break;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search destinations, navigate, or run commands..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? 'Searching...' : 'No results found.'}
        </CommandEmpty>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <CommandGroup heading="Destinations">
            {searchResults.map((result) => (
              <CommandItem
                key={result.slug}
                value={`${result.name} ${result.city || ''}`}
                onSelect={() =>
                  runCommand(() => router.push(`/admin/destinations?slug=${result.slug}`))
                }
              >
                <MapPin className="mr-2 h-4 w-4 shrink-0 text-gray-400" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{result.name}</span>
                  <span className="text-gray-400 text-xs truncate">
                    {result.city} · {result.category}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Navigation */}
        {searchQuery.length < 2 && (
          <>
            <CommandGroup heading="Quick Actions">
              {QUICK_ACTIONS.map((action) => (
                <CommandItem
                  key={action.action}
                  onSelect={() => runCommand(() => handleAction(action.action))}
                >
                  <action.icon className="mr-2 h-4 w-4 text-gray-400" />
                  <span>{action.name}</span>
                  {action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Navigation">
              {ADMIN_ROUTES.map((route) => (
                <CommandItem
                  key={route.href}
                  onSelect={() => runCommand(() => router.push(route.href))}
                >
                  <route.icon className="mr-2 h-4 w-4 text-gray-400" />
                  <div className="flex flex-col">
                    <span>{route.name}</span>
                    <span className="text-gray-400 text-xs">{route.description}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="External">
              <CommandItem
                onSelect={() =>
                  runCommand(() => window.open('https://www.urbanmanual.co', '_blank'))
                }
              >
                <Globe className="mr-2 h-4 w-4 text-gray-400" />
                <span>View Live Site</span>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() => window.open('https://app.supabase.com', '_blank'))
                }
              >
                <Database className="mr-2 h-4 w-4 text-gray-400" />
                <span>Supabase Dashboard</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

// Button to trigger command palette
export function CommandPaletteButton() {
  return (
    <button
      onClick={() => {
        const event = new KeyboardEvent('keydown', {
          key: 'k',
          metaKey: true,
          bubbles: true,
        });
        document.dispatchEvent(event);
      }}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      <SearchIcon className="h-4 w-4" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="hidden sm:inline-flex ml-2 h-5 items-center gap-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-1.5 font-mono text-[10px] font-medium text-gray-400">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
