'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Building2,
  Utensils,
  Hotel,
  Wine,
  Coffee,
  Search,
  Home,
  Map,
  Plane,
  Heart,
  User,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from 'next-themes';
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
import { useAuth } from '@/contexts/AuthContext';

// Popular cities for quick navigation
const POPULAR_CITIES = [
  { name: 'Tokyo', slug: 'tokyo', country: 'Japan' },
  { name: 'London', slug: 'london', country: 'UK' },
  { name: 'Paris', slug: 'paris', country: 'France' },
  { name: 'New York', slug: 'new-york', country: 'USA' },
  { name: 'Copenhagen', slug: 'copenhagen', country: 'Denmark' },
  { name: 'Barcelona', slug: 'barcelona', country: 'Spain' },
];

// Categories for quick filtering
const CATEGORIES = [
  { name: 'Restaurants', slug: 'restaurants', icon: Utensils },
  { name: 'Hotels', slug: 'hotels', icon: Hotel },
  { name: 'Bars', slug: 'bars', icon: Wine },
  { name: 'Cafes', slug: 'cafes', icon: Coffee },
  { name: 'Architecture', slug: 'architecture', icon: Building2 },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  // Keyboard shortcut to open command palette
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search for destinations when query changes
  React.useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(searchQuery)}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          // Use the destinations from the suggest endpoint
          setSearchResults(data.suggestions?.destinations || []);
        }
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

  return (
    <>
      {/* Search trigger button - mobile: icon only, desktop: full button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 p-2 md:px-3 md:py-1.5 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search...</span>
        <kbd className="hidden md:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-1.5 font-mono text-[10px] font-medium text-gray-400 dark:text-gray-500">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search destinations, cities, or type a command..."
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
                  value={`${result.name} ${result.city || ''} ${result.category || ''}`}
                  onSelect={() => runCommand(() => router.push(`/destination/${result.slug}`))}
                >
                  <MapPin className="mr-2 h-4 w-4 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{result.name}</span>
                    {(result.city || result.category) && (
                      <span className="text-gray-400 dark:text-gray-500 text-xs truncate">
                        {[result.city, result.country].filter(Boolean).join(', ')}
                        {result.category && ` · ${result.category}`}
                      </span>
                    )}
                  </div>
                  {result.michelin_stars && result.michelin_stars > 0 && (
                    <span className="ml-auto text-xs text-amber-500 shrink-0">{'★'.repeat(result.michelin_stars)}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Quick Navigation */}
          {searchQuery.length < 2 && (
            <>
              <CommandGroup heading="Quick Navigation">
                <CommandItem onSelect={() => runCommand(() => router.push('/'))}>
                  <Home className="mr-2 h-4 w-4" />
                  <span>Home</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push('/cities'))}>
                  <Map className="mr-2 h-4 w-4" />
                  <span>Explore Cities</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push('/map'))}>
                  <MapPin className="mr-2 h-4 w-4" />
                  <span>Map View</span>
                </CommandItem>
                {user && (
                  <>
                    <CommandItem onSelect={() => runCommand(() => router.push('/trips'))}>
                      <Plane className="mr-2 h-4 w-4" />
                      <span>My Trips</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push('/saved'))}>
                      <Heart className="mr-2 h-4 w-4" />
                      <span>Saved Places</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push('/account'))}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Account</span>
                    </CommandItem>
                  </>
                )}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Popular Cities">
                {POPULAR_CITIES.map((city) => (
                  <CommandItem
                    key={city.slug}
                    onSelect={() => runCommand(() => router.push(`/city/${city.slug}`))}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>{city.name}</span>
                    <span className="ml-2 text-gray-400 dark:text-gray-500 text-xs">{city.country}</span>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Categories">
                {CATEGORIES.map((category) => (
                  <CommandItem
                    key={category.slug}
                    onSelect={() => runCommand(() => router.push(`/?category=${category.slug}`))}
                  >
                    <category.icon className="mr-2 h-4 w-4" />
                    <span>{category.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Settings">
                <CommandItem
                  onSelect={() => runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
                >
                  {theme === 'dark' ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4" />
                  )}
                  <span>Toggle Theme</span>
                  <CommandShortcut>⌘T</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
